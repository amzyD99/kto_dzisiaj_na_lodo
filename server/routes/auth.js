const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const SALT_ROUNDS = 10;
const TOKEN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// Derives a registration token from the current 15-minute window index using
// HMAC-SHA256. The window index changes every 15 minutes, producing a new
// token automatically without any persistent state.
function getRegistrationToken() {
    const window = Math.floor(Date.now() / TOKEN_WINDOW_MS);
    return crypto
        .createHmac('sha256', process.env.JWT_SECRET)
        .update(String(window))
        .digest('hex')
        .slice(0, 8)
        .toUpperCase();
}

// GET /api/auth/register-token  — admin only
router.get('/register-token', requireAuth, requireAdmin, (req, res) => {
    const token = getRegistrationToken();
    const msUntilRotation = TOKEN_WINDOW_MS - (Date.now() % TOKEN_WINDOW_MS);
    res.json({ token, secondsUntilRotation: Math.ceil(msUntilRotation / 1000) });
});

function issueToken(user) {
    return jwt.sign(
        { id: user.id, username: user.username, is_admin: user.is_admin ? 1 : 0 },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { username, password, registrationToken } = req.body;

    if (!username || typeof username !== 'string' || username.trim().length < 2) {
        return res.status(422).json({ error: 'Nazwa użytkownika musi mieć co najmniej 2 znaki' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
        return res.status(422).json({ error: 'Hasło musi mieć co najmniej 6 znaków' });
    }
    if (!registrationToken || registrationToken.toUpperCase() !== getRegistrationToken()) {
        return res.status(403).json({ error: 'Nieprawidłowy token rejestracji' });
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);

    try {
        const stmt = db.prepare(
            'INSERT INTO users (username, password) VALUES (?, ?) RETURNING id, username'
        );
        const user = stmt.get(username.trim(), hash);
        const full = db.prepare('SELECT message_color, message_color2 FROM users WHERE id = ?').get(user.id);
        return res.status(201).json({ token: issueToken(user), user: { id: user.id, username: user.username, avatar: null, is_admin: 0, message_color: full?.message_color || '#1e3f6b', message_color2: full?.message_color2 || '#1e3f6b' } });
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            return res.status(409).json({ error: 'Nazwa użytkownika jest już zajęta' });
        }
        throw err;
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(422).json({ error: 'Nazwa użytkownika i hasło są wymagane' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim());
    if (!user) {
        return res.status(401).json({ error: 'Nieprawidłowe dane logowania' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
        return res.status(401).json({ error: 'Nieprawidłowe dane logowania' });
    }

    return res.json({ token: issueToken(user), user: { id: user.id, username: user.username, avatar: user.avatar || null, is_admin: user.is_admin || 0, message_color: user.message_color || '#1e3f6b', message_color2: user.message_color2 || user.message_color || '#1e3f6b' } });
});

module.exports = router;
