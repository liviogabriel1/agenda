const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

function generateToken(userId) {
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

async function hashPassword(password) {
    return bcrypt.hash(password, 12);
}

async function comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
}

function generateResetToken() {
    return crypto.randomBytes(32).toString('hex');
}

function createMailTransport() {
    return nodemailer.createTransport({
        host: 'smtp.resend.com',
        port: 465,
        secure: true,
        auth: {
            user: 'resend',
            pass: process.env.RESEND_API_KEY
        }
    });
}

async function sendResetEmail(email, token, name) {
    const transporter = createMailTransport();
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

    await transporter.sendMail({
        from: `"Agenda Inteligente 📅" <onboarding@resend.dev>`,
        to: email,
        subject: '🔑 Redefinir sua senha — Agenda Inteligente',
        html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f9f5ff;border-radius:16px;">
                <h1 style="color:#7c3aed;font-size:24px;margin-bottom:8px;">Redefinir senha</h1>
                <p style="color:#6b7280;">Olá, <strong>${name}</strong>!</p>
                <p style="color:#6b7280;">Clique no botão abaixo para redefinir sua senha. O link expira em <strong>1 hora</strong>.</p>
                <a href="${resetUrl}" style="display:inline-block;margin:24px 0;padding:14px 32px;background:linear-gradient(135deg,#7c3aed,#6366f1);color:white;text-decoration:none;border-radius:12px;font-weight:700;">
                    Redefinir senha
                </a>
                <p style="color:#9ca3af;font-size:12px;">Se você não solicitou isso, ignore este email.</p>
            </div>
        `
    });
}

async function sendConfirmationEmail(email, token, name) {
    const transporter = createMailTransport();
    const confirmUrl = `${process.env.BACKEND_URL || 'http://localhost:3333'}/auth/confirm-email?token=${token}`;

    await transporter.sendMail({
        from: `"Agenda Inteligente 📅" <onboarding@resend.dev>`,
        to: email,
        subject: '✅ Confirme seu email — Agenda Inteligente',
        html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f9f5ff;border-radius:16px;">
                <h1 style="color:#7c3aed;">Confirme seu email</h1>
                <p>Olá, <strong>${name}</strong>! Clique no botão abaixo para ativar sua conta.</p>
                <a href="${confirmUrl}" style="display:inline-block;margin:24px 0;padding:14px 32px;background:linear-gradient(135deg,#7c3aed,#6366f1);color:white;text-decoration:none;border-radius:12px;font-weight:700;">
                    Confirmar email
                </a>
                <p style="color:#9ca3af;font-size:12px;">Link válido por 24 horas.</p>
            </div>
        `
    });
}

module.exports = { generateToken, hashPassword, comparePassword, generateResetToken, sendResetEmail, sendConfirmationEmail };