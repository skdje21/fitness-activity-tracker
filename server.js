const path = require('path');
const express = require('express');

const webRouter = require('./routes/web');
const logger = require('./middleware/logger');
const fakeAuth = require('./middleware/fakeAuth');
const { sequelize, PzActivity } = require('./models/pzActivity');

const app = express();
const PORT = 3000;

// --- Настройка шаблонизатора EJS ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- Встроенные middleware (статика подключается до маршрутов) ---
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());                         // JSON-тело (для API)
app.use(express.urlencoded({ extended: true })); // данные HTML-форм

// --- Кастомные middleware ---
app.use(logger);    // логирование метода, URL и времени
app.use(fakeAuth);  // имитация авторизации (?auth=1)

app.use('/', webRouter);                  // HTML-страницы (EJS)

// --- Middleware обработки 404 ---
app.use((req, res) => {
    res.status(404).render('404', {
        title: 'Страница не найдена',
        url: req.originalUrl
    });
});

// --- Middleware обработки 500 (четыре параметра — обязательно) ---
app.use((err, req, res, next) => {
    console.error('[ERROR]', err.stack);
    res.status(500).render('500', {
        title: 'Ошибка сервера',
        message: err.message
    });
});

// Создаём таблицу PzActivities (если её нет) и запускаем сервер
async function start() {
    try {
        await sequelize.authenticate();
        await sequelize.sync({ alter: true });

        const count = await PzActivity.count();
        if (count === 0) {
            await PzActivity.bulkCreate([
                { date: '2026-09-05', steps: 8200, calories: 420 },
                { date: '2026-09-06', steps: 6100, calories: 315 },
            ]);
            console.log('Таблица PzActivities наполнена тестовыми записями');
        }
    } catch (err) {
        console.warn('БД недоступна при старте:', err.message);
    }

    app.listen(PORT, () => {
        console.log(`Сервер запущен: http://localhost:${PORT}`);
    });
}

start();
