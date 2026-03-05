const cron = require('node-cron');
const {
    sendNotification,
    buildDueTodayMessage,
    buildOverdueMessage,
    buildDailySummaryMessage,
    buildScheduledReminderMessage,
    buildScheduledLateMessage,
    buildAutoCompletedMessage,
} = require('./notificationService');

function startCronJobs(prisma) {

    // ─── Jobs existentes (modo "completion") ─────────────────────────────

    // 1. Tarefas que vencem hoje — hora configurável (padrão 9h)
    cron.schedule('0 * * * *', async () => {
        try {
            const settings = await prisma.userSettings.findFirst();
            if (!settings?.notifyDueToday) return;

            const currentHour = new Date().getHours();
            if (currentHour !== (settings.dueTodayHour ?? 9)) return;

            console.log('🔔 Cron: verificando tarefas de hoje...');
            const start = new Date(); start.setHours(0, 0, 0, 0);
            const end = new Date(); end.setHours(23, 59, 59, 999);

            const tasks = await prisma.task.findMany({
                where: { completedAt: null, taskMode: 'completion', dueDate: { gte: start, lte: end } }
            });

            if (tasks.length > 0) {
                await sendNotification(settings, buildDueTodayMessage(tasks));
                console.log(`✅ Notificação "hoje" enviada — ${tasks.length} tarefas`);
            }
        } catch (e) { console.error('Erro no cron dueToday:', e); }
    }, { timezone: 'America/Sao_Paulo' });

    // 2. Tarefas atrasadas — hora configurável (padrão 10h)
    cron.schedule('0 * * * *', async () => {
        try {
            const settings = await prisma.userSettings.findFirst();
            if (!settings?.notifyOverdue) return;

            const currentHour = new Date().getHours();
            if (currentHour !== (settings.overdueHour ?? 10)) return;

            console.log('🔔 Cron: verificando atrasadas...');
            const tasks = await prisma.task.findMany({
                where: { completedAt: null, taskMode: 'completion', dueDate: { lt: new Date() } }
            });

            if (tasks.length > 0) {
                await sendNotification(settings, buildOverdueMessage(tasks));
                console.log(`✅ Notificação "atrasadas" enviada — ${tasks.length} tarefas`);
            }
        } catch (e) { console.error('Erro no cron overdue:', e); }
    }, { timezone: 'America/Sao_Paulo' });

    // 3. Resumo diário — hora configurável
    cron.schedule('0 * * * *', async () => {
        try {
            const settings = await prisma.userSettings.findFirst();
            if (!settings?.notifyDailySummary) return;

            const currentHour = new Date().getHours();
            if (currentHour !== settings.dailySummaryHour) return;

            const now = new Date();
            const pending = await prisma.task.findMany({ where: { completedAt: null, taskMode: 'completion' } });
            const overdue = pending.filter(t => new Date(t.dueDate) < now);

            if (pending.length > 0) {
                await sendNotification(settings, buildDailySummaryMessage(pending, overdue));
                console.log('✅ Resumo diário enviado');
            }
        } catch (e) { console.error('Erro no cron summary:', e); }
    }, { timezone: 'America/Sao_Paulo' });

    // ─── Jobs para modo "scheduled" (roda a cada minuto) ─────────────────

    // 4. Lembrete 30 min antes do início agendado
    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date();
            const windowStart = new Date(now.getTime() + 29 * 60 * 1000);
            const windowEnd = new Date(now.getTime() + 31 * 60 * 1000);

            const tasks = await prisma.task.findMany({
                where: {
                    taskMode: 'scheduled',
                    startedAt: null,
                    completedAt: null,
                    startReminderSent: false,
                    dueDate: { gte: windowStart, lte: windowEnd }
                },
                include: { user: { include: { settings: true } } }
            });

            for (const task of tasks) {
                const settings = task.user?.settings;
                if (!settings) continue;
                try {
                    await sendNotification(settings, buildScheduledReminderMessage(task));
                    await prisma.task.update({
                        where: { id: task.id },
                        data: { startReminderSent: true }
                    });
                    console.log(`⏰ Lembrete 30min enviado: "${task.title}"`);
                } catch (e) {
                    console.error(`Erro lembrete task ${task.id}:`, e);
                }
            }
        } catch (e) { console.error('Erro no cron scheduled reminder:', e); }
    }, { timezone: 'America/Sao_Paulo' });

    // 5. Alerta de atraso: 15 min após o horário sem confirmação de início
    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date();
            // janela: tarefas que deveriam ter começado entre 14 e 16 min atrás
            const windowStart = new Date(now.getTime() - 16 * 60 * 1000);
            const windowEnd = new Date(now.getTime() - 14 * 60 * 1000);

            const tasks = await prisma.task.findMany({
                where: {
                    taskMode: 'scheduled',
                    startedAt: null,
                    completedAt: null,
                    dueDate: { gte: windowStart, lte: windowEnd }
                },
                include: { user: { include: { settings: true } } }
            });

            for (const task of tasks) {
                const settings = task.user?.settings;
                if (!settings) continue;
                try {
                    const minutesLate = Math.round((now - new Date(task.dueDate)) / 60000);
                    await sendNotification(settings, buildScheduledLateMessage(task, minutesLate));
                    console.log(`⚠️ Alerta de atraso: "${task.title}" (${minutesLate}min)`);
                } catch (e) {
                    console.error(`Erro alerta atraso task ${task.id}:`, e);
                }
            }
        } catch (e) { console.error('Erro no cron scheduled late:', e); }
    }, { timezone: 'America/Sao_Paulo' });

    // 6. Auto-conclusão: passou o scheduledEndAt e a tarefa ainda está em andamento
    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date();

            const tasks = await prisma.task.findMany({
                where: {
                    taskMode: 'scheduled',
                    startedAt: { not: null },
                    completedAt: null,
                    scheduledEndAt: { lte: now }
                },
                include: { user: { include: { settings: true } } }
            });

            for (const task of tasks) {
                try {
                    const completed = await prisma.task.update({
                        where: { id: task.id },
                        data: { completedAt: now }
                    });

                    const settings = task.user?.settings;
                    if (settings?.notifyOnComplete) {
                        await sendNotification(settings, buildAutoCompletedMessage({ ...task, completedAt: now }));
                    }

                    console.log(`✅ Auto-concluído: "${task.title}"`);
                } catch (e) {
                    console.error(`Erro ao auto-concluir task ${task.id}:`, e);
                }
            }
        } catch (e) { console.error('Erro no cron auto-complete:', e); }
    }, { timezone: 'America/Sao_Paulo' });

    console.log('⏰ Cron jobs iniciados (completion + scheduled)');
}

module.exports = { startCronJobs };