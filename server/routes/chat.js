const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/chat?after=<id>&before=<id>
// Returns up to 50 messages. ?after=ID fetches newer messages (polling).
// ?before=ID fetches older messages (load earlier history).
router.get('/', (req, res) => {
    const after  = parseInt(req.query.after,  10) || 0;
    const before = parseInt(req.query.before, 10) || 0;

    let rows;
    if (before > 0) {
        // Paginate backwards: return 50 messages older than `before`, newest-first
        // then reverse so the feed renders in ascending order.
        rows = db.prepare(`
            SELECT m.id, m.content, m.created_at, u.id AS user_id, u.username, u.avatar, u.message_color, u.message_color2
            FROM messages m
            JOIN users u ON u.id = m.user_id
            WHERE m.id < ?
            ORDER BY m.id DESC
            LIMIT 50
        `).all(before).reverse();
    } else {
        rows = db.prepare(`
            SELECT m.id, m.content, m.created_at, u.id AS user_id, u.username, u.avatar, u.message_color, u.message_color2
            FROM messages m
            JOIN users u ON u.id = m.user_id
            WHERE m.id > ?
            ORDER BY m.id ASC
            LIMIT 50
        `).all(after);
    }
    return res.json(rows);
});

// POST /api/chat  { content }
router.post('/', (req, res) => {
    const { content } = req.body;
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(422).json({ error: 'Treść wiadomości jest wymagana' });
    }
    if (content.trim().length > 500) {
        return res.status(422).json({ error: 'Wiadomość nie może przekraczać 500 znaków' });
    }
    const row = db.prepare(
        'INSERT INTO messages (user_id, content) VALUES (?, ?) RETURNING id, content, created_at'
    ).get(req.user.id, content.trim());

    const sender = db.prepare('SELECT avatar, message_color, message_color2 FROM users WHERE id = ?').get(req.user.id);
    return res.status(201).json({
        ...row,
        user_id: req.user.id,
        username: req.user.username,
        avatar: sender?.avatar || null,
        message_color: sender?.message_color || '#1e3f6b',
        message_color2: sender?.message_color2 || sender?.message_color || '#1e3f6b',
    });
});

// DELETE /api/chat/:id
// Users may delete their own messages; admins may delete any message.
router.delete('/:id', (req, res) => {
    const msg = db.prepare('SELECT user_id FROM messages WHERE id = ?').get(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Nie znaleziono wiadomości' });

    if (msg.user_id !== req.user.id && !req.user.is_admin) {
        return res.status(403).json({ error: 'Brak uprawnień do usunięcia tej wiadomości' });
    }

    db.prepare('DELETE FROM messages WHERE id = ?').run(req.params.id);
    return res.status(204).end();
});

module.exports = router;
