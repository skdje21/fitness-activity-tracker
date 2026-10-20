require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRouter = require('./routes/auth');
const activitiesRouter = require('./routes/activities');

const app = express();
const PORT = 3000;


app.use(cors()); // разрешаем запросы с другого порта (React на :5173)
app.use(express.json());


app.get('/', (req, res) => {
    res.json({
        name: 'Fitness Activity Tracker API',
        resource: '/activities'
    });
});

app.use('/activities', activitiesRouter); 
app.use('/auth', authRouter);

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

app.listen(PORT, () => {
    console.log(`Сервер запущен: http://localhost:${PORT}`);
});
