const jwt = require('jsonwebtoken');
const Notification = require('../models/Notification');


async function saveNote(type, user, text) {
    try {
        const doc = await Notification.create({ type, user, text });
        return doc.toObject();
    } catch (err) {
        return { type, user, text, createdAt: new Date() };
    }
}


function setupSocket(io) {
    let onlineCount = 0;

    io.use((socket, next) => {
        const token = socket.handshake.auth && socket.handshake.auth.token;
        if (!token) return next(new Error('Требуется авторизация'));
        try {
            const payload = jwt.verify(token, process.env.JWT_SECRET);
            socket.data.user = payload.email;  
            next();
        } catch (err) {
            next(new Error('Недействительный или просроченный токен'));
        }
    });

    io.on('connection', async (socket) => {

        const user = socket.data.user;          // email из проверенного токена
        console.log('Подключился:', user, socket.id);

        onlineCount++;
        io.emit('onlineCount', onlineCount);

        try {
            const history = await Notification.find()
                .sort({ createdAt: -1 }).limit(20).lean();
            socket.emit('history', history.reverse());   
        } catch (err) {
            socket.emit('history', []);
        }


        const joinNote = await saveNote('join', user, `${user} присоединился`);
        socket.broadcast.emit('notification', joinNote);


        socket.on('activity', async (data) => {
            const steps = Number(data && data.steps) || 0;
            const type = (data && data.type) || 'Активность';
            const text = `${user} добавил активность: ${type}, ${steps} шагов`;
            const note = await saveNote('activity', user, text);
            io.emit('notification', note); 
        });


        socket.on('achievement', async (data) => {
            const title = (data && data.title) || 'Достижение';
            const text = `${user} получил достижение: ${title}`;
            const note = await saveNote('achievement', user, text);
            io.emit('notification', note);
        });


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
