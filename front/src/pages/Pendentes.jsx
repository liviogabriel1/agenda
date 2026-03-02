import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ListTodo } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { TaskCard } from '../components/TaskCard';

export function Pendentes() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchTasks = async () => {
        try {
            const response = await api.get('/tasks');
            setTasks(response.data.filter(task => !task.completedAt));
        } catch (error) {
            console.error("Erro ao buscar tarefas:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const handleCompleteTask = async (id, data) => {
        try {
            await api.patch(`/tasks/${id}/complete`, data);
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#a855f7', '#ec4899', '#3b82f6'] });
            fetchTasks();
        } catch (error) {
            console.error("Erro ao concluir tarefa:", error);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <header className="bg-white/40 backdrop-blur-xl border border-white/60 p-8 rounded-3xl shadow-xl shadow-purple-900/5 flex items-center gap-4">
                <div className="p-4 bg-purple-500 rounded-2xl text-white shadow-lg shadow-purple-500/30">
                    <ListTodo size={32} />
                </div>
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Foco Total</h1>
                    <p className="text-gray-500 font-medium">Você tem {tasks.length} {tasks.length === 1 ? 'tarefa pendente' : 'tarefas pendentes'}.</p>
                </div>
            </header>

            {loading ? (
                <div className="flex justify-center py-12"><Loader2 size={32} className="text-purple-500 animate-spin" /></div>
            ) : tasks.length === 0 ? (
                <div className="text-center py-16 bg-white/40 backdrop-blur-md rounded-3xl border border-dashed border-purple-200">
                    <p className="text-gray-500 font-medium">Tudo limpo por aqui! Vá aproveitar o seu dia. ✨</p>
                </div>
            ) : (
                <motion.div layout className="flex flex-col gap-4">
                    <AnimatePresence mode='popLayout'>
                        {tasks.map(task => (
                            <TaskCard key={task.id} task={task} onComplete={handleCompleteTask} />
                        ))}
                    </AnimatePresence>
                </motion.div>
            )}
        </div>
    );
}