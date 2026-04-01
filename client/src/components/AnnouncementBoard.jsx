import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import api from '../api.js';
import styles from './AnnouncementBoard.module.css';

function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
}

function AnnouncementItem({ item, isAdmin, onUpdated, onDeleted }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(item.content);
    const [error, setError] = useState('');

    async function handleSave() {
        setError('');
        try {
            const { data } = await api.put(`/announcements/${item.id}`, { content: draft });
            onUpdated(data);
            setEditing(false);
        } catch (err) {
            setError(err.response?.data?.error || 'Błąd zapisu');
        }
    }

    async function handleDelete() {
        try {
            await api.delete(`/announcements/${item.id}`);
            onDeleted(item.id);
        } catch {
            // non-critical
        }
    }

    return (
        <div className={styles.item}>
            {editing ? (
                <>
                    <textarea
                        className={styles.textarea}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        rows={4}
                        autoFocus
                    />
                    {error && <p className={styles.error}>{error}</p>}
                    <div className={styles.itemActions}>
                        <button className={styles.saveBtn} onClick={handleSave}>Zapisz</button>
                        <button className={styles.cancelBtn} onClick={() => { setEditing(false); setDraft(item.content); }}>Anuluj</button>
                    </div>
                </>
            ) : (
                <>
                    <p className={styles.content}>{item.content}</p>
                    <div className={styles.meta}>
                        <span>{item.author}</span>
                        <span>{formatDate(item.created_at)}</span>
                        {item.updated_at !== item.created_at && <span className={styles.edited}>(edytowano)</span>}
                    </div>
                    {isAdmin && (
                        <div className={styles.itemActions}>
                            <button className={styles.editBtn} onClick={() => setEditing(true)}>Edytuj</button>
                            <button className={styles.deleteBtn} onClick={handleDelete}>Usuń</button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default function AnnouncementBoard() {
    const { user } = useAuth();
    const isAdmin = Boolean(user?.is_admin);

    const [items, setItems] = useState([]);
    const [draft, setDraft] = useState('');
    const [error, setError] = useState('');
    const [composing, setComposing] = useState(false);

    useEffect(() => {
        api.get('/announcements').then(({ data }) => setItems(data)).catch(() => {});
        const id = setInterval(() => {
            api.get('/announcements').then(({ data }) => setItems(data)).catch(() => {});
        }, 60_000);
        return () => clearInterval(id);
    }, []);

    async function handlePost() {
        setError('');
        try {
            const { data } = await api.post('/announcements', { content: draft });
            setItems((prev) => [data, ...prev]);
            setDraft('');
            setComposing(false);
        } catch (err) {
            setError(err.response?.data?.error || 'Błąd publikacji');
        }
    }

    return (
        <div className={styles.board}>
            <div className={styles.header}>
                <h2 className={styles.title}>Ogłoszenia</h2>
                {isAdmin && !composing && (
                    <button className={styles.newBtn} onClick={() => setComposing(true)}>+ Nowe</button>
                )}
            </div>

            {composing && (
                <div className={styles.composer}>
                    <textarea
                        className={styles.textarea}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder="Treść ogłoszenia…"
                        rows={4}
                        autoFocus
                    />
                    {error && <p className={styles.error}>{error}</p>}
                    <div className={styles.itemActions}>
                        <button className={styles.saveBtn} onClick={handlePost}>Opublikuj</button>
                        <button className={styles.cancelBtn} onClick={() => { setComposing(false); setDraft(''); setError(''); }}>Anuluj</button>
                    </div>
                </div>
            )}

            <div className={styles.list}>
                {items.length === 0 && !composing && (
                    <p className={styles.empty}>Brak ogłoszeń</p>
                )}
                {items.map((item) => (
                    <AnnouncementItem
                        key={item.id}
                        item={item}
                        isAdmin={isAdmin}
                        onUpdated={(updated) => setItems((prev) => prev.map((i) => i.id === updated.id ? { ...i, ...updated } : i))}
                        onDeleted={(id) => setItems((prev) => prev.filter((i) => i.id !== id))}
                    />
                ))}
            </div>
        </div>
    );
}
