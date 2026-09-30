const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

const router = express.Router();

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

        const passwordMatches = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatches) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
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

module.exports = router;
