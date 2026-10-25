const express = require('express');
const router = express.Router();
const Stats = require('../models/MongoUser');

// ==================== CRUD: статистика пользователя ====================

// GET /mongo/stats — список всех профилей статистики
router.get('/stats', async (req, res, next) => {
    try {
        const items = await Stats.find();
        res.json({ data: items, meta: { total: items.length } });
    } catch (err) { next(err); }
});

// GET /mongo/stats/:id — статистика одного пользователя
router.get('/stats/:id', async (req, res, next) => {
    try {
        const doc = await Stats.findById(req.params.id);
        if (!doc) return res.status(404).json({ error: 'Профиль статистики не найден' });
        res.json({ data: doc });
    } catch (err) { next(err); }
});

// POST /mongo/stats — создать профиль статистики
router.post('/stats', async (req, res, next) => {
    try {
        const doc = await Stats.create(req.body);
        res.status(201).json({ data: doc });
    } catch (err) {
        if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
        if (err.code === 11000) return res.status(400).json({ error: 'Профиль для этого userId уже существует' });
        next(err);
    }
});

// PUT /mongo/stats/:id — обновить профиль (totalStats, records, profile)
router.put('/stats/:id', async (req, res, next) => {
    try {
        const doc = await Stats.findByIdAndUpdate(req.params.id, req.body, {
            new: true, runValidators: true
        });
        if (!doc) return res.status(404).json({ error: 'Профиль статистики не найден' });
        res.json({ data: doc });
    } catch (err) { next(err); }
});

// DELETE /mongo/stats/:id — удалить профиль статистики
router.delete('/stats/:id', async (req, res, next) => {
    try {
        const doc = await Stats.findByIdAndDelete(req.params.id);
        if (!doc) return res.status(404).json({ error: 'Профиль статистики не найден' });
        res.status(204).end();
    } catch (err) { next(err); }
});

// ==================== Вложенные документы: достижения ====================

// GET /mongo/stats/:id/achievements — список достижений
router.get('/stats/:id/achievements', async (req, res, next) => {
    try {
        const doc = await Stats.findById(req.params.id);
        if (!doc) return res.status(404).json({ error: 'Профиль не найден' });
        let items = doc.achievements;
        // Фильтр по категории: ?category=steps
        if (req.query.category) items = items.filter(a => a.category === req.query.category);
        res.json({ data: items, meta: { total: items.length } });
    } catch (err) { next(err); }
});

// POST /mongo/stats/:id/achievements — добавить достижение
router.post('/stats/:id/achievements', async (req, res, next) => {
    try {
        const doc = await Stats.findById(req.params.id);
        if (!doc) return res.status(404).json({ error: 'Профиль не найден' });
        doc.achievements.push(req.body);
        await doc.save();
        res.status(201).json({ data: doc.achievements[doc.achievements.length - 1] });
    } catch (err) {
        if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
        next(err);
    }
});

// PUT /mongo/stats/:id/achievements/:achId — обновить достижение
router.put('/stats/:id/achievements/:achId', async (req, res, next) => {
    try {
        const doc = await Stats.findById(req.params.id);
        if (!doc) return res.status(404).json({ error: 'Профиль не найден' });
        const ach = doc.achievements.id(req.params.achId);
        if (!ach) return res.status(404).json({ error: 'Достижение не найдено' });
        Object.assign(ach, req.body);
        await doc.save();
        res.json({ data: ach });
    } catch (err) { next(err); }
});

// DELETE /mongo/stats/:id/achievements/:achId — удалить достижение
router.delete('/stats/:id/achievements/:achId', async (req, res, next) => {
    try {
        const doc = await Stats.findById(req.params.id);
        if (!doc) return res.status(404).json({ error: 'Профиль не найден' });
        const ach = doc.achievements.id(req.params.achId);
        if (!ach) return res.status(404).json({ error: 'Достижение не найдено' });
        ach.deleteOne();
        await doc.save();
        res.status(204).end();
    } catch (err) { next(err); }
});

// ==================== Вложенные документы: статистика по типу ====================

// POST /mongo/stats/:id/byType — добавить статистику по типу
router.post('/stats/:id/byType', async (req, res, next) => {
    try {
        const doc = await Stats.findById(req.params.id);
        if (!doc) return res.status(404).json({ error: 'Профиль не найден' });
        doc.byType.push(req.body);
        await doc.save();
        res.status(201).json({ data: doc.byType[doc.byType.length - 1] });
    } catch (err) {
        if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
        next(err);
    }
});

// PUT /mongo/stats/:id/byType/:typeId — обновить статистику по типу
router.put('/stats/:id/byType/:typeId', async (req, res, next) => {
    try {
        const doc = await Stats.findById(req.params.id);
        if (!doc) return res.status(404).json({ error: 'Профиль не найден' });
        const item = doc.byType.id(req.params.typeId);
        if (!item) return res.status(404).json({ error: 'Тип активности не найден' });
        Object.assign(item, req.body);
        await doc.save();
        res.json({ data: item });
    } catch (err) { next(err); }
});

// ==================== Вложенные документы: месячная статистика ====================

// POST /mongo/stats/:id/monthly — добавить месячную статистику
router.post('/stats/:id/monthly', async (req, res, next) => {
    try {
        const doc = await Stats.findById(req.params.id);
        if (!doc) return res.status(404).json({ error: 'Профиль не найден' });
        doc.monthlyStats.push(req.body);
        await doc.save();
        res.status(201).json({ data: doc.monthlyStats[doc.monthlyStats.length - 1] });
    } catch (err) {
        if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
        next(err);
    }
});

// ==================== Вложенные документы: история веса ====================

// POST /mongo/stats/:id/weight — добавить запись веса
router.post('/stats/:id/weight', async (req, res, next) => {
    try {
        const doc = await Stats.findById(req.params.id);
        if (!doc) return res.status(404).json({ error: 'Профиль не найден' });
        doc.weightHistory.push(req.body);
        await doc.save();
        res.status(201).json({ data: doc.weightHistory[doc.weightHistory.length - 1] });
    } catch (err) {
        if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
        next(err);
    }
});

// GET /mongo/stats/:id/weight — история веса
router.get('/stats/:id/weight', async (req, res, next) => {
    try {
        const doc = await Stats.findById(req.params.id);
        if (!doc) return res.status(404).json({ error: 'Профиль не найден' });
        res.json({ data: doc.weightHistory, meta: { total: doc.weightHistory.length } });
    } catch (err) { next(err); }
});

module.exports = router;
