const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();
const SALT_ROUNDS = 10;

function issueToken(user) {
    return jwt.sign(
        { id: user.id, username: user.username, is_admin: user.is_admin ? 1 : 0 },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || typeof username !== 'string' || username.trim().length < 2) {
        return res.status(422).json({ error: 'Nazwa użytkownika musi mieć co najmniej 2 znaki' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
        return res.status(422).json({ error: 'Hasło musi mieć co najmniej 6 znaków' });
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);

    try {
        const stmt = db.prepare(
            'INSERT INTO users (username, password) VALUES (?, ?) RETURNING id, username'
        );
        const user = stmt.get(username.trim(), hash);
        return res.status(201).json({ token: issueToken(user), user: { id: user.id, username: user.username, avatar: user.avatar || null, is_admin: 0 } });
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

    return res.json({ token: issueToken(user), user: { id: user.id, username: user.username, avatar: user.avatar || null, is_admin: user.is_admin || 0 } });
});

module.exports = router;
