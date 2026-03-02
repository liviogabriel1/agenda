import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isAfter, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, Calendar, Sparkles, AlertTriangle, ChevronDown } from 'lucide-react';

export function TaskCard({ task, onComplete }) {
    const [isExpanding, setIsExpanding] = useState(false);
    const [notes, setNotes] = useState('');
    const [completedDate, setCompletedDate] = useState(
        new Date().toISOString().slice(0, 16)
    );

    const isLate = isAfter(new Date(completedDate), parseISO(task.dueDate));
    const isAlreadyCompleted = !!task.completedAt;

    const priorityColors = {
        'Alta': 'bg-red-100 text-red-700 border-red-200',
        'Média': 'bg-yellow-100 text-yellow-700 border-yellow-200',
        'Baixa': 'bg-blue-100 text-blue-700 border-blue-200',
    };

    const handleComplete = () => {
        onComplete(task.id, {
            completedAt: new Date(completedDate).toISOString(),
            notes
        });
        setIsExpanding(false);
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`relative p-6 rounded-3xl border backdrop-blur-lg transition-all duration-300 ${isAlreadyCompleted
                    ? 'bg-white/40 border-white/40 opacity-70 grayscale-[0.3]'
                    : 'bg-white/70 border-white/60 shadow-xl shadow-purple-900/5 hover:shadow-purple-900/10 hover:-translate-y-1'
                }`}
        >
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h3 className={`text-lg font-bold ${isAlreadyCompleted ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                        {task.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                </div>

                {task.aiPriority && (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${priorityColors[task.aiPriority]}`}>
                        {task.aiPriority}
                    </span>
                )}
            </div>

            {task.aiSuggestion && (
                <div className="flex items-start gap-3 mt-4 p-4 bg-purple-50/80 backdrop-blur-sm text-purple-800 rounded-2xl border border-purple-100/50 text-sm shadow-inner">
                    <Sparkles size={18} className="text-purple-500 shrink-0 mt-0.5" />
                    <p className="leading-relaxed"><strong>Dica da IA:</strong> {task.aiSuggestion}</p>
                </div>
            )}

            <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-200/50">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                    <Calendar size={16} className="text-gray-400" />
                    <span>{format(parseISO(task.dueDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                </div>

                {!isAlreadyCompleted && (
                    <button
                        onClick={() => setIsExpanding(!isExpanding)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all text-sm font-semibold shadow-md active:scale-95"
                    >
                        <CheckCircle2 size={18} />
                        Concluir
                        <ChevronDown size={16} className={`transition-transform duration-300 ${isExpanding ? 'rotate-180' : ''}`} />
                    </button>
                )}
            </div>

            <AnimatePresence>
                {isExpanding && !isAlreadyCompleted && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="flex flex-col gap-4 mt-5 pt-5 border-t border-gray-200/50">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Data Real de Conclusão</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="datetime-local"
                                        value={completedDate}
                                        onChange={(e) => setCompletedDate(e.target.value)}
                                        className="p-3 bg-white/50 border border-white focus:border-purple-400 rounded-xl text-sm w-full outline-none transition-colors"
                                    />
                                    {isLate && (
                                        <span className="flex items-center gap-1.5 text-xs text-red-600 font-bold whitespace-nowrap bg-red-100 px-3 py-2 rounded-xl">
                                            <AlertTriangle size={16} /> Atrasado
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Observações da Entrega</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Deixe uma nota sobre como foi finalizar isso..."
                                    className="w-full p-3 bg-white/50 border border-white focus:border-purple-400 rounded-xl text-sm outline-none resize-none h-24 transition-colors"
                                />
                            </div>

                            <button
                                onClick={handleComplete}
                                className="w-full py-3 mt-2 bg-gradient-to-r from-emerald-400 to-emerald-500 text-white rounded-xl hover:from-emerald-500 hover:to-emerald-600 transition-all font-bold text-sm shadow-lg shadow-emerald-500/30 flex justify-center items-center gap-2"
                            >
                                <CheckCircle2 size={20} />
                                Confirmar Conclusão
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}