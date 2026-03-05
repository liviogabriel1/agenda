async function sendWhatsApp(phone, message) {
    const baseUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    const instance = process.env.EVOLUTION_INSTANCE;

    if (!baseUrl || !apiKey || !instance) {
        console.warn('⚠️ Evolution API não configurada. Pulando WhatsApp.');
        return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

    const response = await fetch(`${baseUrl}/message/sendText/${instance}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
        body: JSON.stringify({ number: formattedPhone, text: message })
    });

    if (!response.ok) {
        const err = await response.text();
        console.error('Erro Evolution API:', err);
        throw new Error('Falha ao enviar WhatsApp');
    }

    return response.json();
}

async function sendEmail(to, subject, html) {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'api-key': process.env.BREVO_API_KEY
        },
        body: JSON.stringify({
            sender: { name: 'Agenda Inteligente', email: process.env.SMTP_USER },
            to: [{ email: to }],
            subject,
            htmlContent: html
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Brevo API error: ${err}`);
    }
}

async function sendNotification(settings, { subject, whatsappText, emailHtml }) {
    const promises = [];

    if ((settings.notifyChannel === 'whatsapp' || settings.notifyChannel === 'both') && settings.whatsapp) {
        promises.push(sendWhatsApp(settings.whatsapp, whatsappText));
    }

    if ((settings.notifyChannel === 'email' || settings.notifyChannel === 'both') && settings.email) {
        promises.push(sendEmail(settings.email, subject, emailHtml || `<p>${whatsappText}</p>`));
    }

    const results = await Promise.allSettled(promises);
    results.forEach(result => {
        if (result.status === 'rejected') {
            console.error('❌ Falha ao enviar notificação:', result.reason);
        }
    });
}

// ─── Builders existentes ──────────────────────────────────────────────────

function buildDueTodayMessage(tasks) {
    const list = tasks.map(t => `  • ${t.title}`).join('\n');
    return {
        subject: `📅 ${tasks.length} tarefa(s) vencem hoje`,
        whatsappText: `📅 *Agenda Inteligente*\n\nVocê tem *${tasks.length} tarefa(s) vencendo hoje*:\n\n${list}\n\nBora concluir! 💪`,
        emailHtml: `<h2>📅 Tarefas para hoje</h2><ul>${tasks.map(t => `<li><strong>${t.title}</strong></li>`).join('')}</ul>`
    };
}

function buildOverdueMessage(tasks) {
    const list = tasks.map(t => `  • ${t.title}`).join('\n');
    return {
        subject: `⚠️ ${tasks.length} tarefa(s) em atraso`,
        whatsappText: `⚠️ *Agenda Inteligente*\n\nVocê tem *${tasks.length} tarefa(s) atrasada(s)*:\n\n${list}\n\nNão deixa acumular! 🔥`,
        emailHtml: `<h2>⚠️ Tarefas atrasadas</h2><ul>${tasks.map(t => `<li><strong>${t.title}</strong></li>`).join('')}</ul>`
    };
}

function buildDailySummaryMessage(pending, overdue) {
    return {
        subject: `☀️ Resumo diário — ${pending.length} pendente(s)`,
        whatsappText: `☀️ *Bom dia! Resumo da sua Agenda*\n\n📋 Pendentes: *${pending.length}*\n⚠️ Atrasadas: *${overdue.length}*\n\n${pending.slice(0, 5).map(t => `  • ${t.title}`).join('\n')}${pending.length > 5 ? `\n  ...e mais ${pending.length - 5}` : ''}\n\nTenha um dia produtivo! 🚀`,
        emailHtml: `<h2>☀️ Seu resumo diário</h2><p><strong>${pending.length}</strong> pendentes | <strong>${overdue.length}</strong> atrasadas</p><ul>${pending.slice(0, 10).map(t => `<li>${t.title}</li>`).join('')}</ul>`
    };
}

function buildCompletionMessage(task) {
    return {
        subject: `✅ Tarefa concluída: ${task.title}`,
        whatsappText: `✅ *Agenda Inteligente*\n\nTarefa concluída com sucesso!\n\n*${task.title}*\n\nContinue assim! 🎯`,
        emailHtml: `<h2>✅ Tarefa concluída!</h2><p><strong>${task.title}</strong> foi marcada como concluída.</p>`
    };
}

// ─── Builders para modo "scheduled" ──────────────────────────────────────

/**
 * Lembrete 30 minutos antes do horário agendado
 */
function buildScheduledReminderMessage(task) {
    const time = new Date(task.dueDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const durationText = task.duration ? ` · Duração: ${task.duration >= 60
        ? `${Math.floor(task.duration / 60)}h${task.duration % 60 > 0 ? ` ${task.duration % 60}min` : ''}`
        : `${task.duration}min`}` : '';

    return {
        subject: `⏰ Lembrete: "${task.title}" começa em 30 minutos`,
        whatsappText: `⏰ *Agenda Inteligente*\n\nDaqui a *30 minutos* começa:\n\n📌 *${task.title}*\n🕐 Horário: *${time}*${durationText}\n\nSe prepare! ✨`,
        emailHtml: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f9f5ff;border-radius:16px;">
                <h2 style="color:#7c3aed;margin-bottom:4px;">⏰ Lembrete — 30 minutos</h2>
                <p style="color:#6b7280;margin-top:0;">A seguinte atividade começa em breve:</p>
                <div style="background:#fff;border-left:4px solid #7c3aed;padding:16px 20px;border-radius:8px;margin:16px 0;">
                    <strong style="font-size:18px;color:#111;">${task.title}</strong>
                    ${task.description ? `<p style="color:#6b7280;margin:8px 0 0;">${task.description}</p>` : ''}
                    <p style="color:#7c3aed;font-weight:700;margin:8px 0 0;">🕐 ${time}${durationText}</p>
                </div>
                <p style="color:#9ca3af;font-size:12px;">Confirme o início no app quando começar para registrar sua pontualidade.</p>
            </div>
        `
    };
}

/**
 * Alerta de atraso: passou do horário e não confirmou início
 */
function buildScheduledLateMessage(task, minutesLate) {
    const time = new Date(task.dueDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return {
        subject: `⚠️ Atraso: "${task.title}" deveria ter começado às ${time}`,
        whatsappText: `⚠️ *Agenda Inteligente*\n\nVocê ainda não confirmou o início de:\n\n📌 *${task.title}*\n🕐 Horário previsto: *${time}*\n⏱ Atraso: *${minutesLate} min*\n\nAinda dá tempo! Confirme no app. 💪`,
        emailHtml: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fff7ed;border-radius:16px;">
                <h2 style="color:#ea580c;margin-bottom:4px;">⚠️ Início em atraso</h2>
                <p style="color:#6b7280;margin-top:0;">Você ainda não confirmou o início desta atividade:</p>
                <div style="background:#fff;border-left:4px solid #ea580c;padding:16px 20px;border-radius:8px;margin:16px 0;">
                    <strong style="font-size:18px;color:#111;">${task.title}</strong>
                    <p style="color:#ea580c;font-weight:700;margin:8px 0 0;">🕐 Previsto: ${time} · Atraso: ${minutesLate} min</p>
                </div>
                <p style="color:#6b7280;font-size:13px;">Se já começou, confirme o início no app para registrar corretamente.</p>
            </div>
        `
    };
}

/**
 * Conclusão automática após fim do tempo de duração
 */
function buildAutoCompletedMessage(task) {
    const startedAt = new Date(task.startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const endedAt = new Date(task.scheduledEndAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const durationText = task.duration >= 60
        ? `${Math.floor(task.duration / 60)}h${task.duration % 60 > 0 ? ` ${task.duration % 60}min` : ''}`
        : `${task.duration}min`;

    return {
        subject: `✅ Concluído automaticamente: "${task.title}"`,
        whatsappText: `✅ *Agenda Inteligente*\n\n*${task.title}* foi concluído automaticamente!\n\n🕐 Início: *${startedAt}*\n🏁 Fim: *${endedAt}*\n⏱ Duração: *${durationText}*`,
        emailHtml: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f0fdf4;border-radius:16px;">
                <h2 style="color:#16a34a;margin-bottom:4px;">✅ Concluído automaticamente!</h2>
                <p style="color:#6b7280;margin-top:0;">Sua atividade foi registrada como concluída:</p>
                <div style="background:#fff;border-left:4px solid #16a34a;padding:16px 20px;border-radius:8px;margin:16px 0;">
                    <strong style="font-size:18px;color:#111;">${task.title}</strong>
                    <p style="color:#6b7280;margin:8px 0 0;">Início: <strong>${startedAt}</strong> · Fim: <strong>${endedAt}</strong> · <strong>${durationText}</strong></p>
                </div>
            </div>
        `
    };
}

module.exports = {
    sendNotification,
    buildDueTodayMessage,
    buildOverdueMessage,
    buildDailySummaryMessage,
    buildCompletionMessage,
    buildScheduledReminderMessage,
    buildScheduledLateMessage,
    buildAutoCompletedMessage,
};