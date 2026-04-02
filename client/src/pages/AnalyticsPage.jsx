import { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip, Customized,
} from 'recharts';
import api from '../api.js';
import styles from './AnalyticsPage.module.css';

const MONTH_NAMES = [
    'Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec',
    'Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień',
];
const DOW_LABELS = { 1:'Pon', 2:'Wt', 3:'Śr', 4:'Czw', 5:'Pt', 6:'Sob', 7:'Nd' };
const SLOT_GRADIENTS = [
    { top: '#38bdf8', bottom: '#0369a1' },
    { top: '#818cf8', bottom: '#4338ca' },
    { top: '#fb923c', bottom: '#c2410c' },
    { top: '#8378e6', bottom: '#402ea5' },
    { top: '#f472b6', bottom: '#be185d' },
    { top: '#34d399', bottom: '#047857' },
    { top: '#fbbf24', bottom: '#b45309' },
];
const USER_GRAD  = { top: '#c8e8f5', bottom: '#5b9fbf' };
const DOW_GRAD   = { top: '#818cf8', bottom: '#4338ca' };
const TOP_GRAD   = { top: '#c8e8f5', bottom: '#5b9fbf' };

function GradientDefs() {
    return (
        <defs>
            {SLOT_GRADIENTS.map((g, i) => (
                <linearGradient key={`slot-${i}`} id={`ag-slot-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={g.top} stopOpacity={1} />
                    <stop offset="100%" stopColor={g.bottom} stopOpacity={0.6} />
                </linearGradient>
            ))}
            <linearGradient id="ag-dow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={DOW_GRAD.top} stopOpacity={1} />
                <stop offset="100%" stopColor={DOW_GRAD.bottom} stopOpacity={0.6} />
            </linearGradient>
            <linearGradient id="ag-user" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={USER_GRAD.top} stopOpacity={1} />
                <stop offset="100%" stopColor={USER_GRAD.bottom} stopOpacity={0.6} />
            </linearGradient>
            <linearGradient id="ag-top" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={TOP_GRAD.bottom} stopOpacity={0.6} />
                <stop offset="100%" stopColor={TOP_GRAD.top} stopOpacity={1} />
            </linearGradient>
        </defs>
    );
}

function SectionTitle({ children }) {
    return <h2 className={styles.sectionTitle}>{children}</h2>;
}

function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className={styles.tooltipBox}>
            <span className={styles.tooltipLabel}>{label}</span>
            <span className={styles.tooltipValue}>{payload[0].value}</span>
        </div>
    );
}

export default function AnalyticsPage() {
    const now = new Date();
    const [year,  setYear]  = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [data,  setData]  = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        setData(null);
        api.get(`/analytics?year=${year}&month=${month}`)
            .then(({ data }) => setData(data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [year, month]);

    function prevMonth() {
        if (month === 1) { setYear(y => y - 1); setMonth(12); }
        else setMonth(m => m - 1);
    }

    function nextMonth() {
        const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
        if (isCurrentMonth) return;
        if (month === 12) { setYear(y => y + 1); setMonth(1); }
        else setMonth(m => m + 1);
    }

    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

    const dowData = DOW_LABELS
        ? Object.entries(DOW_LABELS).map(([dow, label]) => ({
            label,
            count: data?.byDayOfWeek.find(d => d.dow === Number(dow))?.count || 0,
        }))
        : [];

    const myDays = data?.myDays.map(d => ({
        label: new Date(d.date + 'T00:00:00').toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' }),
        count: d.count,
    })) || [];

    return (
        <div className={styles.page}>
            <div className={styles.monthNav}>
                <button className={styles.navBtn} onClick={prevMonth}>&#8592;</button>
                <span className={styles.monthLabel}>{MONTH_NAMES[month - 1]} {year}</span>
                <button className={styles.navBtn} onClick={nextMonth} disabled={isCurrentMonth}>&#8594;</button>
            </div>

            {loading && <p className={styles.loading}>Ładowanie…</p>}

            {data && (
                <div className={styles.content}>
                    <div className={styles.chartCard}>
                        <SectionTitle>Frekwencja na wejściach</SectionTitle>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={data.slotTotals} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                <Customized component={GradientDefs} />
                                <XAxis dataKey="slot" tick={{ fill: '#94a3b8', fontSize: 13 }} axisLine={false} tickLine={false} />
                                <YAxis hide />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                                <Bar dataKey="count" radius={[6,6,0,0]} isAnimationActive={false}>
                                    {data.slotTotals.map((_, i) => <Cell key={i} fill={`url(#ag-slot-${i % SLOT_GRADIENTS.length})`} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className={styles.chartCard}>
                        <SectionTitle>Aktywność według dnia tygodnia</SectionTitle>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={dowData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                <Customized component={GradientDefs} />
                                <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 13 }} axisLine={false} tickLine={false} />
                                <YAxis hide />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                                <Bar dataKey="count" fill="url(#ag-dow)" radius={[6,6,0,0]} isAnimationActive={false} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {myDays.length > 0 && (
                        <div className={styles.chartCard}>
                            <SectionTitle>Twoje wejścia w tym miesiącu</SectionTitle>
                            <ResponsiveContainer width="100%" height={180}>
                                <BarChart data={myDays} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                    <Customized component={GradientDefs} />
                                    <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                                    <YAxis hide allowDecimals={false} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                                    <Bar dataKey="count" fill="url(#ag-user)" radius={[4,4,0,0]} isAnimationActive={false} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {data.topUsers.length > 0 && (
                        <div className={styles.chartCard}>
                            <SectionTitle>Najbardziej aktywni użytkownicy</SectionTitle>
                            <ResponsiveContainer width="100%" height={data.topUsers.length * 36 + 16}>
                                <BarChart
                                    data={data.topUsers}
                                    layout="vertical"
                                    margin={{ top: 4, right: 32, left: 0, bottom: 4 }}
                                >
                                    <Customized component={GradientDefs} />
                                    <XAxis type="number" hide domain={[0, 'dataMax']} />
                                    <YAxis
                                        dataKey="username"
                                        type="category"
                                        tick={{ fill: '#94a3b8', fontSize: 13 }}
                                        width={100}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                                    <Bar dataKey="count" fill="url(#ag-top)" radius={[0,6,6,0]} barSize={18} isAnimationActive={false} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {data.topUsers.length === 0 && data.slotTotals.every(s => s.count === 0) && (
                        <p className={styles.empty}>Brak danych dla tego miesiąca</p>
                    )}
                </div>
            )}
        </div>
    );
}
