const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const UPLOADS_DIR = path.join(__dirname, '../uploads');

// Allowed MIME types and their corresponding file extensions.
const ALLOWED_MIME = {
    'image/jpeg': '.jpg',
    'image/png':  '.png',
    'image/webp': '.webp',
};

// Reads the first 12 bytes of a file and checks for known image magic bytes.
// Returns true only for JPEG, PNG, and WebP files regardless of declared MIME type.
function hasValidMagicBytes(filePath) {
    const buf = Buffer.alloc(12);
    const fd = fs.openSync(filePath, 'r');
    try {
        fs.readSync(fd, buf, 0, 12, 0);
    } finally {
        fs.closeSync(fd);
    }
    // JPEG: FF D8 FF
    if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return true;
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47 &&
        buf[4] === 0x0D && buf[5] === 0x0A && buf[6] === 0x1A && buf[7] === 0x0A) return true;
    // WebP: RIFF????WEBP
    if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
        buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return true;
    return false;
}

const storage = multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (req, file, cb) => {
        // Use the canonical extension from the MIME type, not the user-supplied filename.
        const ext = ALLOWED_MIME[file.mimetype] || '.jpg';
        cb(null, `${req.user.id}_${Date.now()}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        cb(null, file.mimetype in ALLOWED_MIME);
    },
});

// POST /api/avatar  (multipart, field name: "avatar")
router.post('/', requireAuth, upload.single('avatar'), (req, res) => {
    if (!req.file) {
        return res.status(422).json({ error: 'No valid image file provided' });
    }

    // Validate actual file content against magic bytes — the MIME type declared
    // in the request header is user-controlled and cannot be trusted on its own.
    if (!hasValidMagicBytes(req.file.path)) {
        fs.unlink(req.file.path, () => {});
        return res.status(422).json({ error: 'Plik nie jest prawidłowym obrazem' });
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
