import React, { useState, useEffect, useCallback } from 'react';
import api from '../api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import DayColumn from '../components/DayColumn.jsx';
import AttendanceChart from '../components/AttendanceChart.jsx';
import MonthCalendar from '../components/MonthCalendar.jsx';
import AnnouncementBoard from '../components/AnnouncementBoard.jsx';
import styles from './SchedulePage.module.css';

function todayIso() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function SchedulePage() {
    const { user, refreshCount } = useAuth();
    const [selectedDate, setSelectedDate] = useState(todayIso());
    const [slots, setSlots] = useState([]);
    const [attendanceMap, setAttendanceMap] = useState({});
    const [loading, setLoading] = useState(true);

    const fetchAttendance = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/attendance?from=${selectedDate}&to=${selectedDate}`);
            setSlots(data.slots);
            const map = {};
            for (const entry of data.attendances) {
                map[`${entry.date}::${entry.slot_id}`] = entry;
            }
            setAttendanceMap(map);
        } catch (err) {
            console.error('Failed to fetch attendance', err);
        } finally {
            setLoading(false);
        }
    }, [selectedDate]);

    useEffect(() => {
        fetchAttendance();
    }, [fetchAttendance]);

    async function toggleAttendance(date, slotId) {
        const key = `${date}::${slotId}`;
        const existing = attendanceMap[key];
        const isMarked = existing?.users.some((u) => u.id === user.id);

        setAttendanceMap((prev) => {
            const next = { ...prev };
            if (isMarked) {
                const filtered = (next[key]?.users || []).filter((u) => u.id !== user.id);
                if (filtered.length === 0) {
                    delete next[key];
                } else {
                    next[key] = { ...next[key], users: filtered };
                }
            } else {
                next[key] = {
                    date,
                    slot_id: slotId,
                    users: [...(next[key]?.users || []), { id: user.id, username: user.username }],
                };
            }
            return next;
        });

        try {
            if (isMarked) {
                await api.delete(`/attendance/${slotId}/${date}`);
            } else {
                await api.post('/attendance', { slot_id: slotId, date });
            }
            refreshCount();
        } catch (err) {
            console.error('Toggle failed, reverting', err);
            fetchAttendance();
        }
    }

    return (
        <div className={styles.page}>
            <div className={styles.layout}>
                <aside className={styles.leftPanel}>
                    <div className={styles.calendarRow}>
                        <MonthCalendar
                            selectedDate={selectedDate}
                            onSelect={setSelectedDate}
                        />
                        {loading ? (
                            <p className={styles.loading}>Ładowanie...</p>
                        ) : (
                            <DayColumn
                                date={selectedDate}
                                slots={slots}
                                attendanceMap={attendanceMap}
                                currentUserId={user.id}
                                onToggle={toggleAttendance}
                            />
                        )}
                    </div>
                    <AttendanceChart
                        date={selectedDate}
                        slots={slots}
                        attendanceMap={attendanceMap}
                    />
                </aside>
                <div className={styles.rightPanel}>
                    <AnnouncementBoard />
                </div>
            </div>
        </div>
    );
}
