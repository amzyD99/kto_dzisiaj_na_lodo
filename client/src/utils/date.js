export function toIso(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function todayIso() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return toIso(d.getFullYear(), d.getMonth(), d.getDate());
}

export function formatTime(iso) {
    return new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

export function formatDay(iso) {
    return new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' });
}

export function formatDate(iso) {
    return new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
}
