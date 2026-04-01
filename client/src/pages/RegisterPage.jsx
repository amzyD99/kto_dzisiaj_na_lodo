import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import styles from './AuthPage.module.css';

export default function RegisterPage() {
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
            const { data } = await api.post('/auth/register', { username, password });
            login(data.token, data.user);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Rejestracja nie powiodła się');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={styles.wrapper}>
            <form className={styles.card} onSubmit={handleSubmit}>
                <h1 className={styles.title}>Grafik Lodowiska</h1>
                <h2 className={styles.subtitle}>Utwórz konto</h2>
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
                        minLength={2}
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
                        minLength={6}
                    />
                </label>
                <button className={styles.btn} type="submit" disabled={loading}>
                    {loading ? 'Tworzenie konta...' : 'Utwórz konto'}
                </button>
                <p className={styles.footer}>
                    Masz już konto? <Link to="/login">Zaloguj się</Link>
                </p>
            </form>
        </div>
    );
}
