const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/analytics?year=YYYY&month=M
// All four datasets are scoped to the requested calendar month.
// year and month default to the current month when omitted.
router.get('/', (req, res) => {
    const now = new Date();
    const year  = parseInt(req.query.year,  10) || now.getFullYear();
    const month = parseInt(req.query.month, 10) || (now.getMonth() + 1);

    // Zero-padded YYYY-MM prefix used in SQLite date comparisons.
    const ym = `${year}-${String(month).padStart(2, '0')}`;

    const slotTotals = db.prepare(`
        SELECT t.label AS slot, COUNT(a.id) AS count
        FROM time_slots t
        LEFT JOIN attendances a ON a.slot_id = t.id
            AND strftime('%Y-%m', a.date) = ?
        GROUP BY t.id
        ORDER BY t.id
    `).all(ym);

    const topUsers = db.prepare(`
        SELECT u.username, COUNT(a.id) AS count
        FROM users u
        LEFT JOIN attendances a ON a.user_id = u.id
            AND strftime('%Y-%m', a.date) = ?
        GROUP BY u.id
        HAVING count > 0
        ORDER BY count DESC
        LIMIT 10
    `).all(ym);

    // SQLite strftime('%w') returns 0=Sun…6=Sat; remap to 1=Mon…7=Sun
    const byDayOfWeek = db.prepare(`
        SELECT
            CASE CAST(strftime('%w', date) AS INTEGER)
                WHEN 0 THEN 7
                ELSE CAST(strftime('%w', date) AS INTEGER)
            END AS dow,
            COUNT(*) AS count
        FROM attendances
        WHERE strftime('%Y-%m', date) = ?
        GROUP BY dow
        ORDER BY dow
    `).all(ym);

    const myDays = db.prepare(`
        SELECT date, COUNT(*) AS count
        FROM attendances
        WHERE user_id = ?
          AND strftime('%Y-%m', date) = ?
        GROUP BY date
        ORDER BY date ASC
    `).all(req.user.id, ym);

    return res.json({ slotTotals, topUsers, byDayOfWeek, myDays });
});

module.exports = router;
