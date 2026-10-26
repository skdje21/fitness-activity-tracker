const mongoose = require('mongoose');

// Уведомление в ленте реального времени (история хранится в MongoDB)
const notificationSchema = new mongoose.Schema({
    // Тип события: join | leave | activity | achievement
    type: { type: String, required: true },
    // Имя пользователя, с которым связано событие
    user: { type: String, required: true },
    // Готовый текст уведомления для отображения в ленте
    text: { type: String, required: true },
}, { timestamps: true });   // createdAt — время события

module.exports = mongoose.model('Notification', notificationSchema);
