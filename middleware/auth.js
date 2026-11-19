const jwt = require('jsonwebtoken');
const { isTokenBlacklisted } = require('../db/redis');

async function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }

    const token = authHeader.slice('Bearer '.length);

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (await isTokenBlacklisted(token)) {
            return res.status(401).json({ error: 'Токен отозван (logout)' });
        }

        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Недействительный или просроченный токен' });
    }
}

module.exports = authMiddleware;
