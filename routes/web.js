const express = require('express');
const { PzActivity } = require('../models/pzActivity');
const requireAuth = require('../middleware/requireAuth');

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
    res.render('add', { title: 'Добавить активность', error: null });
});

// POST /add — добавление записи в БД
router.post('/add', requireAuth, async (req, res, next) => {
    try {
        const date = req.body.date;
        const steps = Number(req.body.steps);
        const calories = Number(req.body.calories);

        if (!date || !Number.isInteger(steps) || steps < 0 || !Number.isFinite(calories) || calories < 0) {
            return res.status(400).render('add', {
                title: 'Добавить активность',
                error: 'Заполните все поля корректно: дата, шаги и калории должны быть неотрицательными числами'
            });
        }

        await PzActivity.create({ date, steps, calories });
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

// GET /boom — демонстрация обработчика ошибок 500
router.get('/boom', (req, res) => {
    throw new Error('Тестовая ошибка для демонстрации страницы 500');
});

module.exports = router;
