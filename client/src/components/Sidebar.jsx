import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styles from './Sidebar.module.css';

function useChatUnread(isOnChat) {
    const [unread, setUnread] = useState(false);

    useEffect(() => {
        function check() {
            if (isOnChat) { setUnread(false); return; }
            const latest = parseInt(localStorage.getItem('chat_latest_id') || '0', 10);
            const seen   = parseInt(localStorage.getItem('chat_last_seen_id') || '0', 10);
            setUnread(latest > seen);
        }
        check();
        const id = setInterval(check, 2000);
        window.addEventListener('storage', check);
        return () => { clearInterval(id); window.removeEventListener('storage', check); };
    }, [isOnChat]);

    return unread;
}

function IconSchedule() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
    );
}

function IconChat() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
    );
}

function IconAnalytics() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6"  y1="20" x2="6"  y2="14"/>
        </svg>
    );
}

const NAV_ITEMS = [
    { path: '/',          label: 'Harmonogram', Icon: IconSchedule },
    { path: '/chat',      label: 'Czat',         Icon: IconChat      },
    { path: '/analytics', label: 'Statystyki',   Icon: IconAnalytics },
];

export default function Sidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    const isOnChat = location.pathname === '/chat';
    const chatUnread = useChatUnread(isOnChat);

    return (
        <nav className={styles.sidebar}>
            {NAV_ITEMS.map(({ path, label, Icon }) => {
                const active = location.pathname === path;
                const showBadge = path === '/chat' && chatUnread;
                return (
                    <button
                        key={path}
                        className={`${styles.item} ${active ? styles.active : ''}`}
                        onClick={() => navigate(path)}
                        title={label}
                        aria-label={label}
                    >
                        <span className={styles.icon}>
                            <Icon />
                            {showBadge && <span className={styles.badge} />}
                        </span>
                    </button>
                );
            })}
        </nav>
    );
}
