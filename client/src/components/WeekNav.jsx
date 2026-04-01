import React from 'react';
import styles from './WeekNav.module.css';

const DAY_NAMES = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'];
const MONTH_NAMES = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];

function formatWeekLabel(weekOffset) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() + weekOffset * 7);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const s = `${DAY_NAMES[start.getDay()]} ${start.getDate()} ${MONTH_NAMES[start.getMonth()]}`;
    const e = `${DAY_NAMES[end.getDay()]} ${end.getDate()} ${MONTH_NAMES[end.getMonth()]}`;
    return `${s} - ${e}`;
}

export default function WeekNav({ weekOffset, onChange }) {
    return (
        <div className={styles.nav}>
            <button
                className={styles.btn}
                onClick={() => onChange(0)}
                disabled={weekOffset === 0}
            >
                &larr; Ten tydzień
            </button>
            <span className={styles.label}>{formatWeekLabel(weekOffset)}</span>
            <button
                className={styles.btn}
                onClick={() => onChange(1)}
                disabled={weekOffset === 1}
            >
                Następny tydzień &rarr;
            </button>
        </div>
    );
}
