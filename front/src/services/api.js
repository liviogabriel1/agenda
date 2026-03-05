import axios from 'axios';

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3333',
    withCredentials: false,
});

api.interceptors.request.use(config => {
    const token = localStorage.getItem('agenda_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    res => res,
    err => {
        if (err.response?.status === 401) {
            localStorage.removeItem('agenda_token');
            localStorage.removeItem('agenda_user');
        }
        return Promise.reject(err);
    }
);