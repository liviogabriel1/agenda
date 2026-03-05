function getNextDueDate(dueDate, recurrence) {
    const next = new Date(dueDate);
    switch (recurrence) {
        case 'daily': next.setDate(next.getDate() + 1); break;
        case 'weekly': next.setDate(next.getDate() + 7); break;
        case 'monthly': next.setMonth(next.getMonth() + 1); break;
        default: return null;
    }
    return next;
}

async function createNextRecurrence(prisma, task) {
    if (!task.recurrence) return;
    const nextDueDate = getNextDueDate(task.dueDate, task.recurrence);
    if (!nextDueDate) return;
    const existing = await prisma.task.findFirst({
        where: { title: task.title, completedAt: null, dueDate: { gte: nextDueDate } }
    });
    if (existing) return;
    await prisma.task.create({
        data: { title: task.title, description: task.description, dueDate: nextDueDate, groupId: task.groupId || null, recurrence: task.recurrence }
    });
}

module.exports = { createNextRecurrence, getNextDueDate };