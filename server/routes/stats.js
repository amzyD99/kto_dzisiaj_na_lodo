const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function todayISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// GET /api/me/stats  — returns the resettable attendance count for the caller.
// Only entries with date < today are counted; the current day is tallied once it ends.
// count = past_attendance_rows - offset recorded at last reset.
router.get('/', (req, res) => {
    const total = db.prepare(
        'SELECT COUNT(*) AS n FROM attendances WHERE user_id = ? AND date < ?'
    ).get(req.user.id, todayISO()).n;

    const { attendance_offset } = db.prepare(
        'SELECT attendance_offset FROM users WHERE id = ?'
    ).get(req.user.id);

    // Clamp to zero: if historical records were deleted after a reset the offset
    // can exceed the current total, which would produce a negative display value.
    return res.json({ count: Math.max(0, total - attendance_offset) });
});

// POST /api/me/stats/reset  — sets offset to current past total, making count = 0.
router.post('/reset', (req, res) => {
    const total = db.prepare(
        'SELECT COUNT(*) AS n FROM attendances WHERE user_id = ? AND date < ?'
    ).get(req.user.id, todayISO()).n;

    db.prepare(
        'UPDATE users SET attendance_offset = ? WHERE id = ?'
    ).run(total, req.user.id);

    return res.json({ count: 0 });
});

module.exports = router;
