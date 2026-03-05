import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, CheckCircle2, Clock, StickyNote, Hash } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';

function SubtaskRow({ sub }) {
    const qc = useQueryClient();

    const toggleMutation = useMutation({
        mutationFn: async () => (await api.patch(`/subtasks/${sub.id}/toggle`)).data,
        onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] })
    });

    return (
        <div className="flex items-center gap-2.5 py-1.5 group/sub">
            <button
                onClick={() => toggleMutation.mutate()}
                disabled={toggleMutation.isPending}
                className={`shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${sub.completedAt
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'border-gray-300 hover:border-emerald-400'
                    }`}
            >
                {sub.completedAt && (
                    <span className="text-white text-[8px] font-black leading-none">✓</span>
                )}
            </button>
            <span className={`text-xs flex-1 transition-all ${sub.completedAt ? 'line-through text-gray-400' : 'text-gray-600'
                }`}>
                {sub.title}
            </span>
            {toggleMutation.isPending && (
                <Loader2 size={10} className="animate-spin text-gray-400 shrink-0" />
            )}
        </div>
    );
}

export function GrupoBoard() {
    const { id } = useParams();
    const queryClient = useQueryClient();

    const { data: groups = [] } = useQuery({
        queryKey: ['groups'],
        queryFn: async () => (await api.get('/groups')).data
    });

    const { data: tasks = [], isLoading } = useQuery({
        queryKey: ['tasks'],
        queryFn: async () => (await api.get('/tasks')).data
    });

    // Compatibilidade com novo formato { tasks: [] }
    const allTasks = Array.isArray(tasks) ? tasks : (tasks.tasks ?? []);

    const currentGroup = groups.find(g => g.id === id);
    const groupTasks = allTasks.filter(t => t.groupId === id);
    const pendingTasks = groupTasks.filter(t => !t.completedAt);
    const completedTasks = groupTasks.filter(t => t.completedAt);

    const completeTaskMutation = useMutation({
        mutationFn: async ({ taskId, data }) => await api.patch(`/tasks/${taskId}/complete`, data),
        onSuccess: () => {
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        }
    });

    if (isLoading || !currentGroup) {
        return (
            <div className="flex justify-center items-center h-full pt-32">
                <Loader2 size={40} className="text-purple-500 animate-spin" />
            </div>
        );
    }

    const postItColors = {
        purple: 'bg-purple-50/90 border-purple-200/60 shadow-purple-900/5',
        blue: 'bg-blue-50/90 border-blue-200/60 shadow-blue-900/5',
        emerald: 'bg-emerald-50/90 border-emerald-200/60 shadow-emerald-900/5',
        orange: 'bg-orange-50/90 border-orange-200/60 shadow-orange-900/5',
        pink: 'bg-pink-50/90 border-pink-200/60 shadow-pink-900/5',
        gray: 'bg-gray-50/90 border-gray-200/60 shadow-gray-900/5',
    };

    const activeColor = postItColors[currentGroup.color] || postItColors.gray;

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-12">
            <header className="bg-white/40 backdrop-blur-xl border border-white/60 p-8 rounded-3xl shadow-xl shadow-gray-200/50 flex items-center justify-between">
                <div>
                    <h2 className="text-gray-500 font-bold tracking-wide uppercase text-xs mb-1">Quadro de Grupo</h2>
                    <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                        <Hash className={`text-${currentGroup.color}-500`} size={36} />
                        {currentGroup.name}
                    </h1>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-black text-gray-800">{groupTasks.length}</p>
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Tarefas Totais</p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                {/* Coluna: A Fazer */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg"><Clock size={18} /></div>
                        <h3 className="text-lg font-bold text-gray-800">A Fazer ({pendingTasks.length})</h3>
                    </div>

                    <AnimatePresence>
                        {pendingTasks.map((task, index) => (
                            <PostItCard
                                key={task.id}
                                task={task}
                                theme={activeColor}
                                delay={index * 0.1}
                                onComplete={(data) => completeTaskMutation.mutate({ taskId: task.id, data })}
                            />
                        ))}
                    </AnimatePresence>

                    {pendingTasks.length === 0 && (
                        <div className="p-8 text-center border-2 border-dashed border-gray-300/50 rounded-3xl text-gray-400 font-medium">
                            Coluna vazia
                        </div>
                    )}
                </div>

                {/* Coluna: Concluídas */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><CheckCircle2 size={18} /></div>
                        <h3 className="text-lg font-bold text-gray-800">Concluídas ({completedTasks.length})</h3>
                    </div>

                    <AnimatePresence>
                        {completedTasks.map((task, index) => (
                            <motion.div
                                key={task.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-5 bg-white/40 backdrop-blur-sm border border-white/60 rounded-2xl opacity-75 grayscale-[0.4] shadow-sm flex flex-col gap-2"
                            >
                                <h4 className="font-bold text-gray-700 line-through decoration-gray-400">
                                    {task.title}
                                </h4>

                                {/* Subtarefas na coluna concluída */}
                                {task.subtasks?.length > 0 && (
                                    <div className="text-xs text-gray-400 flex items-center gap-1.5">
                                        <CheckCircle2 size={12} className="text-emerald-400" />
                                        {task.subtasks.filter(s => s.completedAt).length}/{task.subtasks.length} subtarefas
                                    </div>
                                )}

                                {task.notes && (
                                    <p className="text-sm text-gray-500 bg-white/50 p-3 rounded-xl border border-white flex items-start gap-2">
                                        <StickyNote size={14} className="mt-0.5 shrink-0" />
                                        {task.notes}
                                    </p>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

function PostItCard({ task, theme, delay, onComplete }) {
    const [notes, setNotes] = useState('');

    const completedSubtasks = task.subtasks?.filter(s => s.completedAt).length || 0;
    const totalSubtasks = task.subtasks?.length || 0;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20, rotate: -2 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ delay, type: 'spring', bounce: 0.3 }}
            className={`relative p-6 rounded-2xl border backdrop-blur-md shadow-lg transition-transform hover:-translate-y-1 hover:shadow-xl flex flex-col gap-4 ${theme}`}
        >
            <div>
                <h4 className="text-lg font-bold text-gray-800 leading-tight">{task.title}</h4>
                {task.description && <p className="text-sm text-gray-600 mt-2">{task.description}</p>}
            </div>

            <div className="text-xs font-semibold text-gray-500 bg-white/40 w-fit px-3 py-1.5 rounded-lg border border-white/50 flex items-center gap-2">
                <Clock size={14} />
                {format(parseISO(task.dueDate), "dd/MM 'às' HH:mm", { locale: ptBR })}
            </div>

            {/* Subtarefas */}
            {totalSubtasks > 0 && (
                <div className="bg-white/50 rounded-xl p-3 border border-white/60 space-y-1">
                    {/* Progresso */}
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                        <span className="font-bold uppercase tracking-wider">Subtarefas</span>
                        <span className="font-bold">
                            <span className="text-emerald-600">{completedSubtasks}</span>
                            <span className="text-gray-400">/{totalSubtasks}</span>
                        </span>
                    </div>
                    <div className="h-1 bg-gray-200 rounded-full overflow-hidden mb-2">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${totalSubtasks === 0 ? 0 : (completedSubtasks / totalSubtasks) * 100}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            className="h-full bg-gradient-to-r from-purple-400 to-emerald-400 rounded-full"
                        />
                    </div>

                    {/* Lista */}
                    {task.subtasks.map((sub, i) => (
                        <div key={sub.id}>
                            <SubtaskRow sub={sub} />
                            {i < task.subtasks.length - 1 && (
                                <div className="h-px bg-gray-100 ml-6" />
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Notas do Post-it */}
            <div className="mt-1 relative group">
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Adicionar observações finais..."
                    className="w-full bg-white/50 hover:bg-white/80 focus:bg-white border border-white/40 focus:border-white rounded-xl p-3 text-sm text-gray-700 outline-none resize-none h-20 transition-all shadow-inner placeholder:text-gray-400"
                />
                <StickyNote size={16} className="absolute top-3 right-3 text-gray-400 opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>

            <button
                onClick={() => onComplete({ completedAt: new Date().toISOString(), notes })}
                className="w-full mt-1 py-3 bg-gray-900 text-white rounded-xl hover:bg-black transition-all font-bold text-sm shadow-md flex justify-center items-center gap-2 active:scale-95"
            >
                <CheckCircle2 size={18} />
                Finalizar Tarefa
            </button>
        </motion.div>
    );
}