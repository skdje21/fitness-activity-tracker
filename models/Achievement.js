const mongoose = require('mongoose');

// Факт получения достижения. Название и категория не дублируются здесь —
// они берутся из каталога AchievementTypes (PostgreSQL) по коду.
const achievementSchema = new mongoose.Schema({
    userId:   { type: String, required: true, index: true },
    code:     { type: String, required: true },
    earnedAt: { type: Date, default: Date.now },
}, { timestamps: true });

achievementSchema.index({ userId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Achievement', achievementSchema);
