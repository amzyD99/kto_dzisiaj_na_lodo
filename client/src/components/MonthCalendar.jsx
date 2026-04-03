import { useState } from 'react';
import { MONTH_NAMES, DAY_HEADERS } from '../utils/locale.js';
import { toIso } from '../utils/date.js';
import styles from './MonthCalendar.module.css';

export default function MonthCalendar({ selectedDate, onSelect }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = toIso(today.getFullYear(), today.getMonth(), today.getDate());

    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    // Monday-based offset: getDay() returns 0=Sun; (dow+6)%7 maps Mon→0, Sun→6
    const offset = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;

    const cells = Array(offset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    function prevMonth() {
        if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
        else setViewMonth(m => m - 1);
    }

    function nextMonth() {
        if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
        else setViewMonth(m => m + 1);
    }

    return (
        <div className={styles.calendar}>
            <div className={styles.header}>
                <button className={styles.navBtn} onClick={prevMonth}>&larr;</button>
                <span className={styles.monthLabel}>{MONTH_NAMES[viewMonth]} {viewYear}</span>
                <button className={styles.navBtn} onClick={nextMonth}>&rarr;</button>
            </div>
            <div className={styles.grid}>
                {DAY_HEADERS.map(d => (
                    <span key={d} className={styles.dayHeader}>{d}</span>
                ))}
                {cells.map((day, i) => {
                    if (day === null) return <span key={`e-${i}`} />;
                    const iso = toIso(viewYear, viewMonth, day);
                    const isToday = iso === todayIso;
                    const isSelected = iso === selectedDate;
                    return (
                        <button
                            key={iso}
                            className={[
                                styles.day,
                                isToday ? styles.today : '',
                                isSelected ? styles.selected : '',
                            ].join(' ')}
                            onClick={() => onSelect(iso)}
                        >
                            {day}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
