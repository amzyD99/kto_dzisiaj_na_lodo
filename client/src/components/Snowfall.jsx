import React, { useMemo } from 'react';
import styles from './Snowfall.module.css';

const isMobile = window.matchMedia('(hover: none)').matches || window.matchMedia('(max-width: 768px)').matches;
const PARTICLE_COUNT = isMobile ? 80 : 200;
const SNOW_COLORS = ['#e2e8f0', '#bfdbfe', '#c7d2fe', '#dbeafe', '#f0f9ff'];

function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
}

function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

export default function Snowfall() {
    const particles = useMemo(() => {
        return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
            id: i,
            left: randomBetween(0, 100),
            size: randomBetween(10, 18),
            duration: randomBetween(6, 14),
            delay: randomBetween(-14, 0),
            drift: randomBetween(-30, 30),
            opacity: randomBetween(0.4, 0.9),
            rotation: randomBetween(0, 360),
            color: randomItem(SNOW_COLORS),
        }));
    }, []);

    return (
        <div className={styles.container} aria-hidden="true">
            {particles.map((p) => (
                <span
                    key={p.id}
                    className={styles.particle}
                    style={{
                        left: `${p.left}%`,
                        fontSize: p.size,
                        animationDuration: `${p.duration}s`,
                        animationDelay: `${p.delay}s`,
                        opacity: p.opacity,
                        '--drift': `${p.drift}px`,
                        '--rotation': `${p.rotation}deg`,
                        color: p.color,
                    }}
                >&#10052;</span>
            ))}
        </div>
    );
}
