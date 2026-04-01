const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const SALT_ROUNDS = 10;

function issueToken(user) {
    return jwt.sign(
        { id: user.id, username: user.username, is_admin: user.is_admin ? 1 : 0 },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
}

// PUT /api/me/username  { username }
router.put('/username', (req, res) => {
    const { username } = req.body;
    if (!username || typeof username !== 'string' || username.trim().length < 2) {
        return res.status(422).json({ error: 'Nazwa użytkownika musi mieć co najmniej 2 znaki' });
    }

    try {
        const user = db.prepare(
            'UPDATE users SET username = ? WHERE id = ? RETURNING id, username, avatar, is_admin'
        ).get(username.trim(), req.user.id);

        return res.json({ token: issueToken(user), user: { id: user.id, username: user.username, avatar: user.avatar || null, is_admin: user.is_admin || 0 } });
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            return res.status(409).json({ error: 'Nazwa użytkownika jest już zajęta' });
        }
        throw err;
    }
});

// PUT /api/me/password  { currentPassword, newPassword }
router.put('/password', async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        return res.status(422).json({ error: 'Obecne i nowe hasło są wymagane' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 6) {
        return res.status(422).json({ error: 'Nowe hasło musi mieć co najmniej 6 znaków' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
        return res.status(401).json({ error: 'Obecne hasło jest nieprawidłowe' });
    }

    const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, req.user.id);

    return res.json({ ok: true });
});

module.exports = router;
