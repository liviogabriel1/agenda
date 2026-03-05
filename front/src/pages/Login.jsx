import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';

function getPasswordStrength(password) {
    const rules = [
        { label: 'Mínimo 8 caracteres', valid: password.length >= 8 },
        { label: 'Uma letra maiúscula', valid: /[A-Z]/.test(password) },
        { label: 'Um número', valid: /[0-9]/.test(password) },
        { label: 'Um caractere especial', valid: /[^A-Za-z0-9]/.test(password) },
    ];
    const score = rules.filter(r => r.valid).length;
    return { rules, score };
}

function PasswordStrength({ password }) {
    const { rules, score } = getPasswordStrength(password);
    if (!password) return null;

    const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-500'];

    return (
        <div className="space-y-2 mt-1">
            <div className="flex gap-1">
                {[0, 1, 2, 3].map(i => (
                    <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i < score ? colors[score - 1] : 'bg-gray-200'}`}
                    />
                ))}
            </div>
            {score < 4 ? (
                <div className="space-y-1">
                    {rules.filter(r => !r.valid).map(r => (
                        <p key={r.label} className="text-xs text-gray-400 flex items-center gap-1">
                            <span className="text-red-400">✗</span> {r.label}
                        </p>
                    ))}
                </div>
            ) : (
                <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    <span>✓</span> Senha forte!
                </p>
            )}
        </div>
    );
}

export function Login() {
    const { login } = useAuth();
    const toast = useToast();
    const [mode, setMode] = useState('login');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [waitingConfirmation, setWaitingConfirmation] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', password: '' });

    const urlParams = new URLSearchParams(window.location.search);
    const [justConfirmed] = useState(urlParams.get('emailConfirmed') === 'true');

    const handleSubmit = async () => {
        if (mode === 'register') {
            const { score } = getPasswordStrength(form.password);
            if (!form.name.trim()) return toast({ message: 'Digite seu nome', type: 'error' });
            if (!form.email.trim()) return toast({ message: 'Digite seu email', type: 'error' });
            if (score < 3) return toast({ message: 'Senha muito fraca. Siga os requisitos abaixo.', type: 'error' });
        }

        if (mode === 'login') {
            if (!form.email.trim()) return toast({ message: 'Digite seu email', type: 'error' });
            if (!form.password.trim()) return toast({ message: 'Digite sua senha', type: 'error' });
        }

        setLoading(true);
        try {
            if (mode === 'login') {
                const { data } = await api.post('/auth/login', {
                    email: form.email,
                    password: form.password
                });
                login(data.user);
            } else if (mode === 'register') {
                await api.post('/auth/register', form);
                setWaitingConfirmation(true);
            } else if (mode === 'forgot') {
                await api.post('/auth/forgot-password', { email: form.email });
                setMode('forgot-sent');
            }
        } catch (e) {
            toast({ message: e.response?.data?.error || 'Erro inesperado', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const switchMode = (newMode) => {
        setMode(newMode);
        setForm({ name: '', email: '', password: '' });
        setShowPassword(false);
        setWaitingConfirmation(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
            <div className="fixed top-20 left-20 w-72 h-72 bg-purple-300/20 rounded-full blur-3xl pointer-events-none" />
            <div className="fixed bottom-20 right-20 w-96 h-96 bg-pink-300/20 rounded-full blur-3xl pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md relative"
            >
                {/* Logo */}
                <div className="text-center mb-8">
                    <motion.h1
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-5xl font-extrabold text-gray-900 tracking-tight"
                    >
                        Agenda<span className="text-purple-600">.</span>
                    </motion.h1>
                    <p className="text-gray-500 mt-2 font-medium">Sua agenda inteligente com IA ✨</p>
                </div>

                {/* Banner de email confirmado */}
                <AnimatePresence>
                    {justConfirmed && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-sm font-semibold text-center flex items-center justify-center gap-2"
                        >
                            ✅ Email confirmado! Agora você pode entrar.
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl shadow-purple-900/10 border border-white/60 p-8">
                    <AnimatePresence mode="wait">

                        {/* LOGIN */}
                        {mode === 'login' && !waitingConfirmation && (
                            <motion.div
                                key="login"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-5"
                            >
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900">Entrar</h2>
                                    <p className="text-gray-500 text-sm mt-1">Bem-vindo de volta!</p>
                                </div>

                                <div className="space-y-3">
                                    <div className="relative">
                                        <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="email"
                                            placeholder="seu@email.com"
                                            value={form.email}
                                            onChange={e => setForm({ ...form, email: e.target.value })}
                                            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                                            className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 focus:border-purple-400 focus:bg-white rounded-2xl outline-none font-medium text-gray-800 transition-all"
                                        />
                                    </div>
                                    <div className="relative">
                                        <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Sua senha"
                                            value={form.password}
                                            onChange={e => setForm({ ...form, password: e.target.value })}
                                            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                                            className="w-full pl-11 pr-12 py-3.5 bg-gray-50 border border-gray-200 focus:border-purple-400 focus:bg-white rounded-2xl outline-none font-medium text-gray-800 transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(v => !v)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    onClick={() => switchMode('forgot')}
                                    className="text-sm text-purple-600 font-semibold hover:underline"
                                >
                                    Esqueci minha senha
                                </button>

                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-all shadow-lg shadow-purple-500/30 disabled:opacity-60"
                                >
                                    {loading ? <Loader2 size={20} className="animate-spin" /> : 'Entrar'}
                                </button>

                                <p className="text-center text-sm text-gray-500">
                                    Não tem conta?{' '}
                                    <button onClick={() => switchMode('register')} className="text-purple-600 font-bold hover:underline">
                                        Criar conta
                                    </button>
                                </p>
                            </motion.div>
                        )}

                        {/* REGISTER */}
                        {mode === 'register' && !waitingConfirmation && (
                            <motion.div
                                key="register"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-5"
                            >
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900">Criar conta</h2>
                                    <p className="text-gray-500 text-sm mt-1">É rápido e gratuito!</p>
                                </div>

                                <div className="space-y-3">
                                    <div className="relative">
                                        <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Seu nome"
                                            value={form.name}
                                            onChange={e => setForm({ ...form, name: e.target.value })}
                                            className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 focus:border-purple-400 focus:bg-white rounded-2xl outline-none font-medium text-gray-800 transition-all"
                                        />
                                    </div>
                                    <div className="relative">
                                        <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="email"
                                            placeholder="seu@email.com"
                                            value={form.email}
                                            onChange={e => setForm({ ...form, email: e.target.value })}
                                            className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 focus:border-purple-400 focus:bg-white rounded-2xl outline-none font-medium text-gray-800 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <div className="relative">
                                            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                placeholder="Mínimo 8 caracteres"
                                                value={form.password}
                                                onChange={e => setForm({ ...form, password: e.target.value })}
                                                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                                                className="w-full pl-11 pr-12 py-3.5 bg-gray-50 border border-gray-200 focus:border-purple-400 focus:bg-white rounded-2xl outline-none font-medium text-gray-800 transition-all"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(v => !v)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                        <PasswordStrength password={form.password} />
                                    </div>
                                </div>

                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-all shadow-lg shadow-purple-500/30 disabled:opacity-60"
                                >
                                    {loading ? <Loader2 size={20} className="animate-spin" /> : 'Criar conta'}
                                </button>

                                <p className="text-center text-sm text-gray-500">
                                    Já tem conta?{' '}
                                    <button onClick={() => switchMode('login')} className="text-purple-600 font-bold hover:underline">
                                        Entrar
                                    </button>
                                </p>
                            </motion.div>
                        )}

                        {/* AGUARDANDO CONFIRMAÇÃO DE EMAIL */}
                        {waitingConfirmation && (
                            <motion.div
                                key="waiting"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="space-y-5 text-center"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', bounce: 0.5, delay: 0.1 }}
                                    className="text-6xl"
                                >
                                    📧
                                </motion.div>
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900">Verifique seu email!</h2>
                                    <p className="text-gray-500 text-sm mt-2">
                                        Enviamos um link de confirmação para{' '}
                                        <strong className="text-gray-700">{form.email}</strong>.
                                        Clique nele para ativar sua conta.
                                    </p>
                                </div>
                                <div className="p-4 bg-purple-50 rounded-2xl text-purple-700 text-sm font-medium">
                                    💡 Não encontrou? Verifique a pasta de spam.
                                </div>
                                <button
                                    onClick={() => switchMode('login')}
                                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-bold hover:-translate-y-0.5 transition-all shadow-lg shadow-purple-500/30"
                                >
                                    Ir para o login
                                </button>
                            </motion.div>
                        )}

                        {/* FORGOT PASSWORD */}
                        {mode === 'forgot' && (
                            <motion.div
                                key="forgot"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-5"
                            >
                                <button
                                    onClick={() => switchMode('login')}
                                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 font-semibold"
                                >
                                    <ArrowLeft size={16} /> Voltar
                                </button>
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900">Esqueceu a senha?</h2>
                                    <p className="text-gray-500 text-sm mt-1">Enviaremos um link para redefinir.</p>
                                </div>
                                <div className="relative">
                                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="email"
                                        placeholder="seu@email.com"
                                        value={form.email}
                                        onChange={e => setForm({ ...form, email: e.target.value })}
                                        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                                        className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 focus:border-purple-400 focus:bg-white rounded-2xl outline-none font-medium text-gray-800 transition-all"
                                    />
                                </div>
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-all shadow-lg shadow-purple-500/30 disabled:opacity-60"
                                >
                                    {loading ? <Loader2 size={20} className="animate-spin" /> : 'Enviar link de recuperação'}
                                </button>
                            </motion.div>
                        )}

                        {/* FORGOT SENT */}
                        {mode === 'forgot-sent' && (
                            <motion.div
                                key="sent"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="space-y-5 text-center"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', bounce: 0.5, delay: 0.1 }}
                                    className="text-6xl"
                                >
                                    📬
                                </motion.div>
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900">Email enviado!</h2>
                                    <p className="text-gray-500 text-sm mt-2">
                                        Verifique sua caixa de entrada e clique no link para redefinir sua senha. O link expira em 1 hora.
                                    </p>
                                </div>
                                <div className="p-4 bg-purple-50 rounded-2xl text-purple-700 text-sm font-medium">
                                    💡 Não encontrou? Verifique a pasta de spam.
                                </div>
                                <button
                                    onClick={() => switchMode('login')}
                                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-bold hover:-translate-y-0.5 transition-all shadow-lg shadow-purple-500/30"
                                >
                                    Voltar para o login
                                </button>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}