import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Assistente } from './pages/Assistente';
import { Pendentes } from './pages/Pendentes';
import { Concluidas } from './pages/Concluidas';

const Placeholder = ({ title, desc }) => (
    <div className="flex flex-col items-center justify-center h-full pt-32 text-center">
        <h1 className="text-4xl font-extrabold text-gray-800 mb-4">{title}</h1>
        <p className="text-gray-500 text-lg">{desc}</p>
    </div>
);

export default function App() {
    return (
        <BrowserRouter>
            <div className="flex min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 selection:bg-purple-200">
                <Sidebar />
                <main className="flex-1 ml-64 p-6 md:p-10">
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/pendentes" element={<Pendentes />} />
                        <Route path="/concluidas" element={<Concluidas />} />
                        <Route path="/assistente" element={<Assistente />} />
                    </Routes>
                </main>

            </div>
        </BrowserRouter>
    );
}