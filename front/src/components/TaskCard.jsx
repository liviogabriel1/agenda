import { useState, forwardRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isAfter, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, Calendar, Sparkles, AlertTriangle, ChevronDown, FolderOpen, Pencil, Trash2, RefreshCw, BrainCircuit, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { EditTaskModal } from './EditTaskModal';
import { useToast } from './Toast';

// ─── SubtaskItem ─────────────────────────────────────────────────────────────
function SubtaskItem({ sub }) {
    const qc = useQueryClient();

    const toggleMutation = useMutation({
        mutationFn: async () => (await api.patch(`/subtasks/${sub.id}/toggle`)).data,
        onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] })
    });

    return (
        <motion.div layout className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors">
            <button
                onClick={() => toggleMutation.mutate()}
                disabled={toggleMutation.isPending}
                className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${sub.completedAt ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 hover:border-emerald-400'
                    }`}
            >
                <AnimatePresence>
                    {sub.completedAt && (
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="text-white text-[10px] font-black leading-none">
                            ✓
                        </motion.span>
                    )}
                </AnimatePresence>
            </button>
            <span className={`flex-1 text-sm transition-all ${sub.completedAt ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                {sub.title}
            </span>
            {toggleMutation.isPending && <Loader2 size={12} className="animate-spin text-gray-400 shrink-0" />}
        </motion.div>
    );
}

// ─── CompletionReport ─────────────────────────────────────────────────────────
function CompletionReport({ report, completedAt }) {
    const { score, difficulty, timeAssessment, feedback, badge } = report;

    const scoreColor = score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-yellow-600' : 'text-red-500';
    const scoreBar = score >= 80 ? 'from-emerald-400 to-emerald-500' : score >= 60 ? 'from-yellow-400 to-orange-400' : 'from-red-400 to-red-500';

    const difficultyColors = {
        'Fácil': 'bg-blue-100 text-blue-700',
        'Moderada': 'bg-yellow-100 text-yellow-700',
        'Difícil': 'bg-orange-100 text-orange-700',
        'Muito Difícil': 'bg-red-100 text-red-700',
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white overflow-hidden"
        >
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-emerald-100/60">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">{badge}</span>
                    <div>
                        <p className="text-xs font-black text-emerald-700 uppercase tracking-wider">Relatório de Conclusão</p>
                        <p className="text-xs text-gray-400">
                            {format(parseISO(completedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <span className={`text-3xl font-black ${scoreColor}`}>{score}</span>
                    <p className="text-xs text-gray-400 font-semibold">/ 100</p>
                </div>
            </div>

            <div className="p-4 space-y-3">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${score}%` }}
                        transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                        className={`h-full bg-gradient-to-r ${scoreBar} rounded-full`}
                    />
                </div>

                <div className="flex flex-wrap gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${difficultyColors[difficulty] || 'bg-gray-100 text-gray-600'}`}>
                        💪 {difficulty}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600">
                        ⏱ {timeAssessment}
                    </span>
                </div>

                <p className="text-sm text-gray-700 leading-relaxed italic border-l-2 border-emerald-300 pl-3">
                    "{feedback}"
                </p>
            </div>
        </motion.div>
    );
}

// ─── TaskCard ─────────────────────────────────────────────────────────────────
export const TaskCard = forwardRef(({ task, onComplete }, ref) => {
    const qc = useQueryClient();
    const toast = useToast();
    const [isExpanding, setIsExpanding] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [notes, setNotes] = useState('');
    const [completedDate, setCompletedDate] = useState(new Date().toISOString().slice(0, 16));

    const isLate = isAfter(new Date(completedDate), parseISO(task.dueDate));
    const isAlreadyCompleted = !!task.completedAt;

    const deleteMutation = useMutation({
        mutationFn: async () => (await api.delete(`/tasks/${task.id}`)).data,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); toast({ message: 'Tarefa removida', type: 'info' }); },
        onError: () => toast({ message: 'Erro ao remover', type: 'error' })
    });

    const analyzeMutation = useMutation({
        mutationFn: async () => (await api.post(`/tasks/${task.id}/analyze`)).data,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); toast({ message: 'IA re-analisou esta tarefa!', type: 'success' }); },
        onError: () => toast({ message: 'Erro na análise', type: 'error' })
    });

    const priorityColors = {
        'Alta': 'bg-red-100 text-red-700 border-red-200',
        'Média': 'bg-yellow-100 text-yellow-700 border-yellow-200',
        'Baixa': 'bg-blue-100 text-blue-700 border-blue-200',
    };

    const groupColors = {
        purple: 'bg-purple-100 text-purple-700 border-purple-200',
        blue: 'bg-blue-100 text-blue-700 border-blue-200',
        emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        orange: 'bg-orange-100 text-orange-700 border-orange-200',
        pink: 'bg-pink-100 text-pink-700 border-pink-200',
        gray: 'bg-gray-100 text-gray-700 border-gray-200',
    };

    const recurrenceLabel = { daily: 'Diária', weekly: 'Semanal', monthly: 'Mensal' };

    const completedSubtasks = task.subtasks?.filter(s => s.completedAt).length || 0;
    const totalSubtasks = task.subtasks?.length || 0;

    const handleComplete = async () => {
        if (onComplete) await onComplete(task.id, { completedAt: new Date(completedDate).toISOString(), notes });
        setIsExpanding(false);
        setTimeout(async () => {
            try {
                await api.post(`/tasks/${task.id}/completion-report`);
                qc.invalidateQueries({ queryKey: ['tasks'] });
            } catch (e) {
                console.error('Erro ao gerar relatório', e);
            }
        }, 800);
    };

    return (
        <>
            {isEditing && <EditTaskModal task={task} onClose={() => setIsEditing(false)} />}

            <motion.div
                ref={ref}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`relative p-5 sm:p-6 rounded-3xl border backdrop-blur-lg transition-all duration-300 group ${isAlreadyCompleted
                    ? 'bg-white/40 border-white/40 opacity-70 grayscale-[0.3]'
                    : 'bg-white/70 border-white/60 shadow-xl shadow-purple-900/5 hover:shadow-purple-900/10 hover:-translate-y-1'
                    }`}
            >
                {/* Botões de ação */}
                {!isAlreadyCompleted && (
                    <div className="absolute top-4 right-4 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity bg-white/60 md:bg-transparent backdrop-blur-sm md:backdrop-blur-none p-1 rounded-xl">
                        <button onClick={() => analyzeMutation.mutate()} disabled={analyzeMutation.isPending} title="Re-analisar com IA" className="p-2 bg-purple-100 hover:bg-purple-200 text-purple-600 rounded-xl transition-colors">
                            {analyzeMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <BrainCircuit size={14} />}
                        </button>
                        <button onClick={() => setIsEditing(true)} title="Editar" className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors">
                            <Pencil size={14} />
                        </button>
                        <button onClick={() => setShowDeleteConfirm(true)} title="Deletar" className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl transition-colors">
                            <Trash2 size={14} />
                        </button>
                    </div>
                )}

                {/* Cabeçalho */}
                <div className="flex justify-between items-start mb-2 pr-24 md:pr-0">
                    <div className="flex flex-col items-start gap-2">
                        {task.group && (
                            <span className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-widest border ${groupColors[task.group.color] || groupColors.gray}`}>
                                <FolderOpen size={12} />{task.group.name}
                            </span>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className={`text-lg font-bold ${isAlreadyCompleted ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                {task.title}
                            </h3>
                            {task.recurrence && (
                                <span className="flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-bold">
                                    <RefreshCw size={10} />{recurrenceLabel[task.recurrence]}
                                </span>
                            )}
                        </div>
                    </div>
                    {task.aiPriority && (
                        <span className={`hidden sm:flex px-3 py-1 rounded-full text-xs font-semibold border ${priorityColors[task.aiPriority]}`}>
                            {task.aiPriority}
                        </span>
                    )}
                </div>

                {/* Prioridade Mobile */}
                {task.aiPriority && (
                    <span className={`sm:hidden inline-flex px-3 py-1 mt-1 mb-2 rounded-full text-xs font-semibold border ${priorityColors[task.aiPriority]}`}>
                        {task.aiPriority}
                    </span>
                )}

                {/* Descrição */}
                {task.description && (
                    <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                )}

                {/* Subtarefas */}
                {totalSubtasks > 0 && (
                    <div className="mt-4 space-y-1">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                            <span className="font-semibold uppercase tracking-wider">Subtarefas</span>
                            <span className="font-bold">
                                <span className="text-emerald-600">{completedSubtasks}</span>
                                <span className="text-gray-400">/{totalSubtasks}</span>
                            </span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${totalSubtasks === 0 ? 0 : (completedSubtasks / totalSubtasks) * 100}%` }}
                                transition={{ duration: 0.5, ease: 'easeOut' }}
                                className="h-full bg-gradient-to-r from-purple-400 to-emerald-400 rounded-full"
                            />
                        </div>
                        <div className="bg-gray-50/80 rounded-2xl px-2 py-1 border border-gray-100">
                            {task.subtasks.map((sub, i) => (
                                <div key={sub.id}>
                                    <SubtaskItem sub={sub} />
                                    {i < task.subtasks.length - 1 && <div className="h-px bg-gray-100 mx-3" />}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Dica da IA */}
                {task.aiSuggestion && !isAlreadyCompleted && (
                    <div className="flex items-start gap-3 mt-4 p-4 bg-purple-50/80 text-purple-800 rounded-2xl border border-purple-100/50 text-sm shadow-inner">
                        <Sparkles size={18} className="text-purple-500 shrink-0 mt-0.5" />
                        <p className="leading-relaxed"><strong>Dica da IA:</strong> {task.aiSuggestion}</p>
                    </div>
                )}

                {/* Relatório de conclusão */}
                {isAlreadyCompleted && task.completionReport && (
                    <CompletionReport report={task.completionReport} completedAt={task.completedAt} />
                )}

                {/* Footer */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-5 pt-4 border-t border-gray-200/50">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                        <Calendar size={16} className="text-gray-400" />
                        <span>{format(parseISO(task.dueDate), "dd/MM/yyyy", { locale: ptBR })}</span>
                    </div>
                    {!isAlreadyCompleted && (
                        <button
                            onClick={() => setIsExpanding(!isExpanding)}
                            className="flex justify-center items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all text-sm font-semibold shadow-md active:scale-95"
                        >
                            <CheckCircle2 size={18} />
                            Concluir
                            <ChevronDown size={16} className={`transition-transform duration-300 ${isExpanding ? 'rotate-180' : ''}`} />
                        </button>
                    )}
                </div>

                {/* Painel de conclusão */}
                <AnimatePresence>
                    {isExpanding && !isAlreadyCompleted && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="flex flex-col gap-4 mt-5 pt-5 border-t border-gray-200/50">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Data Real de Conclusão</label>
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                        <input type="datetime-local" value={completedDate} onChange={e => setCompletedDate(e.target.value)} className="p-3 bg-white/50 border border-white focus:border-purple-400 rounded-xl text-sm w-full outline-none" />
                                        {isLate && (
                                            <span className="flex justify-center items-center gap-1.5 text-xs text-red-600 font-bold whitespace-nowrap bg-red-100 px-3 py-2 rounded-xl">
                                                <AlertTriangle size={16} /> Atrasado
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Observações da Entrega</label>
                                    <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Como foi finalizar isso?" className="w-full p-3 bg-white/50 border border-white focus:border-purple-400 rounded-xl text-sm outline-none resize-none h-24" />
                                </div>
                                <button onClick={handleComplete} className="w-full py-3 mt-2 bg-gradient-to-r from-emerald-400 to-emerald-500 text-white rounded-xl hover:from-emerald-500 hover:to-emerald-600 transition-all font-bold text-sm shadow-lg shadow-emerald-500/30 flex justify-center items-center gap-2">
                                    <CheckCircle2 size={20} />Confirmar Conclusão
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-black text-gray-900 mb-2">Deletar tarefa?</h3>
                        <p className="text-sm text-gray-500 mb-6">Esta ação não pode ser desfeita.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-semibold hover:bg-gray-200 transition-colors">
                                Cancelar
                            </button>
                            <button onClick={() => { deleteMutation.mutate(); setShowDeleteConfirm(false); }} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors">
                                Deletar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
});