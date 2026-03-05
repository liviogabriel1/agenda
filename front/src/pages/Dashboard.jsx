import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { BrainCircuit, Plus, Loader2, Target, CheckCircle2, List, FolderOpen, X, Calendar, Search, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { TaskCard } from '../components/TaskCard';
import { useToast } from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';

export function Dashboard() {
    const queryClient = useQueryClient();
    const toast = useToast();
    const { user } = useAuth();
    const [filter, setFilter] = useState('pending');
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('dueDate');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const datePickerRef = useRef(null);

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const [newTask, setNewTask] = useState({ title: '', description: '', dueDate: today, groupId: '' });

    useEffect(() => {
        function handleClickOutside(e) {
            if (datePickerRef.current && !datePickerRef.current.contains(e.target)) {
                setShowDatePicker(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const { data: taskData = {}, isLoading: loadingTasks } = useQuery({
        queryKey: ['tasks', search, sortBy],
        queryFn: async () => (await api.get('/tasks', { params: { search, sortBy } })).data
    });

    const tasks = Array.isArray(taskData) ? taskData : (taskData.tasks ?? []);

    const { data: groups = [] } = useQuery({
        queryKey: ['groups'],
        queryFn: async () => (await api.get('/groups')).data
    });

    const createTaskMutation = useMutation({
        mutationFn: async (taskData) => (await api.post('/tasks', taskData)).data,
        onSuccess: () => {
            setNewTask({ title: '', description: '', dueDate: today, groupId: '' });
            setIsDrawerOpen(false);
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            toast({ message: 'Tarefa criada com sucesso!', type: 'success' });
        },
        onError: () => toast({ message: 'Erro ao criar tarefa', type: 'error' })
    });

    const completeTaskMutation = useMutation({
        mutationFn: async ({ id, data }) => (await api.patch(`/tasks/${id}/complete`, data)).data,
        onSuccess: () => {
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            toast({ message: 'Tarefa concluída! 🎉', type: 'success' });
        }
    });

    const analyzeMutation = useMutation({
        mutationFn: async () => (await api.post('/tasks/analyze')).data,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            toast({ message: data.message || 'Análise concluída!', type: 'success' });
        },
        onError: () => toast({ message: 'Erro na análise IA', type: 'error' })
    });

    const handleInitiateTaskCreation = (e) => {
        e.preventDefault();
        if (newTask.title && newTask.dueDate) setIsDrawerOpen(true);
    };

    const confirmAndCreateTask = (selectedGroupId) => {
        const finalDueDate = newTask.dueDate.includes('T')
            ? newTask.dueDate
            : `${newTask.dueDate}T23:59:00`;
        createTaskMutation.mutate({ ...newTask, groupId: selectedGroupId, dueDate: finalDueDate });
    };

    const handleDaySelect = (date) => {
        if (!date) return;
        setNewTask({ ...newTask, dueDate: format(date, 'yyyy-MM-dd') });
        setShowDatePicker(false);
    };

    const selectedDate = newTask.dueDate ? parseISO(`${newTask.dueDate}T00:00:00`) : undefined;

    const getDateLabel = () => {
        if (!newTask.dueDate) return 'Escolher data';
        if (newTask.dueDate === today) return null;
        if (newTask.dueDate === tomorrow) return null;
        return format(parseISO(`${newTask.dueDate}T00:00:00`), "dd 'de' MMM", { locale: ptBR });
    };

    const completedTasks = tasks.filter(t => t.completedAt).length;
    const progressPercentage = tasks.length === 0 ? 0 : Math.round((completedTasks / tasks.length) * 100);
    const overdueCount = tasks.filter(t => !t.completedAt && new Date(t.dueDate) < new Date()).length;

    const filteredTasks = tasks.filter(task => {
        if (filter === 'pending') return !task.completedAt;
        if (filter === 'completed') return task.completedAt;
        return true;
    });

    const groupColors = {
        purple: 'bg-purple-100 text-purple-700 border-purple-200',
        blue: 'bg-blue-100 text-blue-700 border-blue-200',
        emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        orange: 'bg-orange-100 text-orange-700 border-orange-200',
        pink: 'bg-pink-100 text-pink-700 border-pink-200',
        gray: 'bg-gray-100 text-gray-700 border-gray-200',
    };

    const isCustomDate = newTask.dueDate && newTask.dueDate !== today && newTask.dueDate !== tomorrow;

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-12 relative">

            {/* ── Header ─────────────────────────────────────────────────────── */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white/40 backdrop-blur-xl border border-white/60 p-8 rounded-3xl shadow-xl shadow-purple-900/5">
                <div>
                    <h2 className="text-purple-600 font-bold tracking-wide uppercase text-sm mb-1">Bem-vindo, {user?.name}!</h2>
                    <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                        Seu Dia <span className="text-pink-500">.</span>
                    </h1>
                    <div className="flex items-center gap-4 mt-3">
                        <span className="text-sm text-gray-500 font-medium">
                            <strong className="text-gray-800">{tasks.filter(t => !t.completedAt).length}</strong> pendentes
                        </span>
                        <span className="text-gray-300">·</span>
                        <span className="text-sm text-gray-500 font-medium">
                            <strong className="text-emerald-600">{completedTasks}</strong> concluídas
                        </span>
                        {overdueCount > 0 && (
                            <>
                                <span className="text-gray-300">·</span>
                                <span className="text-sm font-bold text-red-500">
                                    ⚠ {overdueCount} atrasada{overdueCount > 1 ? 's' : ''}
                                </span>
                            </>
                        )}
                    </div>
                    <div className="mt-5 w-full max-w-xs">
                        <div className="flex justify-between text-sm mb-2 font-medium text-gray-600">
                            <span>Progresso Diário</span>
                            <span>{progressPercentage}%</span>
                        </div>
                        <div className="h-2.5 w-full bg-gray-200/80 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPercentage}%` }}
                                transition={{ duration: 1, ease: 'easeOut' }}
                                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                            />
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => analyzeMutation.mutate()}
                    disabled={analyzeMutation.isPending || tasks.length === 0}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-semibold shadow-lg shadow-purple-500/30 hover:-translate-y-1 transition-all disabled:opacity-50"
                >
                    {analyzeMutation.isPending ? <Loader2 size={20} className="animate-spin" /> : <BrainCircuit size={20} />}
                    {analyzeMutation.isPending ? 'Analisando...' : 'Analisar com IA'}
                </button>
            </header>

            {/* ── Formulário de nova tarefa ───────────────────────────────────── */}
            <section className="bg-white/60 backdrop-blur-lg p-4 rounded-3xl shadow-sm border border-white/50 flex flex-col gap-4 overflow-visible relative z-20">
                <form onSubmit={handleInitiateTaskCreation} className="flex flex-col gap-3">
                    <div className="flex flex-col md:flex-row gap-3">
                        <input
                            type="text"
                            placeholder="O que você precisa fazer?"
                            value={newTask.title}
                            onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                            className="flex-1 px-5 py-4 bg-white/60 border border-white/40 focus:border-purple-400 rounded-2xl outline-none font-bold text-gray-800 placeholder:text-gray-400 placeholder:font-medium transition-all shadow-sm text-lg"
                            required
                        />
                        <button
                            type="submit"
                            className="px-6 py-4 bg-gray-900 text-white rounded-2xl hover:bg-gray-800 transition-colors flex items-center justify-center shadow-md shrink-0"
                        >
                            <Plus size={24} />
                        </button>
                    </div>

                    {/* Pílulas de data */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            type="button"
                            onClick={() => setNewTask({ ...newTask, dueDate: today })}
                            className={`px-4 py-2 text-xs rounded-xl font-bold transition-all shadow-sm ${newTask.dueDate === today ? 'bg-purple-600 text-white' : 'bg-white hover:bg-purple-50 text-gray-600'}`}
                        >
                            Hoje
                        </button>
                        <button
                            type="button"
                            onClick={() => setNewTask({ ...newTask, dueDate: tomorrow })}
                            className={`px-4 py-2 text-xs rounded-xl font-bold transition-all shadow-sm ${newTask.dueDate === tomorrow ? 'bg-indigo-600 text-white' : 'bg-white hover:bg-indigo-50 text-gray-600'}`}
                        >
                            Amanhã
                        </button>

                        <div className="relative" ref={datePickerRef}>
                            <button
                                type="button"
                                onClick={() => setShowDatePicker(v => !v)}
                                className={`px-4 py-2 text-xs rounded-xl font-bold transition-all shadow-sm flex items-center gap-2 ${isCustomDate ? 'bg-pink-500 text-white' : 'bg-white hover:bg-pink-50 text-gray-600'}`}
                            >
                                <Calendar size={14} />
                                {isCustomDate
                                    ? format(parseISO(`${newTask.dueDate}T00:00:00`), "dd 'de' MMM", { locale: ptBR })
                                    : 'Escolher data'
                                }
                            </button>

                            <AnimatePresence>
                                {showDatePicker && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8, scale: 0.97 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 8, scale: 0.97 }}
                                        transition={{ duration: 0.15, ease: 'easeOut' }}
                                        className="absolute right-0 sm:left-0 sm:right-auto top-12 z-[100] bg-white rounded-2xl shadow-2xl shadow-purple-900/15 border border-gray-100 overflow-hidden w-[290px] sm:w-[300px] max-w-[90vw]"
                                    >
                                        <div className="px-4 pt-4 pb-2 border-b border-gray-100">
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Escolher data</p>
                                        </div>

                                        {/* Atalhos rápidos */}
                                        <div className="flex gap-2 px-4 py-3 border-b border-gray-100">
                                            {[
                                                { label: 'Hoje', date: new Date() },
                                                { label: 'Amanhã', date: new Date(Date.now() + 86400000) },
                                                { label: 'Próx. semana', date: new Date(Date.now() + 7 * 86400000) },
                                            ].map(({ label, date }) => (
                                                <button
                                                    key={label}
                                                    type="button"
                                                    onClick={() => handleDaySelect(date)}
                                                    className="flex-1 py-1.5 text-xs font-bold bg-gray-50 hover:bg-purple-50 hover:text-purple-700 rounded-xl transition-colors text-gray-600"
                                                >
                                                    {label}
                                                </button>
                                            ))}
                                        </div>

                                        {/* DayPicker customizado */}
                                        <div className="p-3">
                                            <style>{`
                                                .rdp { --rdp-accent-color: #9333ea; --rdp-background-color: #f3e8ff; margin: 0; }
                                                .rdp-months { justify-content: center; }
                                                .rdp-month { width: 100%; }
                                                .rdp-table { width: 100%; }
                                                .rdp-head_cell { font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; padding: 4px 0; }
                                                .rdp-cell { padding: 2px; }
                                                .rdp-button { width: 36px; height: 36px; border-radius: 10px; font-size: 13px; font-weight: 600; transition: all 0.15s; }
                                                .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background: #f3e8ff; color: #9333ea; }
                                                .rdp-day_selected { background: #9333ea !important; color: white !important; font-weight: 700; box-shadow: 0 4px 12px rgba(147,51,234,0.35); }
                                                .rdp-day_today:not(.rdp-day_selected) { color: #9333ea; font-weight: 800; }
                                                .rdp-nav_button { border-radius: 10px; width: 32px; height: 32px; }
                                                .rdp-nav_button:hover { background: #f3e8ff; }
                                                .rdp-caption_label { font-size: 14px; font-weight: 800; color: #1f2937; }
                                            `}</style>
                                            <DayPicker
                                                mode="single"
                                                selected={selectedDate}
                                                onSelect={handleDaySelect}
                                                locale={ptBR}
                                                showOutsideDays
                                                disabled={{ before: new Date() }}
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </form>
            </section>

            {/* ── Filtros, Busca e Ordenação ──────────────────────────────────── */}
            <section className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex gap-2 p-1 bg-gray-200/50 backdrop-blur-sm rounded-xl w-full sm:w-fit overflow-x-auto no-scrollbar">
                        {[
                            { id: 'pending', label: 'Pendentes', icon: Target },
                            { id: 'all', label: 'Todas', icon: List },
                            { id: 'completed', label: 'Concluídas', icon: CheckCircle2 }
                        ].map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setFilter(tab.id)}
                                    className={`relative flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors z-10 ${filter === tab.id ? 'text-purple-700' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    {filter === tab.id && (
                                        <motion.div layoutId="activeTab" className="absolute inset-0 bg-white shadow-sm rounded-lg -z-10" transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }} />
                                    )}
                                    <Icon size={16} />{tab.label}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Buscar..."
                                className="pl-9 pr-4 py-2 bg-white/70 border border-white/60 focus:border-purple-400 rounded-xl outline-none text-sm w-44 transition-all focus:w-56"
                            />
                        </div>
                        <div className="relative">
                            <ArrowUpDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <select
                                value={sortBy}
                                onChange={e => setSortBy(e.target.value)}
                                className="pl-9 pr-3 py-2 bg-white/70 border border-white/60 focus:border-purple-400 rounded-xl outline-none text-sm appearance-none cursor-pointer"
                            >
                                <option value="dueDate">Por data</option>
                                <option value="title">Por nome</option>
                                <option value="createdAt">Mais recentes</option>
                            </select>
                        </div>
                    </div>
                </div>

                {loadingTasks ? (
                    <div className="flex justify-center py-12">
                        <Loader2 size={32} className="text-purple-500 animate-spin" />
                    </div>
                ) : filteredTasks.length === 0 ? (
                    <div className="text-center py-16 bg-white/40 backdrop-blur-md rounded-3xl border border-dashed border-purple-200">
                        <p className="text-gray-500 font-medium">
                            {search ? `Nenhuma tarefa encontrada para "${search}"` : 'Nenhuma tarefa por aqui!'}
                        </p>
                    </div>
                ) : (
                    <motion.div layout className="flex flex-col gap-4">
                        <AnimatePresence mode="popLayout">
                            {filteredTasks.map(task => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                    onComplete={(id, data) => completeTaskMutation.mutate({ id, data })}
                                />
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </section>

            {/* ── Drawer: escolher grupo ──────────────────────────────────────── */}
            <AnimatePresence>
                {isDrawerOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsDrawerOpen(false)}
                            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40"
                        />
                        <motion.div
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
                            className="fixed right-0 top-0 h-full w-full max-w-sm bg-white/90 backdrop-blur-xl border-l border-white shadow-2xl z-50 p-8 flex flex-col overflow-x-hidden"
                        >
                            <button
                                onClick={() => setIsDrawerOpen(false)}
                                className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full hover:bg-gray-200 text-gray-500 transition-colors"
                            >
                                <X size={20} />
                            </button>
                            <h2 className="text-2xl font-black text-gray-800 mt-8 mb-2">Ótima tarefa! 🎯</h2>
                            <p className="text-gray-500 mb-8">
                                Onde você quer guardar <strong>"{newTask.title}"</strong>?
                            </p>
                            <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
                                {groups.map(group => (
                                    <button
                                        key={group.id}
                                        onClick={() => confirmAndCreateTask(group.id)}
                                        className={`flex items-center gap-4 p-4 rounded-2xl border text-left transition-all hover:scale-[1.02] shadow-sm hover:shadow-md ${groupColors[group.color]}`}
                                    >
                                        <div className="p-2 bg-white/50 rounded-xl backdrop-blur-sm">
                                            <FolderOpen size={20} />
                                        </div>
                                        <div>
                                            <span className="font-bold text-lg">{group.name}</span>
                                            {group._count && (
                                                <p className="text-xs opacity-70">{group._count.tasks} tarefas</p>
                                            )}
                                        </div>
                                    </button>
                                ))}
                                {groups.length === 0 && (
                                    <p className="text-sm text-gray-400 italic">Você ainda não tem categorias.</p>
                                )}
                            </div>
                            <div className="mt-8 pt-6 border-t border-gray-200">
                                <button
                                    onClick={() => confirmAndCreateTask('')}
                                    className="w-full py-4 text-gray-500 font-bold rounded-xl hover:bg-gray-100 transition-colors"
                                >
                                    {createTaskMutation.isPending
                                        ? <Loader2 className="animate-spin mx-auto" size={20} />
                                        : 'Pular e salvar sem categoria'
                                    }
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}