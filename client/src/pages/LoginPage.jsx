import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import styles from './AuthPage.module.css';

export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { data } = await api.post('/auth/login', { username, password });
            login(data.token, data.user);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Logowanie nie powiodło się');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={styles.wrapper}>
            <form className={styles.card} onSubmit={handleSubmit}>
                <h1 className={styles.title}>kto dzisiaj na lodo</h1>
                <h2 className={styles.subtitle}>Zaloguj się</h2>
                {error && <p className={styles.error}>{error}</p>}
                <label className={styles.label}>
                    Nazwa użytkownika
                    <input
                        className={styles.input}
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        autoFocus
                        required
                    />
                </label>
                <label className={styles.label}>
                    Hasło
                    <input
                        className={styles.input}
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </label>
                <button className={styles.btn} type="submit" disabled={loading}>
                    {loading ? 'Logowanie...' : 'Zaloguj się'}
                </button>
                <p className={styles.footer}>
                    Nie masz konta? <Link to="/register">Zarejestruj się</Link>
                </p>
            </form>
        </div>
    );
}
