import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { api } from '../services/api';

export function Assistente() {
    const [messages, setMessages] = useState([
        { role: 'ai', text: 'Olá! Sou seu assistente de produtividade. Estou vendo a sua lista de tarefas aqui... Como posso ajudar a organizar o seu dia?' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setLoading(true);

        try {
            const { data } = await api.post('/ai/chat', { message: userMsg });
            setMessages(prev => [...prev, { role: 'ai', text: data.response }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'ai', text: 'Ops! Tive um problema de conexão com o meu cérebro. Tente novamente.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-[85vh] flex flex-col bg-white/40 backdrop-blur-xl border border-white/60 rounded-3xl shadow-xl shadow-purple-900/5 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-5 text-white flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                    <Sparkles size={24} />
                </div>
                <div>
                    <h2 className="font-bold text-lg">Consultoria IA</h2>
                    <p className="text-purple-100 text-sm">Baseado nas suas tarefas de hoje</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.map((msg, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                    >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-md ${msg.role === 'user' ? 'bg-indigo-500 text-white' : 'bg-white text-purple-600 border border-purple-100'
                            }`}>
                            {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                        </div>

                        <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                                ? 'bg-indigo-500 text-white rounded-tr-sm'
                                : 'bg-white text-gray-700 border border-gray-100 rounded-tl-sm'
                            }`}>
                            {msg.text}
                        </div>
                    </motion.div>
                ))}
                {loading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 max-w-[80%]">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white text-purple-600 shadow-md border border-purple-100">
                            <Loader2 size={20} className="animate-spin" />
                        </div>
                        <div className="p-4 rounded-2xl bg-white text-gray-500 border border-gray-100 rounded-tl-sm flex items-center gap-2">
                            Processando sua rotina...
                        </div>
                    </motion.div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-4 bg-white/60 border-t border-white/60 flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ex: Qual tarefa devo priorizar agora?"
                    className="flex-1 px-5 py-3 bg-white/80 border border-gray-200 focus:border-purple-400 rounded-2xl outline-none text-sm transition-colors shadow-inner"
                    disabled={loading}
                />
                <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="p-3 bg-purple-600 text-white rounded-2xl hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-purple-500/30"
                >
                    <Send size={20} className={input.trim() ? 'ml-1' : ''} />
                </button>
            </form>
        </div>
    );
}