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

// Returns a contrasting text color (dark or light) for a given hex background.
// Uses the sRGB relative luminance formula (ITU-R BT.709 coefficients).
function contrastText(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return L > 0.45 ? '#0f172a' : '#e2e8f0';
}

function bubbleStyle(msg) {
    if (!msg.message_color) return undefined;
    const hasGradient = msg.message_color2 && msg.message_color2 !== msg.message_color;
    const bg = hasGradient
        ? `linear-gradient(135deg, ${msg.message_color}, ${msg.message_color2})`
        : msg.message_color;
    // For gradients, derive text color from the average luminance of both stops.
    // For solid colors, derive directly.
    const r1 = parseInt(msg.message_color.slice(1, 3), 16);
    const g1 = parseInt(msg.message_color.slice(3, 5), 16);
    const b1 = parseInt(msg.message_color.slice(5, 7), 16);
    let avgHex = msg.message_color;
    if (hasGradient) {
        const r2 = parseInt(msg.message_color2.slice(1, 3), 16);
        const g2 = parseInt(msg.message_color2.slice(3, 5), 16);
        const b2 = parseInt(msg.message_color2.slice(5, 7), 16);
        const toHex = (v) => Math.round(v).toString(16).padStart(2, '0');
        avgHex = `#${toHex((r1 + r2) / 2)}${toHex((g1 + g2) / 2)}${toHex((b1 + b2) / 2)}`;
    }
    return { background: bg, color: contrastText(avgHex) };
}

function IconReply() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
            <polyline points="9 17 4 12 9 7" />
            <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
        </svg>
    );
}

function IconMore() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <circle cx="12" cy="5" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="19" r="1.5" />
        </svg>
    );
}

function useSwipeReply(onReply, isMine) {
    const ref = useRef(null);
    const onReplyRef = useRef(onReply);
    const startX = useRef(0);
    const currentX = useRef(0);
    const swiping = useRef(false);

    // Keep the callback ref current without re-registering DOM listeners.
    useEffect(() => { onReplyRef.current = onReply; }, [onReply]);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        // Swipe toward center: "theirs" swipes right, "mine" swipes left
        const direction = isMine ? -1 : 1;
        const threshold = 60;

        function onTouchStart(e) {
            startX.current = e.touches[0].clientX;
            currentX.current = 0;
            swiping.current = false;
        }

        function onTouchMove(e) {
            const dx = (e.touches[0].clientX - startX.current) * direction;
            if (dx < 0) { el.style.transform = ''; return; }
            if (dx > 10) {
                swiping.current = true;
                // Prevent vertical page scroll while a horizontal swipe is in progress.
                e.preventDefault();
            }
            const clamped = Math.min(dx, 80);
            currentX.current = dx;
            el.style.transform = `translateX(${clamped * direction}px)`;
        }

        function onTouchEnd() {
            el.style.transition = 'transform 0.2s';
            el.style.transform = '';
            setTimeout(() => { el.style.transition = ''; }, 200);
            if (swiping.current && currentX.current >= threshold) onReplyRef.current();
            swiping.current = false;
        }

        el.addEventListener('touchstart', onTouchStart, { passive: true });
        // Non-passive so preventDefault() can suppress page scroll during horizontal swipe.
        el.addEventListener('touchmove', onTouchMove, { passive: false });
        el.addEventListener('touchend', onTouchEnd);
        return () => {
            el.removeEventListener('touchstart', onTouchStart);
            el.removeEventListener('touchmove', onTouchMove);
            el.removeEventListener('touchend', onTouchEnd);
        };
    }, [isMine]); // onReply intentionally omitted — kept current via onReplyRef

    return ref;
}

function scrollToMessage(id, feedEl) {
    if (!feedEl) return;
    const msgRow = feedEl.querySelector(`[data-msg-id="${id}"]`);
    if (!msgRow) return;
    msgRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function StreakHighlight({ targetRef }) {
    const [dims, setDims] = useState(null);
    const rectRef = useRef(null);

    useEffect(() => {
        const el = targetRef.current;
        if (!el) return;
        const { width, height } = el.getBoundingClientRect();
        setDims({ w: width, h: height });
    }, [targetRef]);

    // Drive stroke-dashoffset via Web Animations API so the perimeter
    // value is fed directly as a JS number -- avoids the browser
    // incompatibilities of using calc() with unitless custom properties
    // inside @keyframes.
    useEffect(() => {
        if (!dims || !rectRef.current) return;
        const { w, h } = dims;
        const r = 12;
        const perimeter = 2 * (w - 2 * r) + 2 * (h - 2 * r) + 2 * Math.PI * r;
        const anim = rectRef.current.animate(
            [{ strokeDashoffset: 0 }, { strokeDashoffset: -perimeter }],
            { duration: 1200, iterations: Infinity, easing: 'linear' }
        );
        return () => anim.cancel();
    }, [dims]);

    if (!dims) return null;

    const { w, h } = dims;
    const r = 12;
    const perimeter = 2 * (w - 2 * r) + 2 * (h - 2 * r) + 2 * Math.PI * r;
    const streak = perimeter * 0.18;
    const gap = perimeter - streak;

    return (
        <svg
            className={styles.streakSvg}
            style={{ position: 'absolute', inset: -2, width: w + 4, height: h + 4, pointerEvents: 'none' }}
        >
            <rect
                ref={rectRef}
                x="2" y="2" width={w} height={h}
                rx={r} ry={r}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2"
                strokeDasharray={`${streak} ${gap}`}
                strokeLinecap="round"
            />
        </svg>
    );
}

function Message({ msg, isMine, isAdmin, onDelete, onReply, isFirst, isLast, feedRef, highlighted, onHighlight }) {
    const [confirming, setConfirming] = useState(false);
    const [showTime, setShowTime] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const bubbleRef = useRef(null);
    const menuRef = useRef(null);
    const swipeRef = useSwipeReply(onReply, isMine);

    const canDelete = isMine || isAdmin;

    useEffect(() => {
        if (!menuOpen) return;
        function close(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); }
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [menuOpen]);

    const groupPos = isFirst && isLast ? '' : isFirst ? styles.groupFirst : isLast ? styles.groupLast : styles.groupMiddle;

    return (
        <div ref={swipeRef} data-msg-id={msg.id} className={`${styles.msg} ${isMine ? styles.mine : styles.theirs} ${!isFirst ? styles.continuation : ''} ${groupPos}`}>
            {!isMine && (
                isLast
                    ? <div className={styles.avatar}>
                        {msg.avatar
                            ? <img src={`/uploads/${msg.avatar}`} alt={msg.username} className={styles.avatarImg} />
                            : <span className={styles.avatarInitial}>{msg.username[0].toUpperCase()}</span>
                        }
                      </div>
                    : <div className={styles.avatarSpacer} />
            )}
            <div className={styles.bubble}>
                {!isMine && isFirst && <span className={styles.sender}>{msg.username}</span>}
                {msg.reply_content && (
                    <div
                        className={styles.replyPreview}
                        onClick={() => { scrollToMessage(msg.reply_to_id, feedRef?.current); onHighlight(msg.reply_to_id); }}
                    >
                        <span className={styles.replyAuthor}>{msg.reply_username}</span>
                        <span className={styles.replyText}>{msg.reply_content.length > 80 ? msg.reply_content.slice(0, 80) + '...' : msg.reply_content}</span>
                    </div>
                )}
                <div className={styles.textRow}>
                    <div className={styles.textWrap} ref={bubbleRef}>
                        <p
                            className={styles.text}
                            style={!isMine ? bubbleStyle(msg) : undefined}
                            onClick={!isLast ? () => setShowTime(v => !v) : undefined}
                        >{msg.content}</p>
                        {highlighted && <StreakHighlight targetRef={bubbleRef} />}
                    </div>
                    <div className={styles.contextArea} ref={menuRef}>
                        <button className={styles.contextBtn} onClick={() => setMenuOpen(v => !v)}>
                            <IconMore />
                        </button>
                        {menuOpen && (
                            <div className={`${styles.contextMenu} ${isMine ? styles.contextMenuMine : ''}`}>
                                <button className={styles.contextMenuItem} onClick={() => { setMenuOpen(false); onReply(); }}>
                                    <IconReply /> Odpowiedz
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                {(isLast || showTime) && (
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
                )}
            </div>
        </div>
    );
}

const GROUP_THRESHOLD_MS = 30000;

export default function ChatPage() {
    const { user } = useAuth();
    const isAdmin = Boolean(user?.is_admin);
    const [messages, setMessages] = useState([]);
    const [draft, setDraft] = useState('');
    const [replyTo, setReplyTo] = useState(null);
    const [highlightId, setHighlightId] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const lastIdRef = useRef(0);
    const firstIdRef = useRef(Infinity);
    const bottomRef = useRef(null);
    const feedRef = useRef(null);
    const inputRef = useRef(null);
    const isFirstLoad = useRef(true);
    const initialScrollDone = useRef(false);
    const highlightTimer = useRef(null);

    const triggerHighlight = useCallback((id) => {
        clearTimeout(highlightTimer.current);
        setHighlightId(id);
        highlightTimer.current = setTimeout(() => setHighlightId(null), 2000);
    }, []);

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
            // Wait for React to commit the DOM update before scrolling
            requestAnimationFrame(() => {
                bottomRef.current?.scrollIntoView({ behavior: 'instant' });
                initialScrollDone.current = true;
            });
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
        if (messages.length === 0 || !initialScrollDone.current) return;
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
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
        const currentReply = replyTo;
        setReplyTo(null);
        try {
            const payload = { content };
            if (currentReply) payload.reply_to_id = currentReply.id;
            const { data } = await api.post('/chat', payload);
            lastIdRef.current = data.id;
            if (firstIdRef.current === Infinity) firstIdRef.current = data.id;
            setMessages(prev => [...prev, data]);
        } catch {
            setDraft(content);
            setReplyTo(currentReply);
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

    // Group messages by day for date separators, then annotate consecutive
    // messages from the same user sent within GROUP_THRESHOLD_MS with
    // isFirst / isLast flags so the renderer can collapse avatars and timestamps.
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

    // Annotate isFirst / isLast on message entries
    for (let i = 0; i < grouped.length; i++) {
        const item = grouped[i];
        if (item.type !== 'message') continue;
        const prev = i > 0 && grouped[i - 1].type === 'message' ? grouped[i - 1] : null;
        const next = i < grouped.length - 1 && grouped[i + 1].type === 'message' ? grouped[i + 1] : null;

        const sameAsPrev = prev
            && prev.msg.user_id === item.msg.user_id
            && (new Date(item.msg.created_at) - new Date(prev.msg.created_at)) <= GROUP_THRESHOLD_MS;
        const sameAsNext = next
            && next.msg.user_id === item.msg.user_id
            && (new Date(next.msg.created_at) - new Date(item.msg.created_at)) <= GROUP_THRESHOLD_MS;

        item.isFirst = !sameAsPrev;
        item.isLast = !sameAsNext;
    }

    return (
        <div className={styles.page}>
            <div className={styles.feed} ref={feedRef}>
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
                            onReply={() => { setReplyTo(item.msg); inputRef.current?.focus(); }}
                            isFirst={item.isFirst}
                            isLast={item.isLast}
                            feedRef={feedRef}
                            highlighted={highlightId === item.msg.id}
                            onHighlight={triggerHighlight}
                          />
                )}
                <div ref={bottomRef} />
            </div>
            {replyTo && (
                <div className={styles.replyBar}>
                    <div className={styles.replyBarContent}>
                        <span className={styles.replyBarAuthor}>{replyTo.username}</span>
                        <span className={styles.replyBarText}>{replyTo.content.length > 60 ? replyTo.content.slice(0, 60) + '...' : replyTo.content}</span>
                    </div>
                    <button className={styles.replyBarClose} onClick={() => setReplyTo(null)}>&times;</button>
                </div>
            )}
            <form className={styles.composer} onSubmit={handleSend}>
                <input
                    ref={inputRef}
                    className={styles.input}
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    placeholder={replyTo ? 'Odpowiedz...' : 'Napisz wiadomość…'}
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
