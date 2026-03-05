import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, CheckCircle2, ListTodo, BotMessageSquare, Loader2, Plus, Settings, Trash2, Pencil, X, Check, LogOut } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from './Toast';
import { useAuth } from '../contexts/AuthContext';

const COLOR_OPTIONS = ['purple', 'blue', 'emerald', 'orange', 'pink', 'gray'];
const groupDotColors = {
    purple: 'bg-purple-500', blue: 'bg-blue-500', emerald: 'bg-emerald-500',
    orange: 'bg-orange-500', pink: 'bg-pink-500', gray: 'bg-gray-500'
};

export function Sidebar({ isOpen, onClose }) {
    const qc = useQueryClient();
    const toast = useToast();
    const { user, logout } = useAuth();
    const [showGroupManager, setShowGroupManager] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupColor, setNewGroupColor] = useState('purple');
    const [editingGroup, setEditingGroup] = useState(null);

    const { data: groups = [], isLoading } = useQuery({
        queryKey: ['groups'],
        queryFn: async () => (await api.get('/groups')).data
    });

    const createGroupMutation = useMutation({
        mutationFn: async () => (await api.post('/groups', { name: newGroupName, color: newGroupColor })).data,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['groups'] });
            setNewGroupName('');
            toast({ message: 'Grupo criado!', type: 'success' });
        },
        onError: () => toast({ message: 'Erro ao criar grupo', type: 'error' })
    });

    const editGroupMutation = useMutation({
        mutationFn: async ({ id, name, color }) => (await api.put(`/groups/${id}`, { name, color })).data,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['groups'] });
            setEditingGroup(null);
            toast({ message: 'Grupo atualizado!', type: 'success' });
        }
    });

    const deleteGroupMutation = useMutation({
        mutationFn: async (id) => (await api.delete(`/groups/${id}`)).data,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['groups'] });
            qc.invalidateQueries({ queryKey: ['tasks'] });
            toast({ message: 'Grupo removido', type: 'info' });
        }
    });

    const navItems = [
        { path: '/', label: 'Meu Dia', icon: LayoutDashboard },
        { path: '/pendentes', label: 'A Fazer', icon: ListTodo },
        { path: '/concluidas', label: 'Histórico', icon: CheckCircle2 },
        { path: '/assistente', label: 'Assistente IA', icon: BotMessageSquare },
    ];

    return (
        <>
            {/* Overlay Mobile */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[50] md:hidden"
                    />
                )}
            </AnimatePresence>

            <aside className={`w-64 bg-white/90 md:bg-white/40 backdrop-blur-xl border-r border-white/60 h-screen fixed left-0 top-0 flex flex-col p-6 shadow-xl shadow-purple-900/5 z-[60] overflow-y-auto transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>

                {/* Logo e Fechar Mobile */}
                <div className="flex items-center justify-between mb-8 mt-2 px-2">
                    <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                        Agenda <span className="text-purple-600">.</span>
                    </h1>
                    <button onClick={onClose} className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-xl">
                        <X size={20} />
                    </button>
                </div>

                {/* Nav principal */}
                <nav className="flex flex-col gap-2 mb-8">
                    <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Principal</p>
                    {navItems.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/'}
                            onClick={() => onClose && onClose()}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold transition-all duration-300 ${isActive
                                    ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/30 -translate-y-0.5'
                                    : 'text-gray-500 hover:bg-white/60 hover:text-purple-600'
                                }`
                            }
                        >
                            <item.icon size={20} />{item.label}
                        </NavLink>
                    ))}
                </nav>

                {/* Grupos */}
                <nav className="flex flex-col gap-2 flex-1">
                    <div className="px-4 flex items-center justify-between mb-2">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Meus Grupos</p>
                        <button
                            onClick={() => setShowGroupManager(true)}
                            className="p-1 hover:bg-gray-200 rounded-lg transition-colors text-gray-400 hover:text-gray-700"
                        >
                            <Settings size={14} />
                        </button>
                    </div>

                    {isLoading && <Loader2 size={16} className="animate-spin mx-auto text-gray-400" />}

                    {groups.map(group => (
                        <NavLink
                            key={group.id}
                            to={`/grupo/${group.id}`}
                            onClick={() => onClose && onClose()}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium transition-all duration-300 ${isActive
                                    ? 'bg-white shadow-sm text-gray-900 border border-white/60 scale-105'
                                    : 'text-gray-500 hover:bg-white/40 hover:text-gray-800'
                                }`
                            }
                        >
                            <span className={`w-2.5 h-2.5 rounded-full shadow-sm ${groupDotColors[group.color] || 'bg-gray-400'}`} />
                            <span className="truncate flex-1">{group.name}</span>
                            {group._count && <span className="text-xs text-gray-400">{group._count.tasks}</span>}
                        </NavLink>
                    ))}

                    {!isLoading && groups.length === 0 && (
                        <p className="px-4 text-xs text-gray-400 italic">Nenhum grupo.</p>
                    )}

                    <button
                        onClick={() => setShowGroupManager(true)}
                        className="mt-2 flex items-center gap-2 px-4 py-2.5 rounded-xl text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-all text-sm font-semibold"
                    >
                        <Plus size={16} />Novo Grupo
                    </button>
                </nav>

                {/* Usuário + Logout */}
                <div className="mt-auto pt-4 border-t border-white/40 space-y-2">
                    <div className="flex items-center gap-3 px-2 py-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                            {user?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-800 truncate">{user?.name}</p>
                            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all text-sm font-semibold"
                    >
                        <LogOut size={16} /> Sair
                    </button>
                </div>
            </aside>

            {/* Modal de gerenciamento de grupos */}
            <AnimatePresence>
                {showGroupManager && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowGroupManager(false)}
                            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[70]"
                        />
                        <motion.div
                            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                            className="fixed left-0 md:left-64 top-0 h-full w-full max-w-sm bg-white shadow-2xl z-[71] flex flex-col overflow-hidden"
                        >
                            <div className="p-6 border-b flex items-center justify-between">
                                <h2 className="text-lg font-black text-gray-900">Gerenciar Grupos</h2>
                                <button onClick={() => setShowGroupManager(false)} className="p-2 hover:bg-gray-100 rounded-xl">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {groups.map(group => (
                                    <div key={group.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                        {editingGroup?.id === group.id ? (
                                            <div className="flex-1 space-y-2">
                                                <input
                                                    value={editingGroup.name}
                                                    onChange={e => setEditingGroup({ ...editingGroup, name: e.target.value })}
                                                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-purple-400"
                                                />
                                                <div className="flex gap-1">
                                                    {COLOR_OPTIONS.map(c => (
                                                        <button
                                                            key={c}
                                                            onClick={() => setEditingGroup({ ...editingGroup, color: c })}
                                                            className={`w-5 h-5 rounded-full ${groupDotColors[c]} border-2 ${editingGroup.color === c ? 'border-gray-800' : 'border-transparent'}`}
                                                        />
                                                    ))}
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => editGroupMutation.mutate(editingGroup)}
                                                        className="px-3 py-1 bg-purple-600 text-white rounded-lg text-xs font-bold"
                                                    >
                                                        <Check size={12} />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingGroup(null)}
                                                        className="px-3 py-1 bg-gray-200 rounded-lg text-xs"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <span className={`w-3 h-3 rounded-full ${groupDotColors[group.color]}`} />
                                                <span className="flex-1 font-semibold text-sm text-gray-700 truncate">{group.name}</span>
                                                <span className="text-xs text-gray-400">{group._count?.tasks || 0}</span>
                                                <button
                                                    onClick={() => setEditingGroup({ id: group.id, name: group.name, color: group.color })}
                                                    className="p-1.5 hover:bg-gray-200 rounded-lg"
                                                >
                                                    <Pencil size={12} />
                                                </button>
                                                <button
                                                    onClick={() => setConfirmDeleteId(group.id)}
                                                    className="p-1.5 hover:bg-red-100 rounded-lg text-red-500"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="p-4 border-t space-y-3">
                                <input
                                    value={newGroupName}
                                    onChange={e => setNewGroupName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && newGroupName.trim() && createGroupMutation.mutate()}
                                    placeholder="Nome do novo grupo..."
                                    className="w-full px-4 py-3 border border-gray-200 focus:border-purple-400 rounded-xl text-sm outline-none"
                                />
                                <div className="flex gap-2">
                                    {COLOR_OPTIONS.map(c => (
                                        <button
                                            key={c}
                                            onClick={() => setNewGroupColor(c)}
                                            className={`w-7 h-7 rounded-full ${groupDotColors[c]} border-2 transition-all ${newGroupColor === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                                        />
                                    ))}
                                </div>
                                <button
                                    onClick={() => newGroupName.trim() && createGroupMutation.mutate()}
                                    disabled={!newGroupName.trim() || createGroupMutation.isPending}
                                    className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {createGroupMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={18} />}
                                    Criar Grupo
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
            {confirmDeleteId && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4" onClick={() => setConfirmDeleteId(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-black text-gray-900 mb-2">Deletar grupo?</h3>
                        <p className="text-sm text-gray-500 mb-6">As tarefas do grupo não serão apagadas.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-semibold hover:bg-gray-200 transition-colors">
                                Cancelar
                            </button>
                            <button onClick={() => { deleteGroupMutation.mutate(confirmDeleteId); setConfirmDeleteId(null); }} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors">
                                Deletar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}