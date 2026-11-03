const mongoose = require('mongoose');

const typeStatSchema = new mongoose.Schema({
    type:          { type: String, required: true },  
    totalSteps:    { type: Number, default: 0 },
    totalCalories: { type: Number, default: 0 },
    totalMinutes:  { type: Number, default: 0 },
    sessions:      { type: Number, default: 0 },
}, { _id: true });

const achievementSchema = new mongoose.Schema({
    code:     { type: String, required: true },       
    title:    { type: String, required: true },        
    category: { type: String, enum: ['steps', 'calories', 'streak', 'type'], required: true },
    earnedAt: { type: Date, default: Date.now },
}, { _id: true });

const monthlyStatSchema = new mongoose.Schema({
    month:      { type: String, required: true },   
    steps:      { type: Number, default: 0 },
    calories:   { type: Number, default: 0 },
    activeDays: { type: Number, default: 0 },
}, { _id: true });

const weightEntrySchema = new mongoose.Schema({
    date:   { type: Date, required: true },
    weight: { type: Number, required: true },
}, { _id: true });


const statsSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },


    profile: {
        height:    { type: Number },                   
        weight:    { type: Number },                   
        birthYear: { type: Number },
        gender:    { type: String, enum: ['male', 'female'] },
    },

    weightHistory: [weightEntrySchema],

    totalStats: {
        steps:         { type: Number, default: 0 },
        calories:      { type: Number, default: 0 },
        activeMinutes: { type: Number, default: 0 },
        activeDays:    { type: Number, default: 0 },
    },


    byType: [typeStatSchema],


    records: {
        maxStepsPerDay:    { value: Number, date: Date, activityType: String },
        maxCaloriesPerDay: { value: Number, date: Date, activityType: String },
        longestSession:    { minutes: Number, date: Date, activityType: String },
        longestStreak:     { days: Number, from: Date, to: Date },
    },

    achievements: [achievementSchema],

    monthlyStats: [monthlyStatSchema],

}, { timestamps: true });


statsSchema.methods.countByCategory = function (category) {
    return this.achievements.filter(a => a.category === category).length;
};

module.exports = mongoose.model('StatsAchievements', statsSchema);
