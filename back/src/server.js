const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

// Validação de variáveis críticas ao iniciar
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('\n❌ CRÍTICO: JWT_SECRET não definido ou fraco (mínimo 32 caracteres)!');
    console.error('   Gere um segredo forte: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
    if (process.env.NODE_ENV === 'production') process.exit(1);
}

const { analyzeTasks, chatWithAI, parseTaskFromMessage, generateCompletionReport } = require('./services/aiService');
const { createNextRecurrence } = require('./services/taskService');
const { sendNotification, buildCompletionMessage } = require('./services/notificationService');
const { startCronJobs } = require('./services/cronService');
const { requireAuth } = require('./middleware/auth');
const { generateToken, hashPassword, comparePassword, generateResetToken, sendResetEmail, sendConfirmationEmail } = require('./services/authService');

const app = express();
const prisma = new PrismaClient();

const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true, // necessário para cookies HttpOnly
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(cookieParser());
app.set('trust proxy', 1); // necessário para rate-limit funcionar atrás de proxy (Railway/Render)
app.use(express.json({ limit: '1mb' })); // limita payload para evitar DoS

// Rate limiter para rotas de auth
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 20, // máximo 20 tentativas por IP
    message: { error: 'Muitas tentativas. Aguarde 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter para rotas de IA (custoso)
const aiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 10,
    message: { error: 'Limite de requisições IA atingido. Aguarde um momento.' },
});

// Headers de segurança HTTP
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// ─── AUTH (rotas públicas — ANTES do middleware) ──────────────────────────────

app.get('/ping', (req, res) => res.json({ message: 'API online 🚀' }));

app.post('/auth/register', authLimiter, async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) return res.status(400).json({ error: 'Preencha todos os campos' });
        if (password.length < 8) return res.status(400).json({ error: 'Senha deve ter pelo menos 8 caracteres' });

        const exists = await prisma.user.findUnique({ where: { email } });
        if (exists) return res.status(400).json({ error: 'Email já cadastrado' });

        const passwordHash = await hashPassword(password);
        const emailVerifyToken = generateResetToken();

        await prisma.user.create({
            data: { name, email, passwordHash, emailVerifyToken, emailVerified: false }
        });

        sendConfirmationEmail(email, emailVerifyToken, name).catch(console.error);

        res.json({ message: 'Conta criada! Verifique seu email para ativar.' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Erro ao criar conta' });
    }
});

app.post('/auth/login', authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Preencha todos os campos' });

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(400).json({ error: 'Email ou senha incorretos' });

        const valid = await comparePassword(password, user.passwordHash);
        if (!valid) return res.status(400).json({ error: 'Email ou senha incorretos' });

        if (!user.emailVerified) {
            return res.status(403).json({ error: 'Confirme seu email antes de entrar. Verifique sua caixa de entrada.' });
        }

        const token = generateToken(user.id);

        // Token em cookie HttpOnly — não acessível via JavaScript (proteção XSS)
        res.cookie('agenda_token', token, {
            httpOnly: true,
            secure: true, // sempre true (Railway usa HTTPS)
            sameSite: 'none', // necessário para cross-domain (Vercel → Railway)
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
        });

        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Erro ao fazer login' });
    }
});

app.post('/auth/forgot-password', authLimiter, async (req, res) => {
    try {
        const { email } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.json({ message: 'Se este email existir, você receberá as instruções.' });

        const resetToken = generateResetToken();
        const expiry = new Date(Date.now() + 3600000);

        await prisma.user.update({
            where: { id: user.id },
            data: { resetToken, resetTokenExpiry: expiry }
        });

        await sendResetEmail(user.email, resetToken, user.name);
        res.json({ message: 'Se este email existir, você receberá as instruções.' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Erro ao enviar email' });
    }
});

app.post('/auth/reset-password', authLimiter, async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) return res.status(400).json({ error: 'Dados inválidos' });
        if (password.length < 8) return res.status(400).json({ error: 'Senha deve ter pelo menos 8 caracteres' });

        const user = await prisma.user.findFirst({
            where: { resetToken: token, resetTokenExpiry: { gt: new Date() } }
        });
        if (!user) return res.status(400).json({ error: 'Token inválido ou expirado' });

        const passwordHash = await hashPassword(password);
        await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash, resetToken: null, resetTokenExpiry: null }
        });

        res.json({ message: 'Senha redefinida com sucesso!' });
    } catch (e) {
        res.status(500).json({ error: 'Erro ao redefinir senha' });
    }
});

app.get('/auth/confirm-email', async (req, res) => {
    try {
        const { token } = req.query;
        const user = await prisma.user.findFirst({ where: { emailVerifyToken: token } });
        if (!user) return res.status(400).json({ error: 'Token inválido' });

        await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: true, emailVerifyToken: null }
        });

        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/?emailConfirmed=true`);
    } catch (e) {
        res.status(500).json({ error: 'Erro ao confirmar email' });
    }
});

// ─── LOGOUT ──────────────────────────────────────────────────────────────────

app.post('/auth/logout', (req, res) => {
    res.clearCookie('agenda_token', {
        httpOnly: true,
        secure: true,
        sameSite: 'none'
    });
    res.json({ message: 'Logout realizado.' });
});

// ─── MIDDLEWARE DE AUTH (aplicado a partir daqui) ─────────────────────────────

app.use(requireAuth);

// ─── AUTH ME ─────────────────────────────────────────────────────────────────

app.get('/auth/me', async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            select: { id: true, name: true, email: true, createdAt: true }
        });
        if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });
        res.json({ user });
    } catch (e) { res.status(500).json({ error: 'Erro ao buscar usuário' }); }
});

// ─── TASKS ───────────────────────────────────────────────────────────────────

app.get('/tasks', async (req, res) => {
    try {
        const { search = '', status, sortBy = 'dueDate', sortOrder = 'asc' } = req.query;
        const where = { userId: req.userId };
        if (search) where.title = { contains: search, mode: 'insensitive' };
        if (status === 'pending') where.completedAt = null;
        if (status === 'completed') where.completedAt = { not: null };

        const validSort = ['dueDate', 'createdAt', 'title'];
        const orderField = validSort.includes(sortBy) ? sortBy : 'dueDate';

        const tasks = await prisma.task.findMany({
            where,
            orderBy: { [orderField]: sortOrder },
            include: { group: true, subtasks: { orderBy: { order: 'asc' } } },
        });

        res.json(tasks);
    } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ao buscar tarefas' }); }
});

app.post('/tasks', async (req, res) => {
    try {
        const { title, description, dueDate, groupId, subtasks = [], recurrence } = req.body;
        const newTask = await prisma.task.create({
            data: {
                userId: req.userId,
                title, description,
                dueDate: new Date(dueDate),
                groupId: groupId === '' ? null : groupId || null,
                recurrence: recurrence || null,
                subtasks: { create: subtasks.map((s, i) => ({ title: s.title, order: i })) }
            },
            include: { group: true, subtasks: true }
        });
        res.json(newTask);
    } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ao criar tarefa' }); }
});

app.put('/tasks/:id', async (req, res) => {
    try {
        const { title, description, dueDate, groupId, recurrence } = req.body;
        const task = await prisma.task.findFirst({ where: { id: req.params.id, userId: req.userId } });
        if (!task) return res.status(404).json({ error: 'Não encontrada' });

        const updated = await prisma.task.update({
            where: { id: req.params.id },
            data: {
                title, description,
                dueDate: dueDate ? new Date(dueDate) : undefined,
                groupId: groupId === '' ? null : groupId || undefined,
                recurrence: recurrence || null
            },
            include: { group: true, subtasks: true }
        });
        res.json(updated);
    } catch (e) { res.status(500).json({ error: 'Erro ao editar tarefa' }); }
});

app.delete('/tasks/:id', async (req, res) => {
    try {
        const task = await prisma.task.findFirst({ where: { id: req.params.id, userId: req.userId } });
        if (!task) return res.status(404).json({ error: 'Não encontrada' });
        await prisma.subtask.deleteMany({ where: { taskId: req.params.id } });
        await prisma.task.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Erro ao deletar tarefa' }); }
});

app.patch('/tasks/:id/complete', async (req, res) => {
    try {
        const { completedAt, notes } = req.body;
        const task = await prisma.task.findFirst({ where: { id: req.params.id, userId: req.userId } });
        if (!task) return res.status(404).json({ error: 'Não encontrada' });

        const updated = await prisma.task.update({
            where: { id: req.params.id },
            data: { completedAt: completedAt ? new Date(completedAt) : new Date(), notes: notes || null },
            include: { group: true, subtasks: true }
        });

        if (task.recurrence) await createNextRecurrence(prisma, task);

        prisma.userSettings.findFirst({ where: { userId: req.userId } }).then(settings => {
            if (settings?.notifyOnComplete) {
                sendNotification(settings, buildCompletionMessage(updated)).catch(console.error);
            }
        });

        res.json(updated);
    } catch (e) { res.status(500).json({ error: 'Erro ao concluir tarefa' }); }
});

app.post('/tasks/analyze', aiLimiter, async (req, res) => {
    try {
        const pendingTasks = await prisma.task.findMany({
            where: { userId: req.userId, aiPriority: null, completedAt: null },
            select: { id: true, title: true, description: true, dueDate: true }
        });
        if (pendingTasks.length === 0) return res.json({ message: 'Nada para analisar!', updatedCount: 0 });

        const aiResults = await analyzeTasks(pendingTasks);
        await Promise.all(aiResults.map(r => prisma.task.update({
            where: { id: r.id },
            data: { aiPriority: r.aiPriority, aiSuggestion: r.aiSuggestion }
        })));
        res.json({ message: 'Analisadas!', updatedCount: aiResults.length });
    } catch (e) { res.status(500).json({ error: 'Erro na análise IA' }); }
});

app.post('/tasks/:id/analyze', async (req, res) => {
    try {
        const task = await prisma.task.findFirst({
            where: { id: req.params.id, userId: req.userId },
            select: { id: true, title: true, description: true, dueDate: true }
        });
        if (!task) return res.status(404).json({ error: 'Não encontrada' });

        const [result] = await analyzeTasks([task]);
        const updated = await prisma.task.update({
            where: { id: req.params.id },
            data: { aiPriority: result.aiPriority, aiSuggestion: result.aiSuggestion },
            include: { group: true, subtasks: true }
        });
        res.json(updated);
    } catch (e) { res.status(500).json({ error: 'Erro ao re-analisar' }); }
});

app.post('/tasks/:id/completion-report', async (req, res) => {
    try {
        const task = await prisma.task.findFirst({
            where: { id: req.params.id, userId: req.userId },
            include: { subtasks: true }
        });
        if (!task) return res.status(404).json({ error: 'Não encontrada' });
        if (!task.completedAt) return res.status(400).json({ error: 'Tarefa não concluída' });

        const report = await generateCompletionReport(task);
        const updated = await prisma.task.update({
            where: { id: req.params.id },
            data: { completionReport: report },
            include: { group: true, subtasks: true }
        });
        res.json(updated);
    } catch (e) { res.status(500).json({ error: 'Erro ao gerar relatório' }); }
});

// ─── SUBTASKS ────────────────────────────────────────────────────────────────

app.patch('/subtasks/:id/toggle', async (req, res) => {
    try {
        const sub = await prisma.subtask.findUnique({ where: { id: req.params.id }, include: { task: true } });
        if (!sub || sub.task.userId !== req.userId) return res.status(404).json({ error: 'Não encontrada' });
        const updated = await prisma.subtask.update({
            where: { id: req.params.id },
            data: { completedAt: sub.completedAt ? null : new Date() }
        });
        res.json(updated);
    } catch (e) { res.status(500).json({ error: 'Erro na subtarefa' }); }
});

app.post('/tasks/:id/subtasks', async (req, res) => {
    try {
        const task = await prisma.task.findFirst({ where: { id: req.params.id, userId: req.userId } });
        if (!task) return res.status(404).json({ error: 'Não encontrada' });
        const count = await prisma.subtask.count({ where: { taskId: req.params.id } });
        const sub = await prisma.subtask.create({
            data: { title: req.body.title, taskId: req.params.id, order: count }
        });
        res.json(sub);
    } catch (e) { res.status(500).json({ error: 'Erro ao criar subtarefa' }); }
});

app.delete('/subtasks/:id', async (req, res) => {
    try {
        const sub = await prisma.subtask.findUnique({ where: { id: req.params.id }, include: { task: true } });
        if (!sub || sub.task.userId !== req.userId) return res.status(404).json({ error: 'Não encontrada' });
        await prisma.subtask.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Erro ao deletar subtarefa' }); }
});

// ─── AI ──────────────────────────────────────────────────────────────────────

app.post('/ai/chat', aiLimiter, async (req, res) => {
    try {
        const rawMessage = req.body.message;
        const rawHistory = req.body.history || [];
        if (!rawMessage) return res.status(400).json({ error: 'Mensagem vazia.' });

        // Sanitiza entradas para evitar prompt injection excessivo
        const message = String(rawMessage).slice(0, 2000);
        const history = rawHistory.slice(0, 10).map(h => ({
            role: String(h.role || '').slice(0, 10),
            text: String(h.text || '').slice(0, 2000)
        }));
        const tasks = await prisma.task.findMany({
            where: { userId: req.userId },
            orderBy: { dueDate: 'asc' },
            include: { subtasks: true }
        });
        const aiResponse = await chatWithAI(message, tasks, history);
        res.json({ response: aiResponse });
    } catch (e) { res.status(500).json({ error: 'Erro no chat IA' }); }
});

app.post('/ai/create-task', aiLimiter, async (req, res) => {
    try {
        const parsed = await parseTaskFromMessage(req.body.message);
        if (!parsed) return res.status(400).json({ error: 'Não entendi a tarefa.' });
        const task = await prisma.task.create({
            data: {
                userId: req.userId,
                title: parsed.title,
                description: parsed.description || null,
                dueDate: new Date(parsed.dueDate)
            },
            include: { group: true, subtasks: true }
        });
        res.json({ task, message: `Tarefa "${task.title}" criada! 🎯` });
    } catch (e) { res.status(500).json({ error: 'Erro ao criar via IA' }); }
});

// ─── GROUPS ──────────────────────────────────────────────────────────────────

app.get('/groups', async (req, res) => {
    try {
        const groups = await prisma.group.findMany({
            where: { userId: req.userId },
            orderBy: { name: 'asc' },
            include: { _count: { select: { tasks: true } } }
        });
        res.json(groups);
    } catch (e) { res.status(500).json({ error: 'Erro ao buscar grupos' }); }
});

app.post('/groups', async (req, res) => {
    try {
        const VALID_COLORS = ['purple', 'blue', 'emerald', 'orange', 'pink', 'gray'];
        const color = VALID_COLORS.includes(req.body.color) ? req.body.color : 'purple';
        const group = await prisma.group.create({
            data: { userId: req.userId, name: req.body.name, color }
        });
        res.json(group);
    } catch (e) { res.status(500).json({ error: 'Erro ao criar grupo' }); }
});

app.put('/groups/:id', async (req, res) => {
    try {
        const group = await prisma.group.findFirst({ where: { id: req.params.id, userId: req.userId } });
        if (!group) return res.status(404).json({ error: 'Não encontrado' });
        const updated = await prisma.group.update({
            where: { id: req.params.id },
            data: { name: req.body.name, color: req.body.color }
        });
        res.json(updated);
    } catch (e) { res.status(500).json({ error: 'Erro ao editar grupo' }); }
});

app.delete('/groups/:id', async (req, res) => {
    try {
        const group = await prisma.group.findFirst({ where: { id: req.params.id, userId: req.userId } });
        if (!group) return res.status(404).json({ error: 'Não encontrado' });
        await prisma.task.updateMany({ where: { groupId: req.params.id }, data: { groupId: null } });
        await prisma.group.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Erro ao deletar grupo' }); }
});

// ─── SETTINGS ────────────────────────────────────────────────────────────────

app.get('/settings', async (req, res) => {
    try {
        let settings = await prisma.userSettings.findFirst({ where: { userId: req.userId } });
        if (!settings) settings = await prisma.userSettings.create({ data: { userId: req.userId } });
        res.json(settings);
    } catch (e) { res.status(500).json({ error: 'Erro ao buscar configurações' }); }
});

app.put('/settings', async (req, res) => {
    try {
        const { whatsapp, email, notifyChannel, notifyDueToday, notifyOverdue, notifyDailySummary, notifyOnComplete, dailySummaryHour, dueTodayHour, overdueHour, onboardingDone } = req.body;
        let settings = await prisma.userSettings.findFirst({ where: { userId: req.userId } });

        const data = { whatsapp, email, notifyChannel, notifyDueToday, notifyOverdue, notifyDailySummary, notifyOnComplete, dailySummaryHour, dueTodayHour, overdueHour, onboardingDone };

        if (settings) {
            settings = await prisma.userSettings.update({ where: { id: settings.id }, data });
        } else {
            settings = await prisma.userSettings.create({ data: { userId: req.userId, ...data } });
        }

        const userUpdate = {};
        if (req.body.name) userUpdate.name = req.body.name;
        if (req.body.email) userUpdate.email = req.body.email;
        if (Object.keys(userUpdate).length > 0) {
            await prisma.user.update({ where: { id: req.userId }, data: userUpdate });
        }

        res.json(settings);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Erro ao salvar configurações' });
    }
});

app.post('/settings/test-notification', async (req, res) => {
    try {
        const settings = await prisma.userSettings.findFirst({ where: { userId: req.userId } });
        if (!settings) return res.status(400).json({ error: 'Configure suas notificações primeiro' });

        await sendNotification(settings, {
            subject: '🧪 Teste — Agenda Inteligente',
            whatsappText: '✅ *Agenda Inteligente*\n\nSuas notificações estão funcionando! 🎉',
            emailHtml: '<h2>✅ Teste</h2><p>Suas notificações estão funcionando!</p>'
        });

        res.json({ success: true, message: 'Notificação de teste enviada!' });
    } catch (e) { res.status(500).json({ error: 'Erro: ' + e.message }); }
});

// ─── STATS ───────────────────────────────────────────────────────────────────

app.get('/stats', async (req, res) => {
    try {
        const now = new Date();
        const [total, completed, overdue, groups] = await Promise.all([
            prisma.task.count({ where: { userId: req.userId } }),
            prisma.task.count({ where: { userId: req.userId, completedAt: { not: null } } }),
            prisma.task.count({ where: { userId: req.userId, completedAt: null, dueDate: { lt: now } } }),
            prisma.group.findMany({ where: { userId: req.userId }, include: { _count: { select: { tasks: true } } } })
        ]);
        res.json({
            total, completed,
            pending: total - completed,
            overdue,
            completionRate: total === 0 ? 0 : Math.round((completed / total) * 100),
            byGroup: groups.map(g => ({ id: g.id, name: g.name, color: g.color, count: g._count.tasks }))
        });
    } catch (e) { res.status(500).json({ error: 'Erro nas stats' }); }
});

// /test-smtp removido por segurança (expunha infra em produção)

// ─── START ───────────────────────────────────────────────────────────────────

startCronJobs(prisma);

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => console.log(`🔥 Servidor na porta ${PORT}`));