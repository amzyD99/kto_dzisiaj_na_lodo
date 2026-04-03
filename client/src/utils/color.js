/**
 * Returns a contrasting text color (dark or light) for a given hex background.
 * Uses the sRGB relative luminance formula (ITU-R BT.709 coefficients).
 */
export function contrastText(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return L > 0.45 ? '#0f172a' : '#e2e8f0';
}

/**
 * Computes the average of two hex colors, returned as a hex string.
 */
export function averageHex(c1, c2) {
    const toHex = (v) => Math.round(v).toString(16).padStart(2, '0');
    const avg = (i) => (parseInt(c1.slice(i, i + 2), 16) + parseInt(c2.slice(i, i + 2), 16)) / 2;
    return `#${toHex(avg(1))}${toHex(avg(3))}${toHex(avg(5))}`;
}
