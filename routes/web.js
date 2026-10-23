const express = require('express');
const { PzActivity } = require('../models/pzActivity');
const requireAuth = require('../middleware/requireAuth');
const rules = require('../config/validation.json');

const router = express.Router();

// GET / — главная: список активностей из БД
router.get('/', async (req, res, next) => {
    try {
        const activities = await PzActivity.findAll({ order: [['id', 'ASC']] });
        res.render('index', { title: 'Список активностей', activities });
    } catch (err) {
        next(err);
    }
});

// GET /login — страница для неавторизованных
router.get('/login', (req, res) => {
    res.render('login', { title: 'Вход' });
});

// GET /add — форма добавления (защищённый маршрут)
router.get('/add', requireAuth, (req, res) => {
    res.render('add', { title: 'Добавить активность', errors: null, values: null });
});

// POST /add — добавление записи в БД
router.post('/add', requireAuth, async (req, res, next) => {
    try {
        const date = (req.body.date || '').trim();
        const stepsRaw = (req.body.steps || '').toString().trim();
        const caloriesRaw = (req.body.calories || '').toString().trim();
        const values = { date, steps: stepsRaw, calories: caloriesRaw };
        const errors = {};

        if (!date) errors.date = 'Укажите дату';
        if (!stepsRaw) {
            errors.steps = 'Введите количество шагов';
        } else if (stepsRaw.length > rules.steps.maxLength) {
            errors.steps = `Максимум ${rules.steps.maxLength} цифр`;
        } else {
            const steps = Number(stepsRaw);
            if (!Number.isInteger(steps)) errors.steps = 'Должно быть целым числом';
            else if (steps < rules.steps.min) errors.steps = `Минимум ${rules.steps.min}`;
            else if (steps > rules.steps.max) errors.steps = `Максимум ${rules.steps.max.toLocaleString('ru-RU')}`;
        }

        if (!caloriesRaw) {
            errors.calories = 'Введите количество калорий';
        } else if (caloriesRaw.length > rules.calories.maxLength) {
            errors.calories = `Максимум ${rules.calories.maxLength} цифр`;
        } else {
            const calories = Number(caloriesRaw);
            if (!Number.isFinite(calories)) errors.calories = 'Должно быть числом';
            else if (calories < rules.calories.min) errors.calories = `Минимум ${rules.calories.min}`;
            else if (calories > rules.calories.max) errors.calories = `Максимум ${rules.calories.max.toLocaleString('ru-RU')}`;
        }

        if (Object.keys(errors).length > 0) {
            return res.status(400).render('add', {
                title: 'Добавить активность', errors, values
            });
        }

        await PzActivity.create({ date, steps: Number(stepsRaw), calories: Number(caloriesRaw) });
        res.redirect('/?auth=1');
    } catch (err) {
        next(err);
    }
});

// GET /item/:id — детальная страница из БД
router.get('/item/:id', async (req, res, next) => {
    try {
        const activity = await PzActivity.findByPk(Number(req.params.id));
        if (!activity) {
            return next(); // передаём управление дальше — попадём в 404-middleware
        }
        res.render('item', { title: `Активность №${activity.id}`, activity });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
