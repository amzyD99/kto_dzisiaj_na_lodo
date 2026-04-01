import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import api from '../api.js';
import styles from './ChatPage.module.css';

const POLL_INTERVAL_MS = 3000;

function formatTime(iso) {
    return new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

function formatDay(iso) {
    return new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' });
}

function Message({ msg, isMine, isAdmin, onDelete }) {
    const [confirming, setConfirming] = useState(false);

    const canDelete = isMine || isAdmin;

    return (
        <div className={`${styles.msg} ${isMine ? styles.mine : styles.theirs}`}>
            {!isMine && (
                <div className={styles.avatar}>
                    {msg.avatar
                        ? <img src={`/uploads/${msg.avatar}`} alt={msg.username} className={styles.avatarImg} />
                        : <span className={styles.avatarInitial}>{msg.username[0].toUpperCase()}</span>
                    }
                </div>
            )}
            <div className={styles.bubble}>
                {!isMine && <span className={styles.sender}>{msg.username}</span>}
                <p className={styles.text}>{msg.content}</p>
                <div className={styles.msgMeta}>
                    <span className={styles.time}>{formatTime(msg.created_at)}</span>
                    {canDelete && !confirming && (
                        <button className={styles.deleteBtn} onClick={() => setConfirming(true)}>usuń</button>
                    )}
                    {confirming && (
                        <span className={styles.confirmRow}>
                            <button className={styles.confirmYes} onClick={() => onDelete(msg.id)}>tak</button>
                            <button className={styles.confirmNo} onClick={() => setConfirming(false)}>nie</button>
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ChatPage() {
    const { user } = useAuth();
    const isAdmin = Boolean(user?.is_admin);
    const [messages, setMessages] = useState([]);
    const [draft, setDraft] = useState('');
    const [hasMore, setHasMore] = useState(true);
    const lastIdRef = useRef(0);
    const firstIdRef = useRef(Infinity);
    const bottomRef = useRef(null);
    const inputRef = useRef(null);
    const isFirstLoad = useRef(true);

    const fetchMessages = useCallback(async () => {
        try {
            const { data } = await api.get(`/chat?after=${lastIdRef.current}`);
            if (data.length === 0) return;
            lastIdRef.current = data[data.length - 1].id;
            if (firstIdRef.current === Infinity) firstIdRef.current = data[0].id;
            localStorage.setItem('chat_latest_id', lastIdRef.current);
            setMessages(prev => [...prev, ...data]);
        } catch {
            // non-critical polling failure
        }
    }, []);

    useEffect(() => {
        // Mark messages as seen whenever this page is mounted
        localStorage.setItem('chat_last_seen_id', localStorage.getItem('chat_latest_id') || '0');
        fetchMessages().then(() => {
            isFirstLoad.current = false;
            localStorage.setItem('chat_last_seen_id', String(lastIdRef.current));
        });
        const id = setInterval(() => {
            fetchMessages().then(() => {
                localStorage.setItem('chat_last_seen_id', String(lastIdRef.current));
            });
        }, POLL_INTERVAL_MS);
        return () => clearInterval(id);
    }, [fetchMessages]);

    useEffect(() => {
        if (messages.length > 0 && isFirstLoad.current === false) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages.length]);

    async function loadEarlier() {
        if (firstIdRef.current === Infinity) return;
        try {
            const { data } = await api.get(`/chat?before=${firstIdRef.current}`);
            if (data.length === 0) { setHasMore(false); return; }
            if (data.length < 50) setHasMore(false);
            firstIdRef.current = data[0].id;
            setMessages(prev => [...data, ...prev]);
        } catch {
            // non-critical
        }
    }

    async function handleSend(e) {
        e.preventDefault();
        const content = draft.trim();
        if (!content) return;
        setDraft('');
        try {
            const { data } = await api.post('/chat', { content });
            lastIdRef.current = data.id;
            if (firstIdRef.current === Infinity) firstIdRef.current = data.id;
            setMessages(prev => [...prev, data]);
        } catch {
            setDraft(content);
        }
        inputRef.current?.focus();
    }

    async function handleDelete(id) {
        try {
            await api.delete(`/chat/${id}`);
            setMessages(prev => prev.filter(m => m.id !== id));
        } catch {
            // non-critical
        }
    }

    // Group messages by day for date separators
    const grouped = [];
    let lastDay = null;
    for (const msg of messages) {
        const day = msg.created_at.slice(0, 10);
        if (day !== lastDay) {
            grouped.push({ type: 'separator', day, label: formatDay(msg.created_at) });
            lastDay = day;
        }
        grouped.push({ type: 'message', msg });
    }

    return (
        <div className={styles.page}>
            <div className={styles.feed}>
                {hasMore && messages.length >= 50 && (
                    <button className={styles.loadEarlier} onClick={loadEarlier}>
                        Wczytaj wcześniejsze wiadomości
                    </button>
                )}
                {grouped.length === 0 && (
                    <p className={styles.empty}>Brak wiadomości. Napisz pierwszą.</p>
                )}
                {grouped.map((item) =>
                    item.type === 'separator'
                        ? <div key={`sep-${item.day}`} className={styles.separator}><span>{item.label}</span></div>
                        : <Message
                            key={item.msg.id}
                            msg={item.msg}
                            isMine={item.msg.user_id === user?.id}
                            isAdmin={isAdmin}
                            onDelete={handleDelete}
                          />
                )}
                <div ref={bottomRef} />
            </div>
            <form className={styles.composer} onSubmit={handleSend}>
                <input
                    ref={inputRef}
                    className={styles.input}
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    placeholder="Napisz wiadomość…"
                    maxLength={500}
                    autoComplete="off"
                />
                <button className={styles.sendBtn} type="submit" disabled={!draft.trim()}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                        <line x1="22" y1="2" x2="11" y2="13"/>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                </button>
            </form>
        </div>
    );
}
