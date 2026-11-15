const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
    userId:   { type: String, required: true, index: true },
    code:     { type: String, required: true },
    title:    { type: String, required: true },
    category: { type: String, enum: ['steps', 'calories', 'streak', 'type'], required: true },
    earnedAt: { type: Date, default: Date.now },
}, { timestamps: true });

achievementSchema.index({ userId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Achievement', achievementSchema);
