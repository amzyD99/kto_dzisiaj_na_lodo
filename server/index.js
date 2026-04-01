require('dotenv').config();

// Fail fast if required environment variables are absent
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('FATAL: JWT_SECRET must be set and at least 32 characters long.');
    process.exit(1);
}

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const authRoutes = require('./routes/auth');
const attendanceRoutes = require('./routes/attendance');
const avatarRoutes = require('./routes/avatar');
const statsRoutes = require('./routes/stats');
const profileRoutes = require('./routes/profile');
const announcementRoutes = require('./routes/announcements');
const adminRoutes = require('./routes/admin');
const chatRoutes = require('./routes/chat');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const PORT = process.env.PORT || 3001;

// Limit login and register to 20 attempts per 15 minutes per IP
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Zbyt wiele prób. Spróbuj ponownie za 15 minut.' },
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/avatar', avatarRoutes);
app.use('/api/me/stats', statsRoutes);
app.use('/api/me', profileRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/analytics', analyticsRoutes);

// Generic error handler - keeps stack traces off the wire in production
app.use((err, req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
