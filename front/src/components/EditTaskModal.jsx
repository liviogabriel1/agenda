import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Plus, Trash2, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from './Toast';

const recurrenceOptions = [
    { value: '', label: 'Sem recorrência' },
    { value: 'daily', label: 'Todo dia' },
    { value: 'weekly', label: 'Toda semana' },
    { value: 'monthly', label: 'Todo mês' },
];

export function EditTaskModal({ task, onClose }) {
    const qc = useQueryClient();
    const toast = useToast();
    const { data: groups = [] } = useQuery({ queryKey: ['groups'], queryFn: async () => (await api.get('/groups')).data });

    const [form, setForm] = useState({
        title: task.title,
        description: task.description || '',
        dueDate: task.dueDate ? task.dueDate.slice(0, 16) : '',
        groupId: task.groupId || '',
        recurrence: task.recurrence || '',
    });
    const [newSubtask, setNewSubtask] = useState('');

    const updateMutation = useMutation({
        mutationFn: async (data) => (await api.put(`/tasks/${task.id}`, data)).data,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['tasks'] });
            toast({ message: 'Tarefa atualizada!', type: 'success' });
            onClose();
        },
        onError: () => toast({ message: 'Erro ao atualizar', type: 'error' })
    });

    const addSubtaskMutation = useMutation({
        mutationFn: async (title) => (await api.post(`/tasks/${task.id}/subtasks`, { title })).data,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); setNewSubtask(''); }
    });

    const toggleSubtaskMutation = useMutation({
        mutationFn: async (id) => (await api.patch(`/subtasks/${id}/toggle`)).data,
        onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] })
    });

    const deleteSubtaskMutation = useMutation({
        mutationFn: async (id) => (await api.delete(`/subtasks/${id}`)).data,
        onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] })
    });

    const groupColors = {
        purple: 'border-purple-400 bg-purple-50', blue: 'border-blue-400 bg-blue-50',
        emerald: 'border-emerald-400 bg-emerald-50', orange: 'border-orange-400 bg-orange-50',
        pink: 'border-pink-400 bg-pink-50', gray: 'border-gray-400 bg-gray-50',
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={e => e.stopPropagation()}
                    className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
                >
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="text-xl font-black text-gray-900">Editar Tarefa</h2>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                            <X size={20} className="text-gray-500" />
                        </button>
                    </div>

                    <div className="p-6 space-y-5">
                        {/* Título */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Título</label>
                            <input
                                value={form.title}
                                onChange={e => setForm({ ...form, title: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-purple-400 rounded-xl outline-none font-semibold text-gray-800 transition-colors"
                            />
                        </div>

                        {/* Descrição */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Descrição</label>
                            <textarea
                                value={form.description}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                                rows={3}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-purple-400 rounded-xl outline-none text-sm text-gray-700 resize-none transition-colors"
                            />
                        </div>

                        {/* Data e Recorrência */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Data</label>
                                <input
                                    type="datetime-local"
                                    value={form.dueDate}
                                    onChange={e => setForm({ ...form, dueDate: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-purple-400 rounded-xl outline-none text-sm transition-colors"
                                />
                            </div>
                            <div>
                                <label className="flex items-center gap-1 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                    <RefreshCw size={11} /> Recorrência
                                </label>
                                <select
                                    value={form.recurrence}
                                    onChange={e => setForm({ ...form, recurrence: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-purple-400 rounded-xl outline-none text-sm transition-colors"
                                >
                                    {recurrenceOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Grupo */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Grupo</label>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, groupId: '' })}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${!form.groupId ? 'border-gray-500 bg-gray-100' : 'border-gray-200 bg-white text-gray-500'}`}
                                >
                                    Nenhum
                                </button>
                                {groups.map(g => (
                                    <button
                                        key={g.id}
                                        type="button"
                                        onClick={() => setForm({ ...form, groupId: g.id })}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${form.groupId === g.id ? groupColors[g.color] : 'border-transparent bg-gray-100 text-gray-500'}`}
                                    >
                                        {g.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Subtarefas */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Subtarefas</label>
                            <div className="space-y-2 mb-3">
                                {task.subtasks?.map(sub => (
                                    <div key={sub.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                        <button onClick={() => toggleSubtaskMutation.mutate(sub.id)} className="shrink-0">
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${sub.completedAt ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'}`}>
                                                {sub.completedAt && <span className="text-white text-xs">✓</span>}
                                            </div>
                                        </button>
                                        <span className={`flex-1 text-sm ${sub.completedAt ? 'line-through text-gray-400' : 'text-gray-700'}`}>{sub.title}</span>
                                        <button onClick={() => deleteSubtaskMutation.mutate(sub.id)} className="p-1 hover:bg-red-100 rounded-lg transition-colors">
                                            <Trash2 size={14} className="text-red-400" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    value={newSubtask}
                                    onChange={e => setNewSubtask(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && newSubtask.trim() && addSubtaskMutation.mutate(newSubtask.trim())}
                                    placeholder="Adicionar subtarefa..."
                                    className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-purple-400 rounded-xl outline-none text-sm transition-colors"
                                />
                                <button
                                    onClick={() => newSubtask.trim() && addSubtaskMutation.mutate(newSubtask.trim())}
                                    className="px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 border-t border-gray-100 flex gap-3">
                        <button onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-semibold hover:bg-gray-200 transition-colors">
                            Cancelar
                        </button>
                        <button
                            onClick={() => updateMutation.mutate(form)}
                            disabled={updateMutation.isPending}
                            className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                            <Save size={18} />
                            Salvar
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}