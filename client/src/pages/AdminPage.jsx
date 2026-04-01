import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import api from '../api.js';
import styles from './AdminPage.module.css';

function formatDate(iso) {
    return new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
}

function UserRow({ user, currentUserId, onDeleted }) {
    const [mode, setMode] = useState(null); // null | 'reset' | 'delete'
    const [password, setPassword] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    function close() { setMode(null); setPassword(''); setAdminPassword(''); setError(''); setSuccess(false); }

    async function handleReset(e) {
        e.preventDefault();
        setError(''); setSuccess(false);
        try {
            await api.put(`/admin/users/${user.id}/password`, { newPassword: password });
            setSuccess(true);
            setPassword('');
        } catch (err) {
            setError(err.response?.data?.error || 'Błąd zmiany hasła');
        }
    }

    async function handleDelete(e) {
        e.preventDefault();
        setError('');
        try {
            await api.delete(`/admin/users/${user.id}`, { data: { adminPassword } });
            onDeleted(user.id);
        } catch (err) {
            setError(err.response?.data?.error || 'Błąd usuwania użytkownika');
        }
    }

    const isSelf = user.id === currentUserId;

    return (
        <div className={styles.row}>
            <div className={styles.rowMain}>
                <div className={styles.userInfo}>
                    <span className={styles.username}>
                        {user.username}
                        {user.is_admin ? <span className={styles.adminBadge}>admin</span> : null}
                        {isSelf ? <span className={styles.youBadge}>ty</span> : null}
                    </span>
                    <span className={styles.joined}>dołączył {formatDate(user.created_at)}</span>
                </div>
                <div className={styles.actions}>
                    <button
                        className={`${styles.resetToggle} ${mode === 'reset' ? styles.resetToggleActive : ''}`}
                        onClick={() => mode === 'reset' ? close() : (close(), setMode('reset'))}
                    >
                        Resetuj hasło
                    </button>
                    {!isSelf && (
                        <button
                            className={`${styles.deleteToggle} ${mode === 'delete' ? styles.deleteToggleActive : ''}`}
                            onClick={() => mode === 'delete' ? close() : (close(), setMode('delete'))}
                        >
                            Usuń
                        </button>
                    )}
                </div>
            </div>

            {mode === 'reset' && (
                <form className={styles.subForm} onSubmit={handleReset}>
                    <input
                        className={styles.input}
                        type="password"
                        value={password}
                        onChange={e => { setPassword(e.target.value); setSuccess(false); }}
                        placeholder="Nowe hasło (min. 6 znaków)"
                        autoComplete="new-password"
                        autoFocus
                    />
                    {error && <p className={styles.error}>{error}</p>}
                    {success && <p className={styles.success}>Hasło zostało zmienione</p>}
                    <div className={styles.formActions}>
                        <button className={styles.saveBtn} type="submit">Zapisz</button>
                        <button className={styles.cancelBtn} type="button" onClick={close}>Anuluj</button>
                    </div>
                </form>
            )}

            {mode === 'delete' && (
                <form className={`${styles.subForm} ${styles.deleteForm}`} onSubmit={handleDelete}>
                    <p className={styles.deleteWarning}>
                        Usunięcie konta <strong>{user.username}</strong> jest nieodwracalne. Potwierdź swoim hasłem administratora.
                    </p>
                    <input
                        className={styles.input}
                        type="password"
                        value={adminPassword}
                        onChange={e => setAdminPassword(e.target.value)}
                        placeholder="Twoje hasło administratora"
                        autoComplete="current-password"
                        autoFocus
                    />
                    {error && <p className={styles.error}>{error}</p>}
                    <div className={styles.formActions}>
                        <button className={styles.confirmDeleteBtn} type="submit">Potwierdź usunięcie</button>
                        <button className={styles.cancelBtn} type="button" onClick={close}>Anuluj</button>
                    </div>
                </form>
            )}
        </div>
    );
}

export default function AdminPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/admin/users')
            .then(({ data }) => setUsers(data))
            .catch(() => navigate('/'))
            .finally(() => setLoading(false));
    }, [navigate]);

    return (
        <div className={styles.page}>
            <div className={styles.topBar}>
                <button className={styles.backBtn} onClick={() => navigate('/profile')}>← Powrót</button>
                <h1 className={styles.pageTitle}>Zarządzaj użytkownikami</h1>
            </div>

            <div className={styles.content}>
                <section className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h2 className={styles.sectionTitle}>Użytkownicy</h2>
                        <span className={styles.count}>{users.length}</span>
                    </div>
                    {loading ? (
                        <p className={styles.empty}>Ładowanie…</p>
                    ) : users.length === 0 ? (
                        <p className={styles.empty}>Brak użytkowników</p>
                    ) : (
                        <div className={styles.userList}>
                            {users.map(u => (
                                <UserRow
                                    key={u.id}
                                    user={u}
                                    currentUserId={user?.id}
                                    onDeleted={(id) => setUsers(prev => prev.filter(x => x.id !== id))}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
