const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const authMiddleware = require('../middleware/auth');


const router = express.Router();

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 5 * 60 * 1000; // 5 минут

router.post('/register', async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || typeof email !== 'string') {
            return res.status(400).json({ error: 'Поле "email" обязательно и должно быть строкой' });
        }
        if (!password || typeof password !== 'string' || password.length < 6) {
            return res.status(400).json({ error: 'Поле "password" обязательно, минимум 6 символов' });
        }

        const existing = await User.findOne({ where: { email } });
        if (existing) {
            return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await User.create({ email, passwordHash });

        res.status(201).json({ id: user.id, email: user.email });
    } catch (error) {
        next(error);
    }
});

router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Поля "email" и "password" обязательны' });
        }

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }

        if (user.lockUntil && user.lockUntil > new Date()) {
            const secondsLeft = Math.ceil((user.lockUntil - new Date()) / 1000);
            return res.status(423).json({
                error: `Учётная запись временно заблокирована. Повторите попытку через ${secondsLeft} сек.`,
            });
        }

        const passwordMatches = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatches) {
            const attempts = user.failedLoginAttempts + 1;
            const update = { failedLoginAttempts: attempts };

            if (attempts >= MAX_FAILED_ATTEMPTS) {
                update.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
                update.failedLoginAttempts = 0;
            }

            await user.update(update);
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }

        if (user.failedLoginAttempts > 0 || user.lockUntil) {
            await user.update({ failedLoginAttempts: 0, lockUntil: null });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({ token });
    } catch (error) {
        next(error);
    }
});

router.get('/profile', authMiddleware, async (req, res, next) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        res.status(200).json({ id: user.id, email: user.email });
    } catch (error) {
        next(error);
    }
});

router.delete('/me', authMiddleware, async (req, res, next) => {
    try {
        const deletedCount = await User.destroy({ where: { id: req.user.id } });
        if (deletedCount === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        res.status(200).json({ message: 'Аккаунт удалён' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
