import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, Plus, Loader2, Target, CheckCircle2, List } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { TaskCard } from '../components/TaskCard';

export function Dashboard() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [filter, setFilter] = useState('pending'); // 'all', 'pending', 'completed'
    const [newTask, setNewTask] = useState({ title: '', description: '', dueDate: '' });

    const fetchTasks = async () => {
        try {
            const response = await api.get('/tasks');
            setTasks(response.data);
        } catch (error) {
            console.error("Erro ao buscar tarefas:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const handleCreateTask = async (e) => {
        e.preventDefault();
        if (!newTask.title || !newTask.dueDate) return;
        try {
            await api.post('/tasks', newTask);
            setNewTask({ title: '', description: '', dueDate: '' });
            fetchTasks();
        } catch (error) {
            console.error("Erro ao criar tarefa:", error);
        }
    };

    const handleCompleteTask = async (id, data) => {
        try {
            await api.patch(`/tasks/${id}/complete`, data);

            // 🎉 Animação de Confetes da Vitória!
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#a855f7', '#ec4899', '#3b82f6']
            });

            fetchTasks();
        } catch (error) {
            console.error("Erro ao concluir tarefa:", error);
        }
    };

    const handleAnalyze = async () => {
        setAnalyzing(true);
        try {
            await api.post('/tasks/analyze');
            fetchTasks();
        } catch (error) {
            console.error("Erro ao analisar tarefas:", error);
        } finally {
            setAnalyzing(false);
        }
    };

    // Cálculos do Dashboard
    const completedTasks = tasks.filter(t => t.completedAt).length;
    const progressPercentage = tasks.length === 0 ? 0 : Math.round((completedTasks / tasks.length) * 100);

    const filteredTasks = tasks.filter(task => {
        if (filter === 'pending') return !task.completedAt;
        if (filter === 'completed') return task.completedAt;
        return true;
    });

    // Saudação Dinâmica
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 text-gray-800 p-6 md:p-12 font-sans selection:bg-purple-200">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Cabeçalho Premium com Efeito Vidro */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white/40 backdrop-blur-xl border border-white/60 p-8 rounded-3xl shadow-xl shadow-purple-900/5">
                    <div>
                        <h2 className="text-purple-600 font-bold tracking-wide uppercase text-sm mb-1">{greeting}, Lívio!</h2>
                        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                            Seu Dia <span className="text-pink-500">.</span>
                        </h1>

                        {/* Barra de Progresso */}
                        <div className="mt-6 w-full max-w-xs">
                            <div className="flex justify-between text-sm mb-2 font-medium text-gray-600">
                                <span>Progresso Diário</span>
                                <span>{progressPercentage}%</span>
                            </div>
                            <div className="h-2.5 w-full bg-gray-200/80 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progressPercentage}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleAnalyze}
                        disabled={analyzing || tasks.length === 0}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-semibold shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {analyzing ? <Loader2 size={20} className="animate-spin" /> : <BrainCircuit size={20} />}
                        {analyzing ? 'A IA está pensando...' : 'Analisar com IA'}
                    </button>
                </header>

                {/* Formulário Flutuante */}
                <section className="bg-white/60 backdrop-blur-lg p-3 rounded-2xl shadow-sm border border-white/50">
                    <form onSubmit={handleCreateTask} className="flex flex-col md:flex-row gap-2">
                        <input
                            type="text"
                            placeholder="Adicionar nova tarefa..."
                            value={newTask.title}
                            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                            className="flex-1 px-4 py-3 bg-white/50 border border-transparent focus:border-purple-300 rounded-xl outline-none font-medium placeholder:text-gray-400 transition-colors"
                            required
                        />
                        <input
                            type="datetime-local"
                            value={newTask.dueDate}
                            onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                            className="px-4 py-3 bg-white/50 border border-transparent focus:border-purple-300 rounded-xl outline-none text-sm text-gray-600 transition-colors"
                            required
                        />
                        <button type="submit" className="p-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center">
                            <Plus size={24} />
                        </button>
                    </form>
                </section>

                {/* Área de Tarefas */}
                <section className="space-y-6">

                    {/* Abas Animadas */}
                    <div className="flex gap-2 p-1 bg-gray-200/50 backdrop-blur-sm rounded-xl w-fit">
                        {[
                            { id: 'pending', label: 'Pendentes', icon: Target },
                            { id: 'all', label: 'Todas', icon: List },
                            { id: 'completed', label: 'Concluídas', icon: CheckCircle2 }
                        ].map((tab) => {
                            const Icon = tab.icon;
                            const isActive = filter === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setFilter(tab.id)}
                                    className={`relative flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors z-10 ${isActive ? 'text-purple-700' : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute inset-0 bg-white shadow-sm rounded-lg -z-10"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                    <Icon size={16} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Lista de Cards */}
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 size={32} className="text-purple-500 animate-spin" />
                        </div>
                    ) : filteredTasks.length === 0 ? (
                        <div className="text-center py-16 bg-white/40 backdrop-blur-md rounded-3xl border border-dashed border-purple-200">
                            <p className="text-gray-500 font-medium">Nenhuma tarefa nesta categoria. Você está com tudo em dia!</p>
                        </div>
                    ) : (
                        <motion.div layout className="flex flex-col gap-4">
                            <AnimatePresence mode='popLayout'>
                                {filteredTasks.map(task => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        onComplete={handleCompleteTask}
                                    />
                                ))}
                            </AnimatePresence>
                        </motion.div>
                    )}
                </section>

            </div>
        </div>
    );
}