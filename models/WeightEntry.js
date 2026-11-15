const mongoose = require('mongoose');

const weightEntrySchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    date:   { type: Date, required: true },
    weight: { type: Number, required: true },
}, { timestamps: true });

weightEntrySchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('WeightEntry', weightEntrySchema);
