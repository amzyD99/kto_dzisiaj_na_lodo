import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import api from '../api.js';
import styles from './ProfilePage.module.css';

function contrastText(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return L > 0.45 ? '#0f172a' : '#e2e8f0';
}

const COLOR_PALETTE = [
    '#f87171', '#fb923c', '#17b11f', '#a3e635',
    '#34d399', '#22d3ee', '#2b65ac', '#a78bfa',
];

export default function ProfilePage() {
    const { user, updateAvatar, updateUser, updateColor, attendanceCount, refreshCount, resetCount } = useAuth();
    const navigate = useNavigate();
    const fileRef = useRef(null);

    const [username, setUsername] = useState(user?.username || '');
    const [usernameError, setUsernameError] = useState('');
    const [usernameSuccess, setUsernameSuccess] = useState(false);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState(false);

    const [messageColor, setMessageColor] = useState(user?.message_color || '#1e3f6b');
    const [messageColor2, setMessageColor2] = useState(user?.message_color2 || user?.message_color || '#1e3f6b');
    const [gradientEnabled, setGradientEnabled] = useState(
        Boolean(user?.message_color2 && user.message_color2 !== user.message_color)
    );
    const [colorError, setColorError] = useState('');

    const [regToken, setRegToken] = useState('');
    const [regTokenSeconds, setRegTokenSeconds] = useState(null);

    const fetchRegToken = useCallback(async () => {
        try {
            const { data } = await api.get('/auth/register-token');
            setRegToken(data.token);
            setRegTokenSeconds(data.secondsUntilRotation);
        } catch {
            // non-critical
        }
    }, []);

    useEffect(() => {
        if (!user?.is_admin) return;
        fetchRegToken();
        const poll = setInterval(fetchRegToken, 15 * 60 * 1000);
        return () => clearInterval(poll);
    }, [user?.is_admin, fetchRegToken]);

    // Local countdown tick — decrements every second, re-fetches when it reaches zero
    useEffect(() => {
        if (!user?.is_admin || regTokenSeconds === null) return;
        if (regTokenSeconds <= 0) { fetchRegToken(); return; }
        const id = setTimeout(() => setRegTokenSeconds(s => s - 1), 1000);
        return () => clearTimeout(id);
    }, [user?.is_admin, regTokenSeconds, fetchRegToken]);

    async function saveColors(c1, c2) {
        setColorError('');
        try {
            await api.put('/me/color', { color: c1, color2: c2 });
            updateColor(c1, c2);
        } catch (err) {
            setColorError(err.response?.data?.error || 'Błąd zapisu koloru');
        }
    }

    function handleColorSelect(color) {
        setMessageColor(color);
        saveColors(color, gradientEnabled ? messageColor2 : color);
    }

    function handleColor2Select(color) {
        setMessageColor2(color);
        saveColors(messageColor, color);
    }

    function handleGradientToggle(e) {
        const on = e.target.checked;
        setGradientEnabled(on);
        if (!on) {
            setMessageColor2(messageColor);
            saveColors(messageColor, messageColor);
        }
    }

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

    let previewColorBase = messageColor;
    if (gradientEnabled) {
        const toHex = (v) => Math.round(v).toString(16).padStart(2, '0');
        const avg = (c1, c2, i) => (parseInt(c1.slice(i, i + 2), 16) + parseInt(c2.slice(i, i + 2), 16)) / 2;
        previewColorBase = `#${toHex(avg(messageColor, messageColor2, 1))}${toHex(avg(messageColor, messageColor2, 3))}${toHex(avg(messageColor, messageColor2, 5))}`;
    }
    const previewTextColor = contrastText(previewColorBase);

    return (
        <div className={styles.page}>
            <div className={styles.topBar}>
                <button className={styles.backBtn} onClick={() => navigate('/')}>← Powrót</button>
                {!!user?.is_admin && (
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
                    <h2 className={styles.sectionTitle}>Kolor wiadomości</h2>
                    <div className={styles.colorPreview} style={{ background: gradientEnabled ? `linear-gradient(135deg, ${messageColor}, ${messageColor2})` : messageColor }}>
                        <span style={{ color: previewTextColor, fontSize: '0.78rem' }}>Podgląd</span>
                    </div>
                    <div className={styles.gradientSection}>
                        <div>
                            {gradientEnabled && <span className={styles.colorLabel}>Kolor 1</span>}
                            <div className={styles.colorRow}>
                                <div className={styles.palette}>
                                    {COLOR_PALETTE.map((c) => (
                                        <button
                                            key={c}
                                            className={`${styles.swatch} ${messageColor === c ? styles.swatchActive : ''}`}
                                            style={{ background: c }}
                                            onClick={() => handleColorSelect(c)}
                                            aria-label={c}
                                        />
                                    ))}
                                    <input
                                        type="color"
                                        className={styles.colorInput}
                                        value={messageColor}
                                        onChange={(e) => handleColorSelect(e.target.value)}
                                        title="Własny kolor"
                                    />
                                </div>
                            </div>
                        </div>
                        <label className={styles.checkboxRow}>
                            <input type="checkbox" checked={gradientEnabled} onChange={handleGradientToggle} />
                            <span>Gradient</span>
                        </label>
                        {gradientEnabled && (
                            <div>
                                <span className={styles.colorLabel}>Kolor 2</span>
                                <div className={styles.colorRow}>
                                    <div className={styles.palette}>
                                        {COLOR_PALETTE.map((c) => (
                                            <button
                                                key={`c2-${c}`}
                                                className={`${styles.swatch} ${messageColor2 === c ? styles.swatchActive : ''}`}
                                                style={{ background: c }}
                                                onClick={() => handleColor2Select(c)}
                                                aria-label={c}
                                            />
                                        ))}
                                        <input
                                            type="color"
                                            className={styles.colorInput}
                                            value={messageColor2}
                                            onChange={(e) => handleColor2Select(e.target.value)}
                                            title="Własny kolor"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    {colorError && <p className={styles.error}>{colorError}</p>}
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

                {!!user?.is_admin && (
                    <section className={styles.card}>
                        <h2 className={styles.sectionTitle}>Token rejestracji</h2>
                        <div className={styles.regTokenRow}>
                            <span className={styles.regToken}>{regToken || '—'}</span>
                            {regTokenSeconds !== null && (
                                <span className={styles.regTokenExpiry}>
                                    rotacja za {Math.floor(regTokenSeconds / 60)}:{String(regTokenSeconds % 60).padStart(2, '0')}
                                </span>
                            )}
                        </div>
                    </section>
                )}

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
