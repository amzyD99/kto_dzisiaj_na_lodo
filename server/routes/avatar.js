const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const UPLOADS_DIR = path.join(__dirname, '../uploads');

const storage = multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${req.user.id}_${Date.now()}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        cb(null, allowed.includes(file.mimetype));
    },
});

// POST /api/avatar  (multipart, field name: "avatar")
router.post('/', requireAuth, upload.single('avatar'), (req, res) => {
    if (!req.file) {
        return res.status(422).json({ error: 'No valid image file provided' });
    }

    // Update the database first. Only delete the old file after the DB write
    // succeeds — this prevents a state where the DB references a file that no
    // longer exists if the process crashes between the two operations.
    const current = db.prepare('SELECT avatar FROM users WHERE id = ?').get(req.user.id);
    db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(req.file.filename, req.user.id);

    if (current?.avatar) {
        const old = path.join(UPLOADS_DIR, current.avatar);
        fs.unlink(old, () => {});
    }

    return res.json({ avatar: req.file.filename });
});

module.exports = router;
