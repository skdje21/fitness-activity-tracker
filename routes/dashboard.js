// Сводка для дашборда и управление целями/профилем.
// Все маршруты под авторизацией (монтируются с authMiddleware в server.js).
const express = require('express');
const router = express.Router();
const { Activity } = require('../models');
const UserProfile = require('../models/UserProfile');
const WeightEntry = require('../models/WeightEntry');
const Achievement = require('../models/Achievement');
const { recomputeStats, ymd } = require('../services/statsService');

function pct(value, goal) {
    if (!goal || goal <= 0) return 0;
    return Math.round((value / goal) * 100);
}

const LIM = {
    goalSteps: [1, 100000],
    goalCalories: [1, 20000],
    height: [50, 250],
    weight: [20, 400],
    birthYear: [1900, new Date().getFullYear()],
};
const intIn = (v, [min, max]) => Number.isInteger(v) && v >= min && v <= max;
const numIn = (v, [min, max]) => Number.isFinite(v) && v >= min && v <= max;

// GET /dashboard/summary
router.get('/summary', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const stats = await recomputeStats(userId);

        const acts = await Activity.findAll({ where: { userId } });

        const now = new Date();
        const days7 = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            days7.push(ymd(d));
        }
        const map = {};
        days7.forEach((d) => (map[d] = { date: d, steps: 0, calories: 0 }));

        const todayStr = ymd(now);
        let todaySteps = 0, todayCalories = 0, weekSteps = 0, weekCalories = 0;

        for (const a of acts) {
            const d = ymd(a.date);
            if (map[d]) {
                map[d].steps += a.steps || 0;
                map[d].calories += a.calories || 0;
                weekSteps += a.steps || 0;
                weekCalories += a.calories || 0;
            }
            if (d === todayStr) {
                todaySteps += a.steps || 0;
                todayCalories += a.calories || 0;
            }
        }

        const goals = stats.goals || { dailySteps: 10000, dailyCalories: 500 };
        const achievements = await Achievement.find({ userId: String(userId) });

        res.json({
            data: {
                totals: stats.totalStats,
                today: { steps: todaySteps, calories: todayCalories },
                goals,
                progress: {
                    steps: pct(todaySteps, goals.dailySteps),
                    calories: pct(todayCalories, goals.dailyCalories),
                },
                week: { steps: weekSteps, calories: weekCalories },
                series: days7.map((d) => map[d]),
                byType: stats.byType,
                records: stats.records,
                achievements,
            },
        });
    } catch (err) {
        next(err);
    }
});

// GET /dashboard/series?range=7d|30d|3m|1y — данные для графика активности по периодам
router.get('/series', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const range = req.query.range || '7d';
        const now = new Date();
        let daysBack, groupBy;

        switch (range) {
            case '30d': daysBack = 30; groupBy = 'day'; break;
            case '3m':  daysBack = 90; groupBy = 'week'; break;
            case '1y':  daysBack = 365; groupBy = 'week'; break;
            default:    daysBack = 7;  groupBy = 'day'; break;
        }

        const from = new Date(now);
        from.setDate(now.getDate() - daysBack + 1);
        from.setHours(0, 0, 0, 0);

        const acts = await Activity.findAll({ where: { userId } });

        if (groupBy === 'day') {
            const map = {};
            for (let i = daysBack - 1; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(now.getDate() - i);
                const key = ymd(d);
                map[key] = { date: key, steps: 0, calories: 0, minutes: 0 };
            }
            for (const a of acts) {
                const key = ymd(a.date);
                if (map[key]) {
                    map[key].steps += a.steps || 0;
                    map[key].calories += a.calories || 0;
                    map[key].minutes += a.duration || 0;
                }
            }
            res.json({ data: Object.values(map) });
        } else {
            // Группировка по неделям
            function weekKey(d) {
                const dt = new Date(d);
                const day = dt.getDay() || 7;
                dt.setDate(dt.getDate() - day + 1);
                return ymd(dt);
            }
            const map = {};
            // Создаём пустые недели
            for (let i = daysBack - 1; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(now.getDate() - i);
                const wk = weekKey(d);
                if (!map[wk]) map[wk] = { date: wk, steps: 0, calories: 0, minutes: 0 };
            }
            for (const a of acts) {
                const ad = new Date(a.date);
                if (ad < from) continue;
                const wk = weekKey(ad);
                if (map[wk]) {
                    map[wk].steps += a.steps || 0;
                    map[wk].calories += a.calories || 0;
                    map[wk].minutes += a.duration || 0;
                }
            }
            res.json({ data: Object.values(map) });
        }
    } catch (err) {
        next(err);
    }
});

// GET /dashboard/leaderboard?period=week|month|all
router.get('/leaderboard', async (req, res, next) => {
    try {
        const period = req.query.period || 'week';
        const now = new Date();
        let from;

        if (period === 'week') {
            from = new Date(now);
            from.setDate(now.getDate() - 7);
        } else if (period === 'month') {
            from = new Date(now);
            from.setMonth(now.getMonth() - 1);
        }

        const { sequelize } = require('../models');
        const { QueryTypes } = require('sequelize');

        let whereClause = '';
        const replacements = {};
        if (from) {
            whereClause = 'WHERE a."date" >= :from';
            replacements.from = from;
        }

        const rows = await sequelize.query(`
            SELECT u.id, u.email, u.name,
                   COALESCE(SUM(a.steps), 0)::int AS "totalSteps",
                   COALESCE(SUM(a.calories), 0)::int AS "totalCalories",
                   COUNT(DISTINCT DATE(a.date))::int AS "activeDays"
            FROM "Users" u
            LEFT JOIN "Activities" a ON a."userId" = u.id ${whereClause}
            GROUP BY u.id, u.email, u.name
            HAVING COALESCE(SUM(a.steps), 0) > 0
            ORDER BY "totalSteps" DESC
            LIMIT 20
        `, { type: QueryTypes.SELECT, replacements });

        res.json({ data: rows });
    } catch (err) {
        next(err);
    }
});

// GET /dashboard/export?format=csv&from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/export', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const format = req.query.format || 'csv';
        const where = { userId };

        const acts = await Activity.findAll({ where, order: [['date', 'DESC']] });

        if (format === 'csv') {
            const header = 'Дата;Тип;Шаги;Калории;Длительность (мин)\n';
            const rows = acts.map(a =>
                `${ymd(a.date)};${a.type || ''};${a.steps || 0};${a.calories || 0};${a.duration || 0}`
            ).join('\n');
            const bom = '﻿';
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename="activities.csv"');
            res.send(bom + header + rows);
        } else {
            res.status(400).json({ error: 'Формат не поддерживается' });
        }
    } catch (err) {
        next(err);
    }
});

// GET /dashboard/goals
router.get('/goals', async (req, res, next) => {
    try {
        const uid = String(req.user.id);
        let doc = await UserProfile.findOne({ userId: uid });
        if (!doc) doc = await UserProfile.create({ userId: uid });
        res.json({ data: doc.goals });
    } catch (err) {
        next(err);
    }
});

// PUT /dashboard/goals
router.put('/goals', async (req, res, next) => {
    try {
        const uid = String(req.user.id);
        let doc = await UserProfile.findOne({ userId: uid });
        if (!doc) doc = new UserProfile({ userId: uid });

        if (req.body.dailySteps != null) {
            const v = Number(req.body.dailySteps);
            if (!intIn(v, LIM.goalSteps)) return res.status(400).json({ error: `Цель по шагам: целое число от ${LIM.goalSteps[0]} до ${LIM.goalSteps[1]}` });
            doc.goals.dailySteps = v;
        }
        if (req.body.dailyCalories != null) {
            const v = Number(req.body.dailyCalories);
            if (!intIn(v, LIM.goalCalories)) return res.status(400).json({ error: `Цель по калориям: целое число от ${LIM.goalCalories[0]} до ${LIM.goalCalories[1]}` });
            doc.goals.dailyCalories = v;
        }

        await doc.save();
        res.json({ data: doc.goals });
    } catch (err) {
        next(err);
    }
});

// GET /dashboard/profile
router.get('/profile', async (req, res, next) => {
    try {
        const uid = String(req.user.id);
        let doc = await UserProfile.findOne({ userId: uid });
        if (!doc) doc = await UserProfile.create({ userId: uid });
        const weightHistory = await WeightEntry.find({ userId: uid }).sort({ date: -1 }).limit(90);
        res.json({ data: { profile: doc.profile || {}, weightHistory: weightHistory.reverse() } });
    } catch (err) {
        next(err);
    }
});

// PUT /dashboard/profile
router.put('/profile', async (req, res, next) => {
    try {
        const uid = String(req.user.id);
        let doc = await UserProfile.findOne({ userId: uid });
        if (!doc) doc = new UserProfile({ userId: uid });
        if (!doc.profile) doc.profile = {};

        const { height, weight, birthYear, gender } = req.body;
        if (height != null && height !== '') {
            const v = Number(height);
            if (!numIn(v, LIM.height)) return res.status(400).json({ error: `Рост: от ${LIM.height[0]} до ${LIM.height[1]} см` });
            doc.profile.height = v;
        }
        if (weight != null && weight !== '') {
            const v = Number(weight);
            if (!numIn(v, LIM.weight)) return res.status(400).json({ error: `Вес: от ${LIM.weight[0]} до ${LIM.weight[1]} кг` });
            doc.profile.weight = v;
        }
        if (birthYear != null && birthYear !== '') {
            const v = Number(birthYear);
            if (!intIn(v, LIM.birthYear)) return res.status(400).json({ error: `Год рождения: от ${LIM.birthYear[0]} до ${LIM.birthYear[1]}` });
            doc.profile.birthYear = v;
        }
        if (gender != null && gender !== '') {
            if (gender !== 'male' && gender !== 'female') return res.status(400).json({ error: 'Некорректный пол' });
            doc.profile.gender = gender;
        }

        await doc.save();
        res.json({ data: doc.profile });
    } catch (err) {
        if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
        next(err);
    }
});

// POST /dashboard/weight
router.post('/weight', async (req, res, next) => {
    try {
        const uid = String(req.user.id);

        const weight = Number(req.body.weight);
        if (!numIn(weight, LIM.weight)) {
            return res.status(400).json({ error: `Вес: от ${LIM.weight[0]} до ${LIM.weight[1]} кг` });
        }
        const date = req.body.date ? new Date(req.body.date) : new Date();
        if (Number.isNaN(date.getTime())) {
            return res.status(400).json({ error: 'Некорректная дата' });
        }

        // Сохранить в коллекцию WeightEntry
        const entry = await WeightEntry.create({ userId: uid, date, weight });

        // Обновить текущий вес в профиле
        let doc = await UserProfile.findOne({ userId: uid });
        if (!doc) doc = new UserProfile({ userId: uid });
        if (!doc.profile) doc.profile = {};
        doc.profile.weight = weight;
        await doc.save();

        res.status(201).json({ data: entry });
    } catch (err) {
        if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
        next(err);
    }
});

module.exports = router;
