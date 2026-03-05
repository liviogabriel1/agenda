import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { TaskCard } from '../components/TaskCard';

export function Concluidas() {

    // Buscar tarefas do cache
    const { data: tasks = [], isLoading } = useQuery({
        queryKey: ['tasks'],
        queryFn: async () => {
            const response = await api.get('/tasks');
            return response.data;
        }
    });

    // Filtramos apenas as concluídas
    const completedTasks = tasks.filter(task => task.completedAt);

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <header className="bg-white/40 backdrop-blur-xl border border-white/60 p-8 rounded-3xl shadow-xl shadow-emerald-900/5 flex items-center gap-4">
                <div className="p-4 bg-emerald-500 rounded-2xl text-white shadow-lg shadow-emerald-500/30">
                    <CheckCircle2 size={32} />
                </div>
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Histórico</h1>
                    <p className="text-gray-500 font-medium">O seu mural de conquistas. {completedTasks.length} {completedTasks.length === 1 ? 'tarefa finalizada' : 'tarefas finalizadas'}.</p>
                </div>
            </header>

            {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 size={32} className="text-emerald-500 animate-spin" /></div>
            ) : completedTasks.length === 0 ? (
                <div className="text-center py-16 bg-white/40 backdrop-blur-md rounded-3xl border border-dashed border-emerald-200">
                    <p className="text-gray-500 font-medium">Ainda não concluiu nenhuma tarefa.</p>
                </div>
            ) : (
                <motion.div layout className="flex flex-col gap-4">
                    <AnimatePresence mode='popLayout'>
                        {completedTasks.map(task => (
                            <TaskCard key={task.id} task={task} />
                        ))}
                    </AnimatePresence>
                </motion.div>
            )}
        </div>
    );
}