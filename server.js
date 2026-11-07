require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const authRouter = require('./routes/auth');
const activitiesRouter = require('./routes/activities');
const mongoRouter = require('./routes/mongo');
const dashboardRouter = require('./routes/dashboard');
const connectMongo = require('./db/mongoose');
const setupSocket = require('./socket/notifications');
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
setupSocket(io); 


app.use(cors());
app.use(express.json());


app.get('/', (req, res) => {
    res.json({
        name: 'Fitness Activity Tracker API',
        resource: '/activities'
    });
});

app.use('/auth', authRouter);
// Данные пользователя доступны только после авторизации (JWT)
app.use('/activities', authMiddleware, activitiesRouter);
app.use('/mongo', authMiddleware, mongoRouter);
app.use('/dashboard', authMiddleware, dashboardRouter);

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


async function start() {
    try {
        await connectMongo();
    } catch (err) {
        console.warn('MongoDB недоступна при старте:', err.message);
    }

    server.listen(PORT, () => {
        console.log(`Сервер запущен: http://localhost:${PORT}`);
    });
}

start();
