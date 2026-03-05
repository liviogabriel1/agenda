import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedUser = localStorage.getItem('agenda_user');
        const token = localStorage.getItem('agenda_token');

        if (token) {
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }

        if (savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch {
                localStorage.removeItem('agenda_user');
            }
        }

        api.get('/auth/me')
            .then(({ data }) => {
                setUser(data.user);
                localStorage.setItem('agenda_user', JSON.stringify(data.user));
            })
            .catch(() => {
                setUser(null);
                localStorage.removeItem('agenda_user');
            })
            .finally(() => setLoading(false));

        const handleStorage = () => {
            const u = localStorage.getItem('agenda_user');
            if (!u) setUser(null);
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const login = (userData, token) => {
        localStorage.setItem('agenda_user', JSON.stringify(userData));
        if (token) {
            localStorage.setItem('agenda_token', token);
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
        setUser(userData);
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout');
        } catch {
        } finally {
            localStorage.removeItem('agenda_user');
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, isSignedIn: !!user }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}