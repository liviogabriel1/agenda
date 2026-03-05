import { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Loader2, Sparkles, Plus, Zap } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/Toast';

export function Assistente() {
    const qc = useQueryClient();
    const toast = useToast();
    const [messages, setMessages] = useState([
        { role: 'ai', text: 'Olá! Sou seu assistente de produtividade. Vejo suas tarefas aqui e posso ajudar a organizar seu dia.\n\nDica: use **/criar** seguido de uma descrição para criar tarefas! Ex: "/criar reunião com cliente amanhã às 14h"' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const quickPrompts = [
        'Qual tarefa devo priorizar agora?',
        'Resumo das minhas pendências',
        'Estou sobrecarregado, o que fazer?',
    ];

    const handleSend = async (text) => {
        const userMsg = text || input;
        if (!userMsg.trim()) return;
        setInput('');

        const history = messages.slice(-10).map(m => ({
            role: m.role,
            text: String(m.text || '').slice(0, 2000)
        }));
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setLoading(true);

        try {
            if (userMsg.startsWith('/criar ')) {
                const taskDescription = userMsg.slice(7);
                const { data } = await api.post('/ai/create-task', { message: taskDescription });
                setMessages(prev => [...prev, { role: 'ai', text: data.message, isTaskCreated: true, task: data.task }]);
                qc.invalidateQueries({ queryKey: ['tasks'] });
                toast({ message: data.message, type: 'success' });
            } else {
                const { data } = await api.post('/ai/chat', { message: userMsg, history });
                setMessages(prev => [...prev, { role: 'ai', text: data.response }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'ai', text: 'Ops! Tive um problema de conexão. Tente novamente.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-[calc(100vh-140px)] md:h-[85vh] flex flex-col bg-white/40 backdrop-blur-xl border border-white/60 rounded-3xl shadow-xl shadow-purple-900/5 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-5 text-white flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm"><Sparkles size={24} /></div>
                <div>
                    <h2 className="font-bold text-lg">Consultoria IA</h2>
                    <p className="text-purple-100 text-sm">Baseado nas suas tarefas • use /criar para adicionar tarefas</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.map((msg, index) => (
                    <motion.div key={index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                    >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-md ${msg.role === 'user' ? 'bg-indigo-500 text-white' : 'bg-white text-purple-600 border border-purple-100'}`}>
                            {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                        </div>
                        <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-indigo-500 text-white rounded-tr-sm' : 'bg-white text-gray-700 border border-gray-100 rounded-tl-sm'}`}>
                            {msg.text}
                            {msg.isTaskCreated && (
                                <div className="mt-3 flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-2 rounded-xl text-xs font-bold">
                                    <Plus size={14} />Tarefa criada com sucesso!
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}
                {loading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 max-w-[80%]">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white text-purple-600 shadow-md border border-purple-100">
                            <Loader2 size={20} className="animate-spin" />
                        </div>
                        <div className="p-4 rounded-2xl bg-white text-gray-500 border border-gray-100 rounded-tl-sm flex items-center gap-2">
                            Processando...
                        </div>
                    </motion.div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
                {quickPrompts.map((p, i) => (
                    <button key={i} onClick={() => handleSend(p)} className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-full text-xs font-semibold transition-colors">
                        <Zap size={12} />{p}
                    </button>
                ))}
            </div>

            <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="p-4 bg-white/60 border-t border-white/60 flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder='Pergunte algo... ou /criar reunião amanhã'
                    className="flex-1 px-5 py-3 bg-white/80 border border-gray-200 focus:border-purple-400 rounded-2xl outline-none text-sm transition-colors shadow-inner"
                    disabled={loading}
                />
                <button type="submit" disabled={loading || !input.trim()} className="p-3 bg-purple-600 text-white rounded-2xl hover:bg-purple-700 transition-all disabled:opacity-50 shadow-md shadow-purple-500/30">
                    <Send size={20} />
                </button>
            </form>
        </div>
    );
}