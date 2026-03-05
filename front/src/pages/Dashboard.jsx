import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import {
    BrainCircuit, Plus, Loader2, Target, CheckCircle2, List,
    FolderOpen, X, Calendar, Search, ArrowUpDown, Clock
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { TaskCard } from '../components/TaskCard';
import { useToast } from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';

export function Dashboard() {
    const queryClient = useQueryClient();
    const toast = useToast();
    const { user } = useAuth();

    // Estados de Controle
    const [filter, setFilter] = useState('pending');
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('dueDate');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showDescription, setShowDescription] = useState(false);
    const datePickerRef = useRef(null);

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    // Estado do Formulário
    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        dueDate: today,
        dueTime: '',
        groupId: ''
    });

    // Fechar datepicker ao clicar fora
    useEffect(() => {
        function handleClickOutside(e) {
            if (datePickerRef.current && !datePickerRef.current.contains(e.target)) {
                setShowDatePicker(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Queries
    const { data: taskData = {}, isLoading: loadingTasks } = useQuery({
        queryKey: ['tasks', search, sortBy],
        queryFn: async () => (await api.get('/tasks', { params: { search, sortBy } })).data
    });

    const tasks = Array.isArray(taskData) ? taskData : (taskData.tasks ?? []);

    const { data: groups = [] } = useQuery({
        queryKey: ['groups'],
        queryFn: async () => (await api.get('/groups')).data
    });

    // Mutations
    const createTaskMutation = useMutation({
        mutationFn: async (taskData) => (await api.post('/tasks', taskData)).data,
        onSuccess: () => {
            setNewTask({ title: '', description: '', dueDate: today, dueTime: '', groupId: '' });
            setShowDescription(false);
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

    // Handlers
    const handleInitiateTaskCreation = (e) => {
        e.preventDefault();
        if (newTask.title && newTask.dueDate) setIsDrawerOpen(true);
    };

    const confirmAndCreateTask = (selectedGroupId) => {
        const timeString = newTask.dueTime ? `${newTask.dueTime}:00` : '23:59:00';
        const baseDate = newTask.dueDate.split('T')[0];
        const finalDueDate = `${baseDate}T${timeString}`;

        createTaskMutation.mutate({
            ...newTask,
            groupId: selectedGroupId || null,
            dueDate: finalDueDate
        });
    };

    const handleDaySelect = (date) => {
        if (!date) return;
        setNewTask({ ...newTask, dueDate: format(date, 'yyyy-MM-dd') });
        setShowDatePicker(false);
    };

    // Helpers de UI
    const selectedDate = newTask.dueDate ? parseISO(`${newTask.dueDate}T00:00:00`) : undefined;
    const isCustomDate = newTask.dueDate && newTask.dueDate !== today && newTask.dueDate !== tomorrow;
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
                            <span className="text-sm font-bold text-red-500">
                                <span className="text-gray-300 mx-2">·</span>
                                ⚠ {overdueCount} atrasada{overdueCount > 1 ? 's' : ''}
                            </span>
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
                        <div className="flex-1 flex flex-col gap-2">
                            <input
                                type="text"
                                placeholder="O que você precisa fazer?"
                                value={newTask.title}
                                onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                                className="w-full px-5 py-4 bg-white/60 border border-white/40 focus:border-purple-400 rounded-2xl outline-none font-bold text-gray-800 placeholder:text-gray-400 text-lg shadow-sm"
                                required
                            />

                            <AnimatePresence>
                                {showDescription && (
                                    <motion.textarea
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: '80px', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        placeholder="Adicionar descrição (opcional)..."
                                        value={newTask.description}
                                        onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                                        className="w-full px-5 py-3 bg-white/40 border border-white/40 focus:border-purple-400 rounded-xl outline-none text-sm font-medium text-gray-700 resize-none"
                                    />
                                )}
                            </AnimatePresence>
                        </div>

                        <button
                            type="submit"
                            className="px-6 py-4 bg-gray-900 text-white rounded-2xl hover:bg-gray-800 transition-colors flex items-center justify-center shadow-md shrink-0 h-[62px]"
                        >
                            <Plus size={24} />
                        </button>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            type="button"
                            onClick={() => setShowDescription(!showDescription)}
                            className={`px-4 py-2 text-xs rounded-xl font-bold transition-all shadow-sm ${showDescription ? 'bg-gray-200 text-gray-800' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                        >
                            {showDescription ? 'Remover descrição' : '+ Descrição'}
                        </button>

                        <div className="h-4 w-px bg-gray-300 mx-1" />

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
                                        className="absolute left-0 top-12 z-[100] bg-white rounded-2xl shadow-2xl border border-gray-100 p-3"
                                    >
                                        <DayPicker
                                            mode="single"
                                            selected={selectedDate}
                                            onSelect={handleDaySelect}
                                            locale={ptBR}
                                            disabled={{ before: new Date() }}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="flex items-center gap-1.5 bg-white border border-gray-100 hover:border-purple-200 px-3 py-2 rounded-xl shadow-sm transition-colors">
                            <Clock size={14} className={newTask.dueTime ? 'text-purple-600' : 'text-gray-400'} />
                            <input
                                type="time"
                                value={newTask.dueTime}
                                onChange={e => setNewTask({ ...newTask, dueTime: e.target.value })}
                                className="bg-transparent text-xs font-bold text-gray-600 outline-none cursor-pointer w-[70px]"
                            />
                        </div>
                    </div>
                </form>
            </section>

            {/* ── Filtros e Lista ───────────────────────────────────────────── */}
            <section className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex gap-2 p-1 bg-gray-200/50 rounded-xl w-full sm:w-fit">
                        {['pending', 'all', 'completed'].map(id => (
                            <button
                                key={id}
                                onClick={() => setFilter(id)}
                                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${filter === id ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                {id === 'pending' ? 'Pendentes' : id === 'all' ? 'Todas' : 'Concluídas'}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Buscar..."
                                className="pl-9 pr-4 py-2 bg-white/70 border rounded-xl outline-none text-sm w-44 transition-all focus:w-56"
                            />
                        </div>
                        <select
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value)}
                            className="pl-3 pr-8 py-2 bg-white/70 border rounded-xl outline-none text-sm cursor-pointer"
                        >
                            <option value="dueDate">Data</option>
                            <option value="title">Nome</option>
                            <option value="createdAt">Recentes</option>
                        </select>
                    </div>
                </div>

                {loadingTasks ? (
                    <div className="flex justify-center py-12"><Loader2 className="text-purple-500 animate-spin" /></div>
                ) : filteredTasks.length === 0 ? (
                    <motion.div
                        key={filter}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-16 bg-white/40 backdrop-blur-md rounded-3xl border border-dashed border-purple-200"
                    >
                        {filter === 'pending' && (
                            <>
                                <p className="text-4xl mb-3">✨</p>
                                <p className="text-gray-700 font-bold text-lg">Nenhuma tarefa pendente</p>
                                <p className="text-gray-400 text-sm mt-1">Use o campo acima para criar sua primeira tarefa.</p>
                            </>
                        )}
                        {filter === 'completed' && (
                            <>
                                <p className="text-4xl mb-3">🎯</p>
                                <p className="text-gray-700 font-bold text-lg">Nenhuma tarefa concluída ainda</p>
                                <p className="text-gray-400 text-sm mt-1">Conclua suas tarefas pendentes para vê-las aqui.</p>
                            </>
                        )}
                        {filter === 'all' && (
                            <>
                                <p className="text-4xl mb-3">📋</p>
                                <p className="text-gray-700 font-bold text-lg">Nenhuma tarefa encontrada</p>
                                <p className="text-gray-400 text-sm mt-1">Comece criando sua primeira tarefa acima.</p>
                            </>
                        )}
                    </motion.div>
                ) : (
                    <div className="flex flex-col gap-4">
                        <AnimatePresence mode="popLayout">
                            {filteredTasks.map(task => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                    onComplete={(id, data) => completeTaskMutation.mutate({ id, data })}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </section>

            {/* ── Drawer de Categorias ────────────────────────────────────────── */}
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
                            className="fixed right-0 top-0 h-full w-full max-w-sm bg-white/90 backdrop-blur-xl border-l z-50 p-8 flex flex-col"
                        >
                            <button onClick={() => setIsDrawerOpen(false)} className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full"><X size={20} /></button>
                            <h2 className="text-2xl font-black text-gray-800 mt-8 mb-2">Ótima tarefa! 🎯</h2>
                            <p className="text-gray-500 mb-8">Onde você quer guardar <strong>"{newTask.title}"</strong>?</p>
                            <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
                                {groups.map(group => (
                                    <button
                                        key={group.id}
                                        onClick={() => confirmAndCreateTask(group.id)}
                                        className={`flex items-center gap-4 p-4 rounded-2xl border text-left transition-all ${groupColors[group.color]}`}
                                    >
                                        <FolderOpen size={20} />
                                        <span className="font-bold text-lg">{group.name}</span>
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => confirmAndCreateTask('')}
                                className="mt-8 w-full py-4 text-gray-500 font-bold rounded-xl hover:bg-gray-100"
                            >
                                Salvar sem categoria
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}