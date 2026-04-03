import React from 'react';
import SlotCard from './SlotCard.jsx';
import styles from './DayColumn.module.css';

const DAY_NAMES = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
const MONTH_NAMES = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];

export default function DayColumn({ date, slots, attendanceMap, currentUserId, onToggle }) {
    const d = new Date(date + 'T00:00:00');
    const todayISO = new Date().toISOString().slice(0, 10);
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 13);
    const maxISO = maxDate.toISOString().slice(0, 10);
    const isToday = date === todayISO;
    const isPast = date < todayISO;
    const isOutOfScope = date > maxISO;

    return (
        <div className={`${styles.column} ${isToday ? styles.today : ''}`}>
            <div className={styles.slots}>
                {slots.map((slot) => {
                    const entry = attendanceMap[`${date}::${slot.id}`];
                    const users = entry?.users || [];
                    const isMarked = users.some((u) => u.id === currentUserId);
                    return (
                        <SlotCard
                            key={slot.id}
                            slot={slot}
                            users={users}
                            isMarked={isMarked}
                            readonly={isPast || isOutOfScope}
                            onToggle={() => onToggle(date, slot.id)}
                        />
                    );
                })}
            </div>
        </div>
    );
}
