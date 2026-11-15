// Миграция данных из старой коллекции StatsAchievements
// в новые коллекции: UserProfile, WeightEntry, Achievement, DailyStat
// Запуск: node scripts/migrate-mongo-collections.js

require('dotenv').config();
const mongoose = require('mongoose');
const UserProfile = require('../models/UserProfile');
const WeightEntry = require('../models/WeightEntry');
const Achievement = require('../models/Achievement');

async function migrate() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    const oldCollection = mongoose.connection.collection('statsachievements');
    const docs = await oldCollection.find({}).toArray();
    console.log(`Found ${docs.length} documents to migrate`);

    for (const old of docs) {
        const uid = old.userId;
        console.log(`Migrating userId: ${uid}`);

        // 1. UserProfile
        const profileData = {
            userId: uid,
            profile: old.profile || {},
            goals: old.goals || { dailySteps: 10000, dailyCalories: 500 },
            totalStats: old.totalStats || {},
            byType: old.byType || [],
            records: old.records || {},
            monthlyStats: old.monthlyStats || [],
        };
        await UserProfile.findOneAndUpdate(
            { userId: uid },
            { $set: profileData },
            { upsert: true }
        );

        // 2. WeightEntry
        if (old.weightHistory && old.weightHistory.length > 0) {
            for (const w of old.weightHistory) {
                await WeightEntry.findOneAndUpdate(
                    { userId: uid, date: w.date },
                    { $set: { userId: uid, date: w.date, weight: w.weight } },
                    { upsert: true }
                );
            }
            console.log(`  → ${old.weightHistory.length} weight entries`);
        }

        // 3. Achievement
        if (old.achievements && old.achievements.length > 0) {
            for (const a of old.achievements) {
                await Achievement.findOneAndUpdate(
                    { userId: uid, code: a.code },
                    { $set: { userId: uid, code: a.code, title: a.title, category: a.category, earnedAt: a.earnedAt } },
                    { upsert: true }
                );
            }
            console.log(`  → ${old.achievements.length} achievements`);
        }
    }

    console.log('Migration complete!');
    process.exit(0);
}

migrate().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
