const Notification = require('../models/Notification');

// Сохраняет уведомление в MongoDB и возвращает обычный объект для отправки клиентам.
// Если база недоступна — возвращает объект без сохранения (лента всё равно работает).
async function saveNote(type, user, text) {
    try {
        const doc = await Notification.create({ type, user, text });
        return doc.toObject();
    } catch (err) {
        return { type, user, text, createdAt: new Date() };
    }
}

// Настройка всех обработчиков событий Socket.IO
function setupSocket(io) {
    let onlineCount = 0;   // число подключённых пользователей

    // Событие 'connection' срабатывает, когда новый клиент открыл соединение
    io.on('connection', async (socket) => {
        // Имя пользователя передаётся клиентом при подключении (handshake.auth)
        const user = (socket.handshake.auth && socket.handshake.auth.user) || 'Гость';
        socket.data.user = user;
        console.log('Подключился:', user, socket.id);

        // Увеличиваем счётчик онлайн и сообщаем его ВСЕМ клиентам
        onlineCount++;
        io.emit('onlineCount', onlineCount);

        // Новому клиенту отправляем историю последних 20 уведомлений из MongoDB
        try {
            const history = await Notification.find()
                .sort({ createdAt: -1 }).limit(20).lean();
            socket.emit('history', history.reverse());   // только этому сокету
        } catch (err) {
            socket.emit('history', []);
        }

        // Уведомляем всех, КРОМЕ самого подключившегося, о его входе
        const joinNote = await saveNote('join', user, `${user} присоединился`);
        socket.broadcast.emit('notification', joinNote);

        // --- Пользователь добавил активность ---
        socket.on('activity', async (data) => {
            const steps = Number(data && data.steps) || 0;
            const type = (data && data.type) || 'Активность';
            const text = `${user} добавил активность: ${type}, ${steps} шагов`;
            const note = await saveNote('activity', user, text);
            io.emit('notification', note);   // всем, включая отправителя
        });

        // --- Пользователь получил достижение ---
        socket.on('achievement', async (data) => {
            const title = (data && data.title) || 'Достижение';
            const text = `${user} получил достижение: ${title}`;
            const note = await saveNote('achievement', user, text);
            io.emit('notification', note);
        });

        // --- Отключение пользователя ---
        socket.on('disconnect', async () => {
            console.log('Отключился:', user, socket.id);
            onlineCount = Math.max(0, onlineCount - 1);
            io.emit('onlineCount', onlineCount);
            const leaveNote = await saveNote('leave', user, `${user} вышел`);
            socket.broadcast.emit('notification', leaveNote);
        });
    });
}

module.exports = setupSocket;
