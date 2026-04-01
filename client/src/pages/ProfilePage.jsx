import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import api from '../api.js';
import styles from './ProfilePage.module.css';

export default function ProfilePage() {
    const { user, updateAvatar, updateUser, attendanceCount, refreshCount, resetCount } = useAuth();
    const navigate = useNavigate();
    const fileRef = useRef(null);

    const [username, setUsername] = useState(user?.username || '');
    const [usernameError, setUsernameError] = useState('');
    const [usernameSuccess, setUsernameSuccess] = useState(false);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState(false);

    useEffect(() => { refreshCount(); }, [refreshCount]);

    async function handleAvatarChange(e) {
        const file = e.target.files[0];
        if (!file) return;
        const form = new FormData();
        form.append('avatar', file);
        try {
            const { data } = await api.post('/avatar', form);
            updateAvatar(data.avatar);
        } catch (err) {
            console.error('Avatar upload failed', err);
        }
        e.target.value = '';
    }

    async function handleUsernameSubmit(e) {
        e.preventDefault();
        setUsernameError('');
        setUsernameSuccess(false);
        try {
            const { data } = await api.put('/me/username', { username });
            updateUser(data.user, data.token);
            setUsernameSuccess(true);
        } catch (err) {
            setUsernameError(err.response?.data?.error || 'Błąd zmiany nazwy');
        }
    }

    async function handlePasswordSubmit(e) {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess(false);
        try {
            await api.put('/me/password', { currentPassword, newPassword });
            setPasswordSuccess(true);
            setCurrentPassword('');
            setNewPassword('');
        } catch (err) {
            setPasswordError(err.response?.data?.error || 'Błąd zmiany hasła');
        }
    }

    return (
        <div className={styles.page}>
            <div className={styles.topBar}>
                <button className={styles.backBtn} onClick={() => navigate('/')}>← Powrót</button>
                {user?.is_admin && (
                    <button className={styles.manageBtn} onClick={() => navigate('/admin')}>Zarządzaj użytkownikami</button>
                )}
            </div>

            <div className={styles.content}>
                <section className={styles.card}>
                    <h2 className={styles.sectionTitle}>Zdjęcie profilowe</h2>
                    <div className={styles.avatarRow}>
                        <div className={styles.avatar} onClick={() => fileRef.current.click()}>
                            {user?.avatar
                                ? <img className={styles.avatarImg} src={`/uploads/${user.avatar}`} alt={user.username} />
                                : <span className={styles.avatarInitial}>{user?.username?.[0]?.toUpperCase()}</span>
                            }
                            <div className={styles.avatarOverlay}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
                                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                                    <circle cx="12" cy="13" r="4"/>
                                </svg>
                            </div>
                        </div>
                        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className={styles.fileInput} onChange={handleAvatarChange} />
                        <span className={styles.avatarHint}>Kliknij aby zmienić zdjęcie</span>
                    </div>
                </section>

                <section className={styles.card}>
                    <h2 className={styles.sectionTitle}>Statystyki</h2>
                    <div className={styles.statsRow}>
                        <div className={styles.statBlock}>
                            <span className={styles.statValue}>{attendanceCount ?? '—'}</span>
                            <span className={styles.statLabel}>wejść od ostatniego resetu</span>
                        </div>
                        <button className={styles.resetBtn} onClick={resetCount}>Zresetuj licznik</button>
                    </div>
                </section>

                <section className={styles.card}>
                    <h2 className={styles.sectionTitle}>Zmień nazwę użytkownika</h2>
                    <form className={styles.form} onSubmit={handleUsernameSubmit}>
                        <input
                            className={styles.input}
                            value={username}
                            onChange={(e) => { setUsername(e.target.value); setUsernameSuccess(false); }}
                            placeholder="Nowa nazwa użytkownika"
                            autoComplete="username"
                        />
                        {usernameError && <p className={styles.error}>{usernameError}</p>}
                        {usernameSuccess && <p className={styles.success}>Nazwa zmieniona</p>}
                        <button className={styles.btn} type="submit">Zapisz</button>
                    </form>
                </section>

                <section className={styles.card}>
                    <h2 className={styles.sectionTitle}>Zmień hasło</h2>
                    <form className={styles.form} onSubmit={handlePasswordSubmit}>
                        <input
                            className={styles.input}
                            type="password"
                            value={currentPassword}
                            onChange={(e) => { setCurrentPassword(e.target.value); setPasswordSuccess(false); }}
                            placeholder="Obecne hasło"
                            autoComplete="current-password"
                        />
                        <input
                            className={styles.input}
                            type="password"
                            value={newPassword}
                            onChange={(e) => { setNewPassword(e.target.value); setPasswordSuccess(false); }}
                            placeholder="Nowe hasło (min. 6 znaków)"
                            autoComplete="new-password"
                        />
                        {passwordError && <p className={styles.error}>{passwordError}</p>}
                        {passwordSuccess && <p className={styles.success}>Hasło zmienione</p>}
                        <button className={styles.btn} type="submit">Zapisz</button>
                    </form>
                </section>
            </div>
        </div>
    );
}
