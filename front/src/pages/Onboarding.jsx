import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, MessageCircle, Mail, ChevronRight, Check, Smartphone, User, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';

const STEPS = ['Boas-vindas', 'Contato', 'Notificações', 'Pronto!'];

export function Onboarding({ userName = '', onComplete }) {
    const toast = useToast();
    const { user } = useAuth();
    const [step, setStep] = useState(0);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        name: userName,
        whatsapp: '',
        email: user?.email || '',
        notifyChannel: 'email',
        notifyDueToday: true,
        notifyOverdue: true,
        notifyDailySummary: true,
        notifyOnComplete: true,
        dailySummaryHour: 8,
        dueTodayHour: 9,
        overdueHour: 10,
    });

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put('/settings', { ...form, onboardingDone: false });
            setStep(3);
        } catch (e) {
            toast({ message: 'Erro ao salvar configurações', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleFinish = async () => {
        setSaving(true);
        try {
            await api.put('/settings', { ...form, onboardingDone: true });
            onComplete(form);
        } catch (e) {
            toast({ message: 'Erro ao finalizar', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const testMutation = useMutation({
        mutationFn: async () => (await api.post('/settings/test-notification')).data,
        onSuccess: () => toast({ message: 'Notificação de teste enviada! Verifique seu email 📧', type: 'success' }),
        onError: () => toast({ message: 'Erro no teste. Verifique as configurações de email.', type: 'error' })
    });

    const channelOptions = [
        { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'emerald' },
        { value: 'email', label: 'E-mail', icon: Mail, color: 'blue' },
        { value: 'both', label: 'Ambos', icon: Bell, color: 'purple' },
    ];

    const notifyOptions = [
        { key: 'notifyDueToday', label: 'Tarefa vencendo hoje', emoji: '📅' },
        { key: 'notifyOverdue', label: 'Tarefa atrasada', emoji: '⚠️' },
        { key: 'notifyDailySummary', label: 'Resumo diário', emoji: '☀️' },
        { key: 'notifyOnComplete', label: 'Confirmação de conclusão', emoji: '✅' },
    ];

    // Helper para gerar as horas
    const hoursArray = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 z-[200] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-purple-900/10 border border-white/60 overflow-hidden"
            >
                {/* Progress bar */}
                <div className="h-1.5 bg-gray-100">
                    <motion.div
                        animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                        transition={{ duration: 0.4 }}
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                    />
                </div>

                <div className="p-8">
                    {/* Steps indicator */}
                    <div className="flex items-center justify-between mb-8">
                        {STEPS.map((s, i) => (
                            <div key={i} className="flex items-center gap-1">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black transition-all ${i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                    {i < step ? '✓' : i + 1}
                                </div>
                                {i < STEPS.length - 1 && <div className={`w-8 h-0.5 ${i < step ? 'bg-emerald-400' : 'bg-gray-200'}`} />}
                            </div>
                        ))}
                    </div>

                    <AnimatePresence mode="wait">
                        {/* Step 0 */}
                        {step === 0 && (
                            <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                                <div>
                                    <div className="text-5xl mb-4">👋</div>
                                    <h1 className="text-2xl font-black text-gray-900">Bem-vindo à Agenda Inteligente!</h1>
                                    <p className="text-gray-500 mt-2">Vamos configurar suas notificações para você nunca perder um prazo.</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Como podemos te chamar?</label>
                                    <div className="relative">
                                        <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            value={form.name}
                                            onChange={e => setForm({ ...form, name: e.target.value })}
                                            placeholder="Seu nome..."
                                            className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 focus:border-purple-400 rounded-2xl outline-none font-semibold text-gray-800 transition-colors"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={() => setStep(1)}
                                    disabled={!form.name.trim()}
                                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-all shadow-lg shadow-purple-500/30 disabled:opacity-50"
                                >
                                    Começar <ChevronRight size={20} />
                                </button>
                            </motion.div>
                        )}

                        {/* Step 1 */}
                        {step === 1 && (
                            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                                <div>
                                    <h2 className="text-xl font-black text-gray-900">Como quer ser notificado?</h2>
                                    <p className="text-gray-500 mt-1 text-sm">Escolha um ou mais canais de contato.</p>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    {channelOptions.map(({ value, label, icon: Icon, color }) => (
                                        <button
                                            key={value}
                                            onClick={() => setForm({ ...form, notifyChannel: value })}
                                            className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all font-bold text-xs ${form.notifyChannel === value ? `border-${color}-500 bg-${color}-50 text-${color}-700` : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}
                                        >
                                            <Icon size={22} />
                                            {label}
                                        </button>
                                    ))}
                                </div>

                                {(form.notifyChannel === 'whatsapp' || form.notifyChannel === 'both') && (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">WhatsApp (com DDD)</label>
                                        <div className="relative">
                                            <Smartphone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                value={form.whatsapp}
                                                onChange={e => setForm({ ...form, whatsapp: e.target.value })}
                                                placeholder="(11) 99999-9999"
                                                className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 focus:border-emerald-400 rounded-2xl outline-none font-semibold transition-colors"
                                            />
                                        </div>
                                    </div>
                                )}

                                {(form.notifyChannel === 'email' || form.notifyChannel === 'both') && (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">E-mail</label>
                                        <div className="relative">
                                            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="email"
                                                value={form.email}
                                                onChange={e => setForm({ ...form, email: e.target.value })}
                                                placeholder="seu@email.com"
                                                className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 focus:border-blue-400 rounded-2xl outline-none font-semibold transition-colors"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button onClick={() => setStep(0)} className="px-6 py-3.5 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-colors">
                                        Voltar
                                    </button>
                                    <button onClick={() => setStep(2)} className="flex-1 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-all shadow-lg shadow-purple-500/30">
                                        Continuar <ChevronRight size={20} />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 2 */}
                        {step === 2 && (
                            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5 max-h-[60vh] overflow-y-auto overflow-x-hidden pr-2">
                                <div>
                                    <h2 className="text-xl font-black text-gray-900">Quais avisos quer receber?</h2>
                                    <p className="text-gray-500 mt-1 text-sm">Personalize suas notificações.</p>
                                </div>

                                <div className="space-y-4">
                                    {/* Botão Vencendo Hoje */}
                                    <div>
                                        <button
                                            onClick={() => setForm({ ...form, notifyDueToday: !form.notifyDueToday })}
                                            className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${form.notifyDueToday ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-white'}`}
                                        >
                                            <span className="text-2xl">📅</span>
                                            <span className={`flex-1 font-semibold text-sm ${form.notifyDueToday ? 'text-purple-800' : 'text-gray-600'}`}>Tarefa vencendo hoje</span>
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${form.notifyDueToday ? 'bg-purple-600 border-purple-600' : 'border-gray-300'}`}>
                                                {form.notifyDueToday && <Check size={14} className="text-white" strokeWidth={3} />}
                                            </div>
                                        </button>

                                        {form.notifyDueToday && (
                                            <div className="mt-2 ml-4 pl-4 border-l-2 border-purple-200">
                                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Horário do aviso</label>
                                                <select value={form.dueTodayHour} onChange={e => setForm({ ...form, dueTodayHour: Number(e.target.value) })} className="w-full px-3 py-2.5 bg-white border border-gray-200 focus:border-purple-400 rounded-xl outline-none text-sm font-semibold">
                                                    {hoursArray.map(h => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    {/* Botão Atrasada */}
                                    <div>
                                        <button
                                            onClick={() => setForm({ ...form, notifyOverdue: !form.notifyOverdue })}
                                            className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${form.notifyOverdue ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-white'}`}
                                        >
                                            <span className="text-2xl">⚠️</span>
                                            <span className={`flex-1 font-semibold text-sm ${form.notifyOverdue ? 'text-purple-800' : 'text-gray-600'}`}>Tarefa atrasada</span>
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${form.notifyOverdue ? 'bg-purple-600 border-purple-600' : 'border-gray-300'}`}>
                                                {form.notifyOverdue && <Check size={14} className="text-white" strokeWidth={3} />}
                                            </div>
                                        </button>

                                        {form.notifyOverdue && (
                                            <div className="mt-2 ml-4 pl-4 border-l-2 border-purple-200">
                                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Horário da cobrança</label>
                                                <select value={form.overdueHour} onChange={e => setForm({ ...form, overdueHour: Number(e.target.value) })} className="w-full px-3 py-2.5 bg-white border border-gray-200 focus:border-purple-400 rounded-xl outline-none text-sm font-semibold">
                                                    {hoursArray.map(h => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    {/* Botão Resumo Diário */}
                                    <div>
                                        <button
                                            onClick={() => setForm({ ...form, notifyDailySummary: !form.notifyDailySummary })}
                                            className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${form.notifyDailySummary ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-white'}`}
                                        >
                                            <span className="text-2xl">☀️</span>
                                            <span className={`flex-1 font-semibold text-sm ${form.notifyDailySummary ? 'text-purple-800' : 'text-gray-600'}`}>Resumo diário</span>
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${form.notifyDailySummary ? 'bg-purple-600 border-purple-600' : 'border-gray-300'}`}>
                                                {form.notifyDailySummary && <Check size={14} className="text-white" strokeWidth={3} />}
                                            </div>
                                        </button>

                                        {form.notifyDailySummary && (
                                            <div className="mt-2 ml-4 pl-4 border-l-2 border-purple-200">
                                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Horário do resumo</label>
                                                <select value={form.dailySummaryHour} onChange={e => setForm({ ...form, dailySummaryHour: Number(e.target.value) })} className="w-full px-3 py-2.5 bg-white border border-gray-200 focus:border-purple-400 rounded-xl outline-none text-sm font-semibold">
                                                    {hoursArray.map(h => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    {/* Botão Conclusão */}
                                    <button
                                        onClick={() => setForm({ ...form, notifyOnComplete: !form.notifyOnComplete })}
                                        className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${form.notifyOnComplete ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-white'}`}
                                    >
                                        <span className="text-2xl">✅</span>
                                        <span className={`flex-1 font-semibold text-sm ${form.notifyOnComplete ? 'text-purple-800' : 'text-gray-600'}`}>Confirmação de conclusão</span>
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${form.notifyOnComplete ? 'bg-purple-600 border-purple-600' : 'border-gray-300'}`}>
                                            {form.notifyOnComplete && <Check size={14} className="text-white" strokeWidth={3} />}
                                        </div>
                                    </button>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button onClick={() => setStep(1)} className="px-6 py-3.5 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-colors">
                                        Voltar
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="flex-1 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-all shadow-lg shadow-purple-500/30 disabled:opacity-60"
                                    >
                                        {saving ? <Loader2 size={18} className="animate-spin" /> : <>Salvar <ChevronRight size={20} /></>}
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 3 */}
                        {step === 3 && (
                            <motion.div key="step3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 text-center">
                                <div>
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', bounce: 0.5, delay: 0.1 }}
                                        className="text-6xl mb-4"
                                    >
                                        🎉
                                    </motion.div>
                                    <h2 className="text-2xl font-black text-gray-900">Tudo configurado, {form.name}!</h2>
                                    <p className="text-gray-500 mt-2">Suas notificações estão ativas. Quer enviar um teste?</p>
                                </div>

                                <button
                                    onClick={() => testMutation.mutate()}
                                    disabled={testMutation.isPending}
                                    className="w-full py-3 border-2 border-purple-200 text-purple-700 font-bold rounded-2xl hover:bg-purple-50 transition-colors text-sm flex items-center justify-center gap-2"
                                >
                                    {testMutation.isPending
                                        ? <><Loader2 size={16} className="animate-spin" /> Enviando...</>
                                        : <><Bell size={18} /> Enviar notificação de teste</>
                                    }
                                </button>

                                <button
                                    onClick={handleFinish}
                                    disabled={saving}
                                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-all shadow-lg shadow-purple-500/30 disabled:opacity-60"
                                >
                                    {saving ? <Loader2 size={20} className="animate-spin" /> : 'Ir para a Agenda 🚀'}
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}