import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/Toast';

export function ResetPassword() {
    const toast = useToast();
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    const rawToken = new URLSearchParams(window.location.search).get('token');
    const token = rawToken && /^[a-zA-Z0-9_\-]{10,200}$/.test(rawToken) ? rawToken : null;

    const handleReset = async () => {
        if (!token) return toast({ message: 'Token inválido', type: 'error' });
        setLoading(true);
        try {
            await api.post('/auth/reset-password', { token, password });
            setDone(true);
        } catch (e) {
            toast({ message: e.response?.data?.error || 'Erro ao redefinir', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-5xl font-extrabold text-gray-900">Agenda<span className="text-purple-600">.</span></h1>
                </div>
                <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 p-8">
                    {done ? (
                        <div className="text-center space-y-4">
                            <div className="text-5xl">✅</div>
                            <h2 className="text-2xl font-black text-gray-900">Senha redefinida!</h2>
                            <p className="text-gray-500 text-sm">Agora você pode entrar com sua nova senha.</p>
                            <button onClick={() => window.location.href = '/'} className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-bold hover:-translate-y-0.5 transition-all shadow-lg shadow-purple-500/30">
                                Ir para o login
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900">Nova senha</h2>
                                <p className="text-gray-500 text-sm mt-1">Escolha uma senha segura.</p>
                            </div>
                            <div className="relative">
                                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Mínimo 6 caracteres"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleReset()}
                                    className="w-full pl-11 pr-12 py-3.5 bg-gray-50 border border-gray-200 focus:border-purple-400 focus:bg-white rounded-2xl outline-none font-medium transition-all"
                                />
                                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            <button onClick={handleReset} disabled={loading || password.length < 6} className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-all shadow-lg shadow-purple-500/30 disabled:opacity-60">
                                {loading ? <Loader2 size={20} className="animate-spin" /> : 'Redefinir senha'}
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}