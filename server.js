require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRouter = require('./routes/auth');
const activitiesRouter = require('./routes/activities');
const mongoRouter = require('./routes/mongo');
const connectMongo = require('./db/mongoose');

const app = express();
const PORT = 3000;


app.use(cors());
app.use(express.json());


app.get('/', (req, res) => {
    res.json({
        name: 'Fitness Activity Tracker API',
        resource: '/activities'
    });
});

app.use('/activities', activitiesRouter);
app.use('/auth', authRouter);
app.use('/mongo', mongoRouter);

app.use((req, res) => {
    res.status(404).json({ error: 'Маршрут не найден' });
});


app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ error: 'Некорректный JSON в теле запроса' });
    }

    console.error(err.stack);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// Подключение к MongoDB и запуск сервера
async function start() {
    try {
        await connectMongo();
    } catch (err) {
        console.warn('MongoDB недоступна при старте:', err.message);
    }

    app.listen(PORT, () => {
        console.log(`Сервер запущен: http://localhost:${PORT}`);
    });
}

start();
