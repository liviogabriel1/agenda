import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CheckCircle2, ListTodo, BotMessageSquare } from 'lucide-react';

export function Sidebar() {
    const navItems = [
        { path: '/', label: 'Meu Dia', icon: LayoutDashboard },
        { path: '/pendentes', label: 'A Fazer', icon: ListTodo },
        { path: '/concluidas', label: 'Histórico', icon: CheckCircle2 },
        { path: '/assistente', label: 'Assistente IA', icon: BotMessageSquare },
    ];

    return (
        <aside className="w-64 bg-white/40 backdrop-blur-xl border-r border-white/60 h-screen fixed left-0 top-0 flex flex-col p-6 shadow-xl shadow-purple-900/5 z-50">
            <div className="mb-10 mt-4 px-2">
                <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                    Agenda <span className="text-purple-600">.</span>
                </h1>
            </div>

            <nav className="flex flex-col gap-3">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold transition-all duration-300 ${isActive
                                ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/30 -translate-y-0.5'
                                : 'text-gray-500 hover:bg-white/60 hover:text-purple-600'
                            }`
                        }
                    >
                        <item.icon size={22} />
                        {item.label}
                    </NavLink>
                ))}
            </nav>
        </aside>
    );
}