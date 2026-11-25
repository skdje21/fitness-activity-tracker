const mongoose = require('mongoose');

// Журнал действий администратора: кто, что, над кем и когда.
// Нужен для подотчётности привилегированных и необратимых операций
// (блокировка, смена роли, удаление пользователя или активности).
const adminLogSchema = new mongoose.Schema({
    adminId:    { type: String, required: true, index: true },
    adminEmail: { type: String, required: true },
    action:     { type: String, required: true },  // 'block' | 'unblock' | 'role' | 'unlock' | 'delete_user' | 'delete_activity'
    targetType: { type: String, required: true },  // 'user' | 'activity'
    targetId:   { type: String, required: true },
    targetLabel:{ type: String },                  // email пользователя / описание записи — для читаемости
    details:    { type: String },                  // произвольное пояснение (например, «user → admin»)
}, { timestamps: true });

adminLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AdminLog', adminLogSchema);
