const mongoose = require('mongoose');

// Вложенная схема: разбивка по типу за день (embedded document)
const dayTypeBreakdownSchema = new mongoose.Schema({
    type:     { type: String, required: true },
    steps:    { type: Number, default: 0 },
    calories: { type: Number, default: 0 },
    minutes:  { type: Number, default: 0 },
    sessions: { type: Number, default: 0 },
}, { _id: false });

const dailyStatSchema = new mongoose.Schema({
    userId:   { type: String, required: true, index: true },
    date:     { type: String, required: true },
    steps:    { type: Number, default: 0 },
    calories: { type: Number, default: 0 },
    minutes:  { type: Number, default: 0 },

    // Массив вложенных документов: детализация по типам за день
    byType: [dayTypeBreakdownSchema],
}, { timestamps: true });

dailyStatSchema.index({ userId: 1, date: -1 }, { unique: true });

module.exports = mongoose.model('DailyStat', dailyStatSchema);
