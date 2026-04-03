const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { SALT_ROUNDS } = require('../lib/constants');

const router = express.Router();
router.use(requireAuth, requireAdmin);

// GET /api/admin/users  — list all users
router.get('/users', (req, res) => {
    const users = db.prepare(
        'SELECT id, username, is_admin, created_at FROM users ORDER BY id'
    ).all();
    return res.json(users);
});

// PUT /api/admin/users/:id/password  { newPassword }
router.put('/users/:id/password', async (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
        return res.status(422).json({ error: 'Hasło musi mieć co najmniej 6 znaków' });
    }

    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'Nie znaleziono użytkownika' });

    const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, req.params.id);

    return res.json({ ok: true });
});

// DELETE /api/admin/users/:id  { adminPassword }
// Requires the acting admin to confirm with their own password before deletion.
router.delete('/users/:id', async (req, res) => {
    const { adminPassword } = req.body;
    if (!adminPassword) {
        return res.status(422).json({ error: 'Potwierdzenie hasłem jest wymagane' });
    }

    if (String(req.params.id) === String(req.user.id)) {
        return res.status(400).json({ error: 'Nie możesz usunąć własnego konta z panelu admina' });
    }

    const admin = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
    const match = await bcrypt.compare(adminPassword, admin.password);
    if (!match) {
        return res.status(401).json({ error: 'Nieprawidłowe hasło administratora' });
    }

    const target = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
    if (!target) return res.status(404).json({ error: 'Nie znaleziono użytkownika' });

    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    return res.status(204).end();
});

module.exports = router;
