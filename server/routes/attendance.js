const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// All attendance routes require authentication
router.use(requireAuth);

/**
 * Returns today's date and the date 13 days from now (inclusive 14-day window)
 * as ISO 8601 strings in local time, computed fresh on each call so the
 * window always reflects the current calendar day at request time.
 */
function getAllowedWindow() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const max = new Date(today);
    max.setDate(today.getDate() + 13);

    function toISO(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    return { min: toISO(today), max: toISO(max) };
}

// GET /api/attendance?from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns all time slots and a flat list of (date, slot_id, users[]) tuples.
router.get('/', (req, res) => {
    const { from, to } = req.query;
    if (!from || !to) {
        return res.status(400).json({ error: 'Parametry zapytania "from" i "to" są wymagane' });
    }

    const slots = db.prepare('SELECT id, label, weekend_only FROM time_slots ORDER BY label').all();

    // Retrieve every attendance row in the requested range, joined with the
    // attending user's username so a single query hydrates the full grid.
    const rows = db.prepare(`
        SELECT a.date, a.slot_id, u.id AS user_id, u.username, u.avatar
        FROM attendances a
        JOIN users u ON u.id = a.user_id
        WHERE a.date >= ? AND a.date <= ?
        ORDER BY a.date, a.slot_id
    `).all(from, to);

    // Aggregate into (date, slot_id) => users[] map using a composite key.
    const map = {};
    for (const row of rows) {
        const key = `${row.date}::${row.slot_id}`;
        if (!map[key]) {
            map[key] = { date: row.date, slot_id: row.slot_id, users: [] };
        }
        map[key].users.push({ id: row.user_id, username: row.username, avatar: row.avatar || null });
    }

    return res.json({ slots, attendances: Object.values(map) });
});

// POST /api/attendance  { slot_id, date }
router.post('/', (req, res) => {
    const { slot_id, date } = req.body;

    if (!slot_id || !date) {
        return res.status(400).json({ error: 'slot_id i data są wymagane' });
    }

    const { min, max } = getAllowedWindow();
    if (date < min || date > max) {
        return res.status(400).json({ error: `Data musi być z zakresu ${min} do ${max}` });
    }

    const slotExists = db.prepare('SELECT 1 FROM time_slots WHERE id = ?').get(slot_id);
    if (!slotExists) {
        return res.status(400).json({ error: 'Nieprawidłowy identyfikator wejścia' });
    }

    try {
        const stmt = db.prepare(
            'INSERT INTO attendances (user_id, slot_id, date) VALUES (?, ?, ?) RETURNING id, user_id, slot_id, date'
        );
        const row = stmt.get(req.user.id, slot_id, date);
        return res.status(201).json(row);
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            return res.status(409).json({ error: 'Obecność już zaznaczona' });
        }
        throw err;
    }
});

// DELETE /api/attendance/:slot_id/:date
router.delete('/:slot_id/:date', (req, res) => {
    const { slot_id, date } = req.params;

    const result = db.prepare(
        'DELETE FROM attendances WHERE user_id = ? AND slot_id = ? AND date = ?'
    ).run(req.user.id, slot_id, date);

    if (result.changes === 0) {
        return res.status(404).json({ error: 'Nie znaleziono wpisu obecności' });
    }

    return res.status(204).end();
});

module.exports = router;
