const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { issueToken } = require('../lib/token');
const { SALT_ROUNDS, DEFAULT_MESSAGE_COLOR } = require('../lib/constants');

const router = express.Router();
router.use(requireAuth);

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

        const full = db.prepare('SELECT message_color, message_color2 FROM users WHERE id = ?').get(user.id);
        return res.json({ token: issueToken(user), user: { id: user.id, username: user.username, avatar: user.avatar || null, is_admin: user.is_admin || 0, message_color: full?.message_color || DEFAULT_MESSAGE_COLOR, message_color2: full?.message_color2 || full?.message_color || DEFAULT_MESSAGE_COLOR } });
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            return res.status(409).json({ error: 'Nazwa użytkownika jest już zajęta' });
        }
        throw err;
    }
});

// PUT /api/me/color  { color, color2 }  — sets the user's chat bubble gradient
router.put('/color', (req, res) => {
    const { color, color2 } = req.body;
    const hex = /^#[0-9a-fA-F]{6}$/;
    if (!color || !hex.test(color)) {
        return res.status(422).json({ error: 'Nieprawidłowy format koloru (wymagany #rrggbb)' });
    }
    if (color2 && !hex.test(color2)) {
        return res.status(422).json({ error: 'Nieprawidłowy format drugiego koloru (wymagany #rrggbb)' });
    }
    const c2 = color2 || color;
    db.prepare('UPDATE users SET message_color = ?, message_color2 = ? WHERE id = ?').run(color, c2, req.user.id);
    return res.json({ color, color2: c2 });
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
