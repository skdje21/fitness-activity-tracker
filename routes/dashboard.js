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

        if (req.body.dailySteps != null) doc.goals.dailySteps = Number(req.body.dailySteps);
        if (req.body.dailyCalories != null) doc.goals.dailyCalories = Number(req.body.dailyCalories);

        await doc.save();
        res.json({ data: doc.goals });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
