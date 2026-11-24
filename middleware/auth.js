const jwt = require('jsonwebtoken');
const { isTokenBlacklisted } = require('../db/redis');
const { User } = require('../models');

async function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }

    const token = authHeader.slice('Bearer '.length);

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return res.status(401).json({ error: 'Недействительный или просроченный токен' });
    }

    try {
        if (await isTokenBlacklisted(token)) {
            return res.status(401).json({ error: 'Токен отозван (logout)' });
        }

        // Роль и бан читаем из БД, а не из токена: тогда блокировка и смена роли
        // действуют сразу, не дожидаясь истечения старого токена.
        const user = await User.findByPk(decoded.id, {
            attributes: ['id', 'role', 'isBlocked'],
        });
        if (!user) {
            return res.status(401).json({ error: 'Пользователь не найден' });
        }
        if (user.isBlocked) {
            return res.status(403).json({ error: 'Аккаунт заблокирован администратором' });
        }

        req.user = { ...decoded, role: user.role };
        next();
    } catch (error) {
        next(error);
    }
}

module.exports = authMiddleware;
