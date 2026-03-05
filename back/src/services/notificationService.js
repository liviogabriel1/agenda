const nodemailer = require('nodemailer');

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
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    await transporter.sendMail({
        from: `"Agenda Inteligente 📅" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html
    });
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

module.exports = { sendNotification, buildDueTodayMessage, buildOverdueMessage, buildDailySummaryMessage, buildCompletionMessage };