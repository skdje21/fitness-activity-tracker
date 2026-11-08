const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User } = require('../models');
const authMiddleware = require('../middleware/auth');


const router = express.Router();

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 5 * 60 * 1000; // 5 минут

// ---------- Сброс пароля ----------
// Хранилище кодов подтверждения: email → { code, expiresAt }
const resetCodes = new Map();
const RESET_CODE_TTL = 10 * 60 * 1000; // 10 минут

// Отправка кода по email (nodemailer) или вывод в консоль
async function sendResetCode(email, code) {
    // Попытка отправить через SMTP если настроен
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        try {
            const nodemailer = require('nodemailer');
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: Number(process.env.SMTP_PORT) || 587,
                secure: (process.env.SMTP_PORT || '587') === '465',
                auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
            });
            await transporter.sendMail({
                from: process.env.SMTP_FROM || process.env.SMTP_USER,
                to: email,
                subject: 'Код сброса пароля — Fitness Tracker',
                text: `Ваш код подтверждения: ${code}\n\nКод действителен 10 минут.`,
                html: `<p>Ваш код подтверждения: <b style="font-size:24px;letter-spacing:4px">${code}</b></p><p>Код действителен 10 минут.</p>`,
            });
            console.log(`[RESET] Код отправлен на ${email}`);
            return;
        } catch (err) {
            console.error('[RESET] Ошибка отправки email:', err.message);
        }
    }
    // Fallback: вывод в консоль (для демо / защиты)
    console.log(`\n===== КОД СБРОСА ПАРОЛЯ =====`);
    console.log(`Email: ${email}`);
    console.log(`Код:   ${code}`);
    console.log(`Действителен 10 минут`);
    console.log(`=============================\n`);
}

// POST /auth/forgot-password — запрос кода
router.post('/forgot-password', async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email || typeof email !== 'string') {
            return res.status(400).json({ error: 'Введите email' });
        }

        const user = await User.findOne({ where: { email } });
        // Не раскрываем, существует ли аккаунт (безопасность)
        if (!user) {
            return res.json({ message: 'Если аккаунт существует, код отправлен на указанную почту' });
        }

        const code = crypto.randomInt(100000, 999999).toString();
        resetCodes.set(email.toLowerCase(), { code, expiresAt: Date.now() + RESET_CODE_TTL });

        await sendResetCode(email, code);

        res.json({ message: 'Если аккаунт существует, код отправлен на указанную почту' });
    } catch (err) {
        next(err);
    }
});

// POST /auth/reset-password — проверка кода и установка нового пароля
router.post('/reset-password', async (req, res, next) => {
    try {
        const { email, code, newPassword } = req.body;

        if (!email || !code || !newPassword) {
            return res.status(400).json({ error: 'Заполните все поля' });
        }
        if (typeof newPassword !== 'string' || newPassword.length < 6) {
            return res.status(400).json({ error: 'Пароль должен быть не короче 6 символов' });
        }

        const entry = resetCodes.get(email.toLowerCase());
        if (!entry || entry.code !== String(code) || Date.now() > entry.expiresAt) {
            return res.status(400).json({ error: 'Неверный или просроченный код' });
        }

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(400).json({ error: 'Пользователь не найден' });
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
        await user.update({ passwordHash, failedLoginAttempts: 0, lockUntil: null });
        resetCodes.delete(email.toLowerCase());

        res.json({ message: 'Пароль успешно изменён' });
    } catch (err) {
        next(err);
    }
});

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
