import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './components/Toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Pendentes } from './pages/Pendentes';
import { Concluidas } from './pages/Concluidas';
import { Assistente } from './pages/Assistente';
import { GrupoBoard } from './pages/GrupoBoard';
import { Onboarding } from './pages/Onboarding';
import { Login } from './pages/Login';
import { ResetPassword } from './pages/ResetPassword';
import { api } from './services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Menu } from 'lucide-react';

const queryClient = new QueryClient();

function AppContent() {
    const { isSignedIn, loading, user } = useAuth();
    const isResetPage = window.location.pathname === '/reset-password';

    if (isResetPage) return <ResetPassword />;

    if (loading) return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (!isSignedIn) return <Login />;

    return <SettingsGate user={user} />;
}

function SettingsGate({ user }) {
    const qc = useQueryClient();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const { data: settings, isLoading } = useQuery({
        queryKey: ['settings'],
        queryFn: async () => (await api.get('/settings')).data
    });

    const saveMutation = useMutation({
        mutationFn: async (data) => (await api.put('/settings', data)).data,
        onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] })
    });

    if (isLoading) return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (!settings?.onboardingDone) {
        return (
            <Onboarding
                userName={user?.name || ''}
                onComplete={(formData) => saveMutation.mutate({ ...formData, onboardingDone: true })}
            />
        );
    }

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 selection:bg-purple-200">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            {/* Header Mobile */}
            <div className="md:hidden fixed top-0 left-0 w-full bg-white/80 backdrop-blur-xl z-40 border-b border-white/60 p-4 flex justify-between items-center shadow-sm">
                <h1 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                    Agenda <span className="text-purple-600">.</span>
                </h1>
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-2 bg-gray-100/50 hover:bg-gray-200 rounded-xl text-gray-600 transition-colors"
                >
                    <Menu size={20} />
                </button>
            </div>

            <main className="flex-1 w-full transition-all md:ml-64 p-4 pt-24 md:p-10 md:pt-10">
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/pendentes" element={<Pendentes />} />
                    <Route path="/concluidas" element={<Concluidas />} />
                    <Route path="/assistente" element={<Assistente />} />
                    <Route path="/grupo/:id" element={<GrupoBoard />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                </Routes>
            </main>
        </div>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    <ToastProvider>
                        <AppContent />
                    </ToastProvider>
                </AuthProvider>
            </QueryClientProvider>
        </BrowserRouter>
    );
}