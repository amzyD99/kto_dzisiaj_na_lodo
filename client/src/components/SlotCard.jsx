import React, { useState, useEffect, useRef } from 'react';
import styles from './SlotCard.module.css';

function formatCount(n) {
    if (n === 1) return '1 osoba';
    if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return `${n} osoby`;
    return `${n} osób`;
}

function UserBubble({ user }) {
    const [tooltipOpen, setTooltipOpen] = useState(false);
    const ref = useRef(null);
    const [pos, setPos] = useState(null);

    useEffect(() => {
        if (!tooltipOpen) return;
        function handleOutside(e) {
            if (ref.current && !ref.current.contains(e.target)) {
                setTooltipOpen(false);
            }
        }
        document.addEventListener('mousedown', handleOutside);
        document.addEventListener('touchstart', handleOutside);
        return () => {
            document.removeEventListener('mousedown', handleOutside);
            document.removeEventListener('touchstart', handleOutside);
        };
    }, [tooltipOpen]);

    useEffect(() => {
        if (!tooltipOpen || !ref.current) { setPos(null); return; }
        const rect = ref.current.getBoundingClientRect();
        setPos({ top: rect.top - 8, left: rect.left + rect.width / 2 });
    }, [tooltipOpen]);

    return (
        <div
            ref={ref}
            className={styles.bubble}
            onPointerEnter={(e) => { if (e.pointerType === 'mouse') setTooltipOpen(true); }}
            onPointerLeave={(e) => { if (e.pointerType === 'mouse') setTooltipOpen(false); }}
            onClick={(e) => { if (e.pointerType !== 'mouse') setTooltipOpen((v) => !v); }}
        >
            {user.avatar
                ? <img className={styles.bubbleImg} src={`/uploads/${user.avatar}`} alt={user.username} />
                : <span className={styles.bubbleInitial}>{user.username[0].toUpperCase()}</span>
            }
            {tooltipOpen && pos && (
                <div
                    className={styles.tooltip}
                    style={{ position: 'fixed', top: pos.top, left: pos.left, transform: 'translate(-50%, -100%)' }}
                >
                    {user.avatar
                        ? <img className={styles.tooltipImg} src={`/uploads/${user.avatar}`} alt={user.username} />
                        : <span className={styles.tooltipInitial}>{user.username[0].toUpperCase()}</span>
                    }
                    <span className={styles.tooltipName}>{user.username}</span>
                </div>
            )}
        </div>
    );
}

export default function SlotCard({ slot, users, isMarked, readonly, onToggle }) {
    const [open, setOpen] = useState(false);
    const count = users.length;

    return (
        <div className={`${styles.card} ${isMarked ? styles.marked : ''}`}>
            <div className={styles.top}>
                <span className={styles.time}>{slot.label}</span>
                <button
                    className={`${styles.toggleBtn} ${isMarked ? styles.toggleActive : ''}`}
                    onClick={onToggle}
                    disabled={readonly}
                    title={readonly ? 'Nie można edytować przeszłych dat' : isMarked ? 'Anuluj obecność' : 'Zaznacz obecność'}
                >
                    {isMarked ? 'ide' : 'ide'}
                </button>
            </div>
            {count > 0 && (
                <button
                    className={styles.countBtn}
                    onClick={() => setOpen((v) => !v)}
                    aria-expanded={open}
                >
                    {formatCount(count)}
                    <span className={styles.arrow}>{open ? '▲' : '▼'}</span>
                </button>
            )}
            {open && count > 0 && (
                <div className={styles.bubbleRow}>
                    {users.map((u) => (
                        <UserBubble key={u.id} user={u} />
                    ))}
                </div>
            )}
        </div>
    );
}
