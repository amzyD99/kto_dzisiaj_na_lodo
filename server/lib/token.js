const jwt = require('jsonwebtoken');

function issueToken(user) {
    return jwt.sign(
        { id: user.id, username: user.username, is_admin: user.is_admin ? 1 : 0 },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
}

module.exports = { issueToken };
