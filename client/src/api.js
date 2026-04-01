import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// Attach JWT from localStorage to every outgoing request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
