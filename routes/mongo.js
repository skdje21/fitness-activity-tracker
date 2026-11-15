const express = require('express');
const router = express.Router();
const UserProfile = require('../models/UserProfile');
const Achievement = require('../models/Achievement');
const DailyStat = require('../models/DailyStat');
const WeightEntry = require('../models/WeightEntry');

// ==================== UserProfile ====================

router.get('/stats', async (req, res, next) => {
    try {
        const items = await UserProfile.find({ userId: String(req.user.id) });
        res.json({ data: items, meta: { total: items.length } });
    } catch (err) { next(err); }
});

router.get('/stats/:id', async (req, res, next) => {
    try {
        const doc = await UserProfile.findById(req.params.id);
        if (!doc) return res.status(404).json({ error: 'Профиль не найден' });
        res.json({ data: doc });
    } catch (err) { next(err); }
});

router.post('/stats', async (req, res, next) => {
    try {
        const doc = await UserProfile.create({ ...req.body, userId: String(req.user.id) });
        res.status(201).json({ data: doc });
    } catch (err) {
        if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
        if (err.code === 11000) return res.status(400).json({ error: 'Профиль для этого userId уже существует' });
        next(err);
    }
});

router.put('/stats/:id', async (req, res, next) => {
    try {
        const doc = await UserProfile.findByIdAndUpdate(req.params.id, req.body, {
            new: true, runValidators: true
        });
        if (!doc) return res.status(404).json({ error: 'Профиль не найден' });
        res.json({ data: doc });
    } catch (err) { next(err); }
});

router.delete('/stats/:id', async (req, res, next) => {
    try {
        const doc = await UserProfile.findByIdAndDelete(req.params.id);
        if (!doc) return res.status(404).json({ error: 'Профиль не найден' });
        res.status(204).end();
    } catch (err) { next(err); }
});

// ==================== Achievements ====================

router.get('/achievements', async (req, res, next) => {
    try {
        const filter = { userId: String(req.user.id) };
        if (req.query.category) filter.category = req.query.category;
        const items = await Achievement.find(filter).sort({ earnedAt: -1 });
        res.json({ data: items, meta: { total: items.length } });
    } catch (err) { next(err); }
});

router.post('/achievements', async (req, res, next) => {
    try {
        const doc = await Achievement.create({ ...req.body, userId: String(req.user.id) });
        res.status(201).json({ data: doc });
    } catch (err) {
        if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
        next(err);
    }
});

router.delete('/achievements/:id', async (req, res, next) => {
    try {
        const doc = await Achievement.findOneAndDelete({ _id: req.params.id, userId: String(req.user.id) });
        if (!doc) return res.status(404).json({ error: 'Достижение не найдено' });
        res.status(204).end();
    } catch (err) { next(err); }
});

// ==================== DailyStats ====================

router.get('/daily-stats', async (req, res, next) => {
    try {
        const filter = { userId: String(req.user.id) };
        if (req.query.from) filter.date = { ...filter.date, $gte: req.query.from };
        if (req.query.to) filter.date = { ...filter.date, $lte: req.query.to };
        const items = await DailyStat.find(filter).sort({ date: -1 }).limit(90);
        res.json({ data: items, meta: { total: items.length } });
    } catch (err) { next(err); }
});

router.get('/daily-stats/:date', async (req, res, next) => {
    try {
        const doc = await DailyStat.findOne({ userId: String(req.user.id), date: req.params.date });
        if (!doc) return res.status(404).json({ error: 'Статистика за день не найдена' });
        res.json({ data: doc });
    } catch (err) { next(err); }
});

// ==================== WeightHistory ====================

router.get('/weight-history', async (req, res, next) => {
    try {
        const filter = { userId: String(req.user.id) };
        if (req.query.from) filter.date = { ...filter.date, $gte: new Date(req.query.from) };
        if (req.query.to) filter.date = { ...filter.date, $lte: new Date(req.query.to) };
        const items = await WeightEntry.find(filter).sort({ date: -1 }).limit(90);
        res.json({ data: items.reverse(), meta: { total: items.length } });
    } catch (err) { next(err); }
});

router.post('/weight-history', async (req, res, next) => {
    try {
        const doc = await WeightEntry.create({ ...req.body, userId: String(req.user.id) });
        res.status(201).json({ data: doc });
    } catch (err) {
        if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
        next(err);
    }
});

router.delete('/weight-history/:id', async (req, res, next) => {
    try {
        const doc = await WeightEntry.findOneAndDelete({ _id: req.params.id, userId: String(req.user.id) });
        if (!doc) return res.status(404).json({ error: 'Запись веса не найдена' });
        res.status(204).end();
    } catch (err) { next(err); }
});

// ==================== Совместимость: вложенные документы byType ====================

router.post('/stats/:id/byType', async (req, res, next) => {
    try {
        const doc = await UserProfile.findById(req.params.id);
        if (!doc) return res.status(404).json({ error: 'Профиль не найден' });
        doc.byType.push(req.body);
        await doc.save();
        res.status(201).json({ data: doc.byType[doc.byType.length - 1] });
    } catch (err) {
        if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
        next(err);
    }
});

router.put('/stats/:id/byType/:typeId', async (req, res, next) => {
    try {
        const doc = await UserProfile.findById(req.params.id);
        if (!doc) return res.status(404).json({ error: 'Профиль не найден' });
        const item = doc.byType.id(req.params.typeId);
        if (!item) return res.status(404).json({ error: 'Тип активности не найден' });
        Object.assign(item, req.body);
        await doc.save();
        res.json({ data: item });
    } catch (err) { next(err); }
});

module.exports = router;
