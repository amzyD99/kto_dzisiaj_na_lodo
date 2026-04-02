import React, { createContext, useContext, useState, useCallback } from 'react';
import api from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try {
            const stored = localStorage.getItem('user');
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    });

    const [attendanceCount, setAttendanceCount] = useState(null);

    const refreshCount = useCallback(async () => {
        try {
            const { data } = await api.get('/me/stats');
            setAttendanceCount(data.count);
        } catch {
            // non-critical — leave previous value
        }
    }, []);

    const resetCount = useCallback(async () => {
        try {
            const { data } = await api.post('/me/stats/reset');
            setAttendanceCount(data.count);
        } catch {
            // non-critical
        }
    }, []);

    function login(token, userData) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
    }

    function logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setAttendanceCount(null);
    }

    function updateAvatar(avatar) {
        setUser((prev) => {
            const updated = { ...prev, avatar };
            localStorage.setItem('user', JSON.stringify(updated));
            return updated;
        });
    }

    function updateUser(userData, token) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
    }

    function updateColor(color, color2) {
        setUser((prev) => {
            const updated = { ...prev, message_color: color, message_color2: color2 || color };
            localStorage.setItem('user', JSON.stringify(updated));
            return updated;
        });
    }

    return (
        <AuthContext.Provider value={{ user, login, logout, updateAvatar, updateUser, updateColor, attendanceCount, refreshCount, resetCount }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
