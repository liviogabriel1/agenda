// api.js
import axios from 'axios';

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3333',
    withCredentials: true,
});

api.interceptors.response.use(
    res => res,
    err => {
        if (err.response?.status === 401) {
            localStorage.removeItem('agenda_user');
            localStorage.removeItem('agenda_token');
            window.location.href = '/';
        }
        return Promise.reject(err);
    }
);