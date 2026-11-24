require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const authRouter = require('./routes/auth');
const activitiesRouter = require('./routes/activities');
const mongoRouter = require('./routes/mongo');
const dashboardRouter = require('./routes/dashboard');
const adminRouter = require('./routes/admin');
const connectMongo = require('./db/mongoose');
const { connectRedis } = require('./db/redis');
const setupSocket = require('./socket/notifications');
const helmet = require('helmet');
const authMiddleware = require('./middleware/auth');
const isAdmin = require('./middleware/isAdmin');
const setupSwagger = require('./swagger');

const app = express();
const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
setupSocket(io); 


app.use(helmet());
app.use(cors());
app.use(express.json());

setupSwagger(app);


app.get('/', (req, res) => {
    res.json({
        name: 'Fitness Activity Tracker API',
        resource: '/activities'
    });
});


app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.use('/auth', authRouter);
// Данные пользователя доступны только после авторизации (JWT)
app.use('/activities', authMiddleware, activitiesRouter);
app.use('/mongo', authMiddleware, mongoRouter);
app.use('/dashboard', authMiddleware, dashboardRouter);
// Админ-панель: доступна только пользователям с ролью admin
app.use('/admin', authMiddleware, isAdmin, adminRouter);

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

    await connectRedis();

    server.listen(PORT, () => {
        console.log(`Сервер запущен: http://localhost:${PORT}`);
    });
}

start();

module.exports = app;
