const jwt = require('jsonwebtoken');

/**
 * Express middleware that extracts and verifies a JWT from the
 * Authorization header (Bearer scheme). On success it attaches the
 * decoded payload as req.user; on failure it responds with 401.
 */
function requireAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: 'Brak tokenu autoryzacji' });
    }

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({ error: 'Nieprawidłowy lub wygasły token' });
    }
}

function requireAdmin(req, res, next) {
    if (!req.user?.is_admin) {
        return res.status(403).json({ error: 'Brak uprawnień administratora' });
    }
    next();
}

module.exports = { requireAuth, requireAdmin };
