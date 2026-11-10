const mongoose = require('mongoose');

// Вложенная схема: статистика по типу активности (embedded document)
const typeStatSchema = new mongoose.Schema({
    type:          { type: String, required: true },
    totalSteps:    { type: Number, default: 0 },
    totalCalories: { type: Number, default: 0 },
    totalMinutes:  { type: Number, default: 0 },
    sessions:      { type: Number, default: 0 },
}, { _id: true });

// Вложенная схема: месячная статистика (embedded document)
const monthlyStatSchema = new mongoose.Schema({
    month:      { type: String, required: true },
    steps:      { type: Number, default: 0 },
    calories:   { type: Number, default: 0 },
    activeDays: { type: Number, default: 0 },
}, { _id: true });

const userProfileSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },

    // Вложенный документ: физические параметры
    profile: {
        height:    { type: Number },
        weight:    { type: Number },
        birthYear: { type: Number },
        gender:    { type: String, enum: ['male', 'female'] },
    },

    // Вложенный документ: цели пользователя
    goals: {
        dailySteps:    { type: Number, default: 10000 },
        dailyCalories: { type: Number, default: 500 },
    },

    // Общая статистика за всё время (вложенный документ)
    totalStats: {
        steps:         { type: Number, default: 0 },
        calories:      { type: Number, default: 0 },
        activeMinutes: { type: Number, default: 0 },
        activeDays:    { type: Number, default: 0 },
    },

    // Массив вложенных документов: статистика по типам
    byType: [typeStatSchema],

    // Вложенный документ: личные рекорды (с вложенными объектами)
    records: {
        maxStepsPerDay:    { value: Number, date: Date, activityType: String },
        maxCaloriesPerDay: { value: Number, date: Date, activityType: String },
        longestSession:    { minutes: Number, date: Date, activityType: String },
        longestStreak:     { days: Number, from: Date, to: Date },
    },

    // Массив вложенных документов: месячные итоги
    monthlyStats: [monthlyStatSchema],

}, { timestamps: true });

module.exports = mongoose.model('UserProfile', userProfileSchema);
