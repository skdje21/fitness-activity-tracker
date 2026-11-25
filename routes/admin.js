// Админ-панель: аналитика платформы, управление пользователями и модерация активностей.
// Все маршруты монтируются с authMiddleware + isAdmin (см. server.js).
const express = require('express');
const { QueryTypes } = require('sequelize');
const { sequelize, User, Activity } = require('../models');
const UserProfile = require('../models/UserProfile');
const WeightEntry = require('../models/WeightEntry');
const Achievement = require('../models/Achievement');
const DailyStat = require('../models/DailyStat');
const { cacheDel } = require('../db/redis');

const router = express.Router();

const USER_SORTS = {
    createdAt: 'u."createdAt" DESC',
    activity: '"activityCount" DESC',
    steps: '"totalSteps" DESC',
    // Пользователи без имени уходят в конец, иначе они забивают начало списка
    name: 'u.name ASC NULLS LAST',
};

function intParam(value, def, min, max) {
    const n = parseInt(value, 10);
    if (!Number.isFinite(n)) return def;
    return Math.min(max, Math.max(min, n));
}

// ---------------------------------------------------------------
// GET /admin/overview — сводка по всей платформе
// ---------------------------------------------------------------
router.get('/overview', async (req, res, next) => {
    try {
        const [kpi] = await sequelize.query(`
            SELECT
                (SELECT COUNT(*)::int FROM "Users")                                            AS "totalUsers",
                (SELECT COUNT(*)::int FROM "Users" WHERE "isBlocked" = true)                   AS "blockedUsers",
                (SELECT COUNT(*)::int FROM "Users" WHERE role = 'admin')                       AS "admins",
                (SELECT COUNT(*)::int FROM "Users" WHERE "createdAt" >= NOW() - INTERVAL '7 days') AS "newUsers7d",
                (SELECT COUNT(DISTINCT "userId")::int FROM "Activities"
                   WHERE "date" >= NOW() - INTERVAL '7 days')                                  AS "activeUsers7d",
                (SELECT COUNT(*)::int FROM "Activities")                                       AS "totalActivities",
                (SELECT COALESCE(SUM(steps), 0)::int FROM "Activities")                        AS "totalSteps",
                (SELECT COALESCE(SUM(calories), 0)::int FROM "Activities")                     AS "totalCalories"
        `, { type: QueryTypes.SELECT });

        // Регистрации по дням за последние 30 дней (формат совместим с SeriesChart)
        const registrations = await sequelize.query(`
            SELECT to_char(d.day, 'YYYY-MM-DD') AS date,
                   COUNT(u.id)::int             AS count
            FROM generate_series(
                     (CURRENT_DATE - INTERVAL '29 days')::date,
                     CURRENT_DATE::date,
                     INTERVAL '1 day'
                 ) AS d(day)
            LEFT JOIN "Users" u ON u."createdAt"::date = d.day
            GROUP BY d.day
            ORDER BY d.day
        `, { type: QueryTypes.SELECT });

        // Распределение по типам (формат совместим с DonutChart)
        const byType = await sequelize.query(`
            SELECT COALESCE(NULLIF(type, ''), 'Без типа') AS type,
                   COALESCE(SUM(steps), 0)::int           AS "totalSteps"
            FROM "Activities"
            GROUP BY COALESCE(NULLIF(type, ''), 'Без типа')
            HAVING COALESCE(SUM(steps), 0) > 0
            ORDER BY "totalSteps" DESC
            LIMIT 6
        `, { type: QueryTypes.SELECT });

        res.json({ data: { kpi, registrations, byType } });
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------
// GET /admin/users — список пользователей (поиск, сортировка, пагинация)
// ---------------------------------------------------------------
router.get('/users', async (req, res, next) => {
    try {
        const page = intParam(req.query.page, 1, 1, 100000);
        const limit = intParam(req.query.limit, 20, 1, 100);
        const offset = (page - 1) * limit;
        const search = (req.query.search || '').trim();
        const orderBy = USER_SORTS[req.query.sort] || USER_SORTS.createdAt;

        const where = search ? `WHERE (u.email ILIKE :like OR COALESCE(u.name, '') ILIKE :like)` : '';
        const replacements = { limit, offset, ...(search ? { like: `%${search}%` } : {}) };

        const rows = await sequelize.query(`
            SELECT u.id, u.email, u.name, u.role, u."isBlocked", u."createdAt",
                   u."failedLoginAttempts", u."lockUntil",
                   COUNT(a.id)::int                   AS "activityCount",
                   COALESCE(SUM(a.steps), 0)::int     AS "totalSteps",
                   MAX(a."date")                      AS "lastActivity"
            FROM "Users" u
            LEFT JOIN "Activities" a ON a."userId" = u.id
            ${where}
            GROUP BY u.id
            ORDER BY ${orderBy}
            LIMIT :limit OFFSET :offset
        `, { type: QueryTypes.SELECT, replacements });

        const [{ total }] = await sequelize.query(`
            SELECT COUNT(*)::int AS total FROM "Users" u ${where}
        `, { type: QueryTypes.SELECT, replacements });

        res.json({ data: rows, total, page, limit });
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------
// GET /admin/users/:id — карточка пользователя
// ---------------------------------------------------------------
router.get('/users/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const user = await User.findByPk(id, {
            attributes: { exclude: ['passwordHash'] },
        });
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

        const uid = String(id);
        const activities = await Activity.findAll({
            where: { userId: id },
            order: [['date', 'DESC']],
            limit: 10,
        });

        const [totals] = await sequelize.query(`
            SELECT COUNT(*)::int                       AS "activityCount",
                   COALESCE(SUM(steps), 0)::int        AS "totalSteps",
                   COALESCE(SUM(calories), 0)::int     AS "totalCalories",
                   COUNT(DISTINCT DATE("date"))::int   AS "activeDays"
            FROM "Activities" WHERE "userId" = :id
        `, { type: QueryTypes.SELECT, replacements: { id } });

        // Документы из MongoDB (могут отсутствовать — это нормально)
        let profile = null, achievements = [], weights = [];
        try {
            profile = await UserProfile.findOne({ userId: uid }).lean();
            achievements = await Achievement.find({ userId: uid }).lean();
            weights = await WeightEntry.find({ userId: uid }).sort({ date: -1 }).limit(30).lean();
        } catch { /* Mongo недоступна — отдаём то, что есть */ }

        res.json({
            data: {
                user,
                totals,
                activities,
                goals: profile ? profile.goals : null,
                profile: profile ? profile.profile : null,
                achievements,
                weights: weights.reverse(),
            },
        });
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------
// PATCH /admin/users/:id/block — бан / снятие бана
// ---------------------------------------------------------------
router.patch('/users/:id/block', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (id === req.user.id) {
            return res.status(400).json({ error: 'Нельзя заблокировать самого себя' });
        }
        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

        const isBlocked = Boolean(req.body.isBlocked);
        await user.update({ isBlocked });

        res.json({ data: { id: user.id, isBlocked: user.isBlocked } });
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------
// PATCH /admin/users/:id/role — назначить / снять администратора
// ---------------------------------------------------------------
router.patch('/users/:id/role', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const role = req.body.role;
        if (role !== 'user' && role !== 'admin') {
            return res.status(400).json({ error: 'Роль должна быть "user" или "admin"' });
        }
        if (id === req.user.id && role !== 'admin') {
            return res.status(400).json({ error: 'Нельзя снять роль администратора с самого себя' });
        }
        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

        await user.update({ role });
        res.json({ data: { id: user.id, role: user.role } });
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------
// POST /admin/users/:id/unlock — сбросить блокировку входа (брутфорс)
// ---------------------------------------------------------------
router.post('/users/:id/unlock', async (req, res, next) => {
    try {
        const user = await User.findByPk(Number(req.params.id));
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

        await user.update({ failedLoginAttempts: 0, lockUntil: null });
        res.json({ data: { id: user.id, message: 'Блокировка входа снята' } });
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------
// DELETE /admin/users/:id — удалить пользователя и все его данные
// ---------------------------------------------------------------
router.delete('/users/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (id === req.user.id) {
            return res.status(400).json({ error: 'Нельзя удалить собственный аккаунт' });
        }
        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

        await Activity.destroy({ where: { userId: id } });

        const uid = String(id);
        try {
            await Promise.all([
                UserProfile.deleteMany({ userId: uid }),
                WeightEntry.deleteMany({ userId: uid }),
                Achievement.deleteMany({ userId: uid }),
                DailyStat.deleteMany({ userId: uid }),
            ]);
        } catch { /* Mongo недоступна — реляционные данные всё равно удалены */ }

        await user.destroy();
        await cacheDel('leaderboard:*');

        res.json({ data: { id, message: 'Пользователь и его данные удалены' } });
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------
// GET /admin/activities — все активности платформы (модерация)
// ---------------------------------------------------------------
router.get('/activities', async (req, res, next) => {
    try {
        const page = intParam(req.query.page, 1, 1, 100000);
        const limit = intParam(req.query.limit, 20, 1, 100);
        const offset = (page - 1) * limit;

        const conditions = [];
        const replacements = { limit, offset };

        if (req.query.userId) {
            conditions.push('a."userId" = :userId');
            replacements.userId = Number(req.query.userId);
        }
        if (req.query.type) {
            conditions.push('a.type ILIKE :type');
            replacements.type = `%${String(req.query.type).trim()}%`;
        }
        if (req.query.from) {
            conditions.push('a."date" >= :from');
            replacements.from = req.query.from;
        }
        if (req.query.to) {
            conditions.push('a."date" <= :to');
            replacements.to = req.query.to;
        }
        // Фильтр аномалий: подозрительно большие значения (анти-чит)
        if (req.query.minSteps) {
            conditions.push('a.steps >= :minSteps');
            replacements.minSteps = intParam(req.query.minSteps, 0, 0, 10000000);
        }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        const rows = await sequelize.query(`
            SELECT a.id, a."date", a.type, a.steps, a.calories, a.duration,
                   u.id AS "userId", u.email, u.name
            FROM "Activities" a
            JOIN "Users" u ON u.id = a."userId"
            ${where}
            ORDER BY a."date" DESC, a.id DESC
            LIMIT :limit OFFSET :offset
        `, { type: QueryTypes.SELECT, replacements });

        const [{ total }] = await sequelize.query(`
            SELECT COUNT(*)::int AS total
            FROM "Activities" a JOIN "Users" u ON u.id = a."userId" ${where}
        `, { type: QueryTypes.SELECT, replacements });

        res.json({ data: rows, total, page, limit });
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------
// DELETE /admin/activities/:id — удалить любую активность
// ---------------------------------------------------------------
router.delete('/activities/:id', async (req, res, next) => {
    try {
        const deleted = await Activity.destroy({ where: { id: Number(req.params.id) } });
        if (deleted === 0) return res.status(404).json({ error: 'Активность не найдена' });

        await cacheDel('leaderboard:*');
        res.json({ data: { message: 'Активность удалена' } });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
