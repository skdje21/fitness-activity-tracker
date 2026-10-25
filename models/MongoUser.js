const mongoose = require('mongoose');

// ---------- Вложенная схема: статистика по типу активности ----------
const typeStatSchema = new mongoose.Schema({
    type:          { type: String, required: true },   // Бег, Ходьба, Велосипед, Хайкинг
    totalSteps:    { type: Number, default: 0 },
    totalCalories: { type: Number, default: 0 },
    totalMinutes:  { type: Number, default: 0 },
    sessions:      { type: Number, default: 0 },
}, { _id: true });

// ---------- Вложенная схема: достижение ----------
const achievementSchema = new mongoose.Schema({
    code:     { type: String, required: true },        // first_5k, streak_7, runner ...
    title:    { type: String, required: true },        // "Первые 5 000 шагов за день"
    category: { type: String, enum: ['steps', 'calories', 'streak', 'type'], required: true },
    earnedAt: { type: Date, default: Date.now },
}, { _id: true });

// ---------- Вложенная схема: месячная статистика ----------
const monthlyStatSchema = new mongoose.Schema({
    month:      { type: String, required: true },      // "2026-10"
    steps:      { type: Number, default: 0 },
    calories:   { type: Number, default: 0 },
    activeDays: { type: Number, default: 0 },
}, { _id: true });

// ---------- Вложенная схема: запись веса ----------
const weightEntrySchema = new mongoose.Schema({
    date:   { type: Date, required: true },
    weight: { type: Number, required: true },
}, { _id: true });

// ---------- Главная схема: статистика и достижения пользователя ----------
const statsSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },

    // Физические параметры
    profile: {
        height:    { type: Number },                   // рост, см
        weight:    { type: Number },                   // текущий вес, кг
        birthYear: { type: Number },
        gender:    { type: String, enum: ['male', 'female'] },
    },

    // История веса (массив, растёт со временем)
    weightHistory: [weightEntrySchema],

    // Общая статистика за всё время
    totalStats: {
        steps:         { type: Number, default: 0 },
        calories:      { type: Number, default: 0 },
        activeMinutes: { type: Number, default: 0 },
        activeDays:    { type: Number, default: 0 },
    },

    // Статистика по типам активности (вложенные документы)
    byType: [typeStatSchema],

    // Личные рекорды (вложенный объект)
    records: {
        maxStepsPerDay:    { value: Number, date: Date, activityType: String },
        maxCaloriesPerDay: { value: Number, date: Date, activityType: String },
        longestSession:    { minutes: Number, date: Date, activityType: String },
        longestStreak:     { days: Number, from: Date, to: Date },
    },

    // Достижения (массив, растёт)
    achievements: [achievementSchema],

    // Месячные итоги (массив по месяцам)
    monthlyStats: [monthlyStatSchema],

}, { timestamps: true });

// Кастомный метод — количество достижений по категории
statsSchema.methods.countByCategory = function (category) {
    return this.achievements.filter(a => a.category === category).length;
};

module.exports = mongoose.model('StatsAchievements', statsSchema);
