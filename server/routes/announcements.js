const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/announcements  — all announcements, newest first
router.get('/', (req, res) => {
    const rows = db.prepare(`
        SELECT a.id, a.content, a.created_at, a.updated_at,
               u.id AS author_id, u.username AS author
        FROM announcements a
        JOIN users u ON u.id = a.author_id
        ORDER BY a.created_at DESC
    `).all();
    return res.json(rows);
});

// POST /api/announcements  { content }  — admin only
router.post('/', requireAdmin, (req, res) => {
    const { content } = req.body;
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(422).json({ error: 'Treść ogłoszenia jest wymagana' });
    }
    if (content.trim().length > 2000) {
        return res.status(422).json({ error: 'Treść ogłoszenia nie może przekraczać 2000 znaków' });
    }
    const row = db.prepare(
        'INSERT INTO announcements (content, author_id) VALUES (?, ?) RETURNING id, content, created_at, updated_at'
    ).get(content.trim(), req.user.id);
    return res.status(201).json({ ...row, author: req.user.username, author_id: req.user.id });
});

// PUT /api/announcements/:id  { content }  — admin only
router.put('/:id', requireAdmin, (req, res) => {
    const { content } = req.body;
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(422).json({ error: 'Treść ogłoszenia jest wymagana' });
    }
    if (content.trim().length > 2000) {
        return res.status(422).json({ error: 'Treść ogłoszenia nie może przekraczać 2000 znaków' });
    }
    const row = db.prepare(`
        UPDATE announcements
        SET content = ?, updated_at = datetime('now')
        WHERE id = ?
        RETURNING id, content, created_at, updated_at
    `).get(content.trim(), req.params.id);
    if (!row) return res.status(404).json({ error: 'Nie znaleziono ogłoszenia' });

    const author = db.prepare('SELECT id, username FROM users WHERE id = (SELECT author_id FROM announcements WHERE id = ?)').get(req.params.id);
    return res.json({ ...row, author: author?.username, author_id: author?.id });
});

// DELETE /api/announcements/:id  — admin only
router.delete('/:id', requireAdmin, (req, res) => {
    const result = db.prepare('DELETE FROM announcements WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Nie znaleziono ogłoszenia' });
    return res.status(204).end();
});

module.exports = router;
