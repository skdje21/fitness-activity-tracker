const path = require('path');
const express = require('express');

const activitiesRouter = require('./routes/activities');
const webRouter = require('./routes/web');
const logger = require('./middleware/logger');
const fakeAuth = require('./middleware/fakeAuth');

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

// --- Маршруты ---
app.use('/activities', activitiesRouter); // JSON API
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

app.listen(PORT, () => {
    console.log(`Сервер запущен: http://localhost:${PORT}`);
});
