// Сводка для дашборда и управление целями.
// Все маршруты под авторизацией (монтируются с authMiddleware в server.js).
const express = require('express');
const router = express.Router();
const { Activity } = require('../models');
const Stats = require('../models/MongoUser');
const { recomputeStats, ymd } = require('../services/statsService');

function pct(value, goal) {
    if (!goal || goal <= 0) return 0;
    return Math.round((value / goal) * 100);
}

// Пределы значений
const LIM = {
    goalSteps: [1, 100000],
    goalCalories: [1, 20000],
    height: [50, 250],
    weight: [20, 400],
    birthYear: [1900, new Date().getFullYear()],
};
const intIn = (v, [min, max]) => Number.isInteger(v) && v >= min && v <= max;
const numIn = (v, [min, max]) => Number.isFinite(v) && v >= min && v <= max;

// GET /dashboard/summary — всё для главной: цели, прогресс, график за 7 дней, достижения
router.get('/summary', async (req, res, next) => {
    try {
        const userId = req.user.id;

        // Актуализируем статистику (на случай, если запись создавалась в обход API)
        const stats = await recomputeStats(userId);

        const acts = await Activity.findAll({ where: { userId } });

        // Последние 7 дней (включая сегодня)
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
                achievements: stats.achievements,
            },
        });
    } catch (err) {
        next(err);
    }
});

// GET /dashboard/goals — текущие цели
router.get('/goals', async (req, res, next) => {
    try {
        const uid = String(req.user.id);
        let doc = await Stats.findOne({ userId: uid });
        if (!doc) doc = await Stats.create({ userId: uid });
        res.json({ data: doc.goals });
    } catch (err) {
        next(err);
    }
});

// PUT /dashboard/goals — обновить цели
router.put('/goals', async (req, res, next) => {
    try {
        const uid = String(req.user.id);
        let doc = await Stats.findOne({ userId: uid });
        if (!doc) doc = new Stats({ userId: uid });

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

// GET /dashboard/profile — профиль пользователя + история веса
router.get('/profile', async (req, res, next) => {
    try {
        const uid = String(req.user.id);
        let doc = await Stats.findOne({ userId: uid });
        if (!doc) doc = await Stats.create({ userId: uid });
        res.json({ data: { profile: doc.profile || {}, weightHistory: doc.weightHistory || [] } });
    } catch (err) {
        next(err);
    }
});

// PUT /dashboard/profile — обновить профиль (рост, вес, год рождения, пол)
router.put('/profile', async (req, res, next) => {
    try {
        const uid = String(req.user.id);
        let doc = await Stats.findOne({ userId: uid });
        if (!doc) doc = new Stats({ userId: uid });
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

// POST /dashboard/weight — добавить запись веса (и обновить текущий вес в профиле)
router.post('/weight', async (req, res, next) => {
    try {
        const uid = String(req.user.id);
        let doc = await Stats.findOne({ userId: uid });
        if (!doc) doc = new Stats({ userId: uid });

        const weight = Number(req.body.weight);
        if (!numIn(weight, LIM.weight)) {
            return res.status(400).json({ error: `Вес: от ${LIM.weight[0]} до ${LIM.weight[1]} кг` });
        }
        const date = req.body.date ? new Date(req.body.date) : new Date();
        if (Number.isNaN(date.getTime())) {
            return res.status(400).json({ error: 'Некорректная дата' });
        }

        doc.weightHistory.push({ date, weight });
        if (!doc.profile) doc.profile = {};
        doc.profile.weight = weight; // текущий вес = последняя запись
        await doc.save();

        res.status(201).json({ data: doc.weightHistory[doc.weightHistory.length - 1] });
    } catch (err) {
        if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
        next(err);
    }
});

module.exports = router;
