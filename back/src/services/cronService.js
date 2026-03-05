const cron = require('node-cron');
const {
    sendNotification,
    buildDueTodayMessage,
    buildOverdueMessage,
    buildDailySummaryMessage
} = require('./notificationService');

function startCronJobs(prisma) {
    cron.schedule('0 * * * *', async () => {
        try {
            const settings = await prisma.userSettings.findFirst();
            if (!settings?.notifyDueToday) return;

            const currentHour = new Date().getHours();
            const triggerHour = settings.dueTodayHour !== null && settings.dueTodayHour !== undefined ? settings.dueTodayHour : 9;
            if (currentHour !== triggerHour) return;

            console.log('🔔 Cron: verificando tarefas de hoje...');
            const start = new Date(); start.setHours(0, 0, 0, 0);
            const end = new Date(); end.setHours(23, 59, 59, 999);

            const tasks = await prisma.task.findMany({
                where: { completedAt: null, dueDate: { gte: start, lte: end } }
            });

            if (tasks.length > 0) {
                await sendNotification(settings, buildDueTodayMessage(tasks));
                console.log(`✅ Notificação "hoje" enviada — ${tasks.length} tarefas`);
            }
        } catch (e) { console.error('Erro no cron dueToday:', e); }
    }, { timezone: 'America/Sao_Paulo' });

    // 2. Verifica tarefas atrasadas — na hora configurada pelo usuário (padrão: 10h)
    cron.schedule('0 * * * *', async () => {
        try {
            const settings = await prisma.userSettings.findFirst();
            if (!settings?.notifyOverdue) return;

            const currentHour = new Date().getHours();
            const triggerHour = settings.overdueHour !== null && settings.overdueHour !== undefined ? settings.overdueHour : 10;
            if (currentHour !== triggerHour) return;

            console.log('🔔 Cron: verificando atrasadas...');
            const tasks = await prisma.task.findMany({
                where: { completedAt: null, dueDate: { lt: new Date() } }
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
            const pending = await prisma.task.findMany({ where: { completedAt: null } });
            const overdue = pending.filter(t => new Date(t.dueDate) < now);

            if (pending.length > 0) {
                await sendNotification(settings, buildDailySummaryMessage(pending, overdue));
                console.log('✅ Resumo diário enviado');
            }
        } catch (e) { console.error('Erro no cron summary:', e); }
    }, { timezone: 'America/Sao_Paulo' });

    console.log('⏰ Cron jobs iniciados com verificação de horas dinâmicas');
}

module.exports = { startCronJobs };