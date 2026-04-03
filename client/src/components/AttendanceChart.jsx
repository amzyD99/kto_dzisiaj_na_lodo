import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Cell,
    ResponsiveContainer,
    Customized,
} from 'recharts';
import styles from './AttendanceChart.module.css';

const MAX_ATTENDEES = 20;

const SLOT_COLORS = {
    '11:00': { top: '#f472b6', bottom: '#be185d' },
    '12:30': { top: '#34d399', bottom: '#047857' },
    '14:00': { top: '#fbbf24', bottom: '#b45309' },
    '15:30': { top: '#38bdf8', bottom: '#0369a1' },
    '17:00': { top: '#818cf8', bottom: '#4338ca' },
    '18:30': { top: '#fb923c', bottom: '#c2410c' },
    '20:00': { top: '#8378e6', bottom: '#402ea5' },
};

const FALLBACK = { top: '#94a3b8', bottom: '#475569' };

function GradientDefs() {
    return (
        <defs>
            {Object.entries(SLOT_COLORS).map(([label, { top, bottom }]) => (
                <linearGradient key={label} id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={top} stopOpacity={1} />
                    <stop offset="100%" stopColor={bottom} stopOpacity={0.6} />
                </linearGradient>
            ))}
        </defs>
    );
}

function buildChartData(date, slots, attendanceMap) {
    return slots.map((slot) => ({
        slot: slot.label,
        count: attendanceMap[`${date}::${slot.id}`]?.users.length || 0,
        gradientId: SLOT_COLORS[slot.label] ? `grad-${slot.label}` : null,
        fill: FALLBACK.top,
    }));
}

export default function AttendanceChart({ date, slots, attendanceMap }) {
    const data = buildChartData(date, slots, attendanceMap);

    return (
        <div className={styles.wrapper}>
            <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data} layout="horizontal" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <Customized component={GradientDefs} />
                    <XAxis
                        dataKey="slot"
                        type="category"
                        tick={{ fill: '#94a3b8', fontSize: 18 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        type="number"
                        domain={[0, MAX_ATTENDEES]}
                        hide={true}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={32} isAnimationActive={false}>
                        {data.map((entry, index) => (
                            <Cell
                                key={index}
                                fill={entry.gradientId ? `url(#${entry.gradientId})` : entry.fill}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
