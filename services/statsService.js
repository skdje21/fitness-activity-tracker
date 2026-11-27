// Сервис доменной логики: пересчёт статистики и достижений пользователя
// из его активностей (PostgreSQL) в коллекции MongoDB.
const { Activity } = require('../models');
const UserProfile = require('../models/UserProfile');
const Achievement = require('../models/Achievement');
const DailyStat = require('../models/DailyStat');
const { qualifyingCodes } = require('./achievementCatalog');

function ymd(value) {
    const d = new Date(value);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function dayDiff(a, b) {
    return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}

async function recomputeStats(userId) {
    const uid = String(userId);
    const acts = await Activity.findAll({ where: { userId }, order: [['date', 'ASC']] });

    let steps = 0, calories = 0, minutes = 0;
    const days = new Set();
    const byTypeMap = {};
    const perDay = {};
    const perMonth = {};
    let longestSession = { minutes: 0, date: null, activityType: null };

    for (const a of acts) {
        const s = a.steps || 0, c = a.calories || 0, mm = a.duration || 0;
        steps += s; calories += c; minutes += mm;
        const day = ymd(a.date); days.add(day);
        const type = a.type || 'Другое';

        const bt = byTypeMap[type] || (byTypeMap[type] = { totalSteps: 0, totalCalories: 0, totalMinutes: 0, sessions: 0 });
        bt.totalSteps += s; bt.totalCalories += c; bt.totalMinutes += mm; bt.sessions += 1;

        const pd = perDay[day] || (perDay[day] = { steps: 0, calories: 0, minutes: 0, byType: {} });
        pd.steps += s; pd.calories += c; pd.minutes += mm;
        const pdt = pd.byType[type] || (pd.byType[type] = { steps: 0, calories: 0, minutes: 0, sessions: 0 });
        pdt.steps += s; pdt.calories += c; pdt.minutes += mm; pdt.sessions += 1;

        const mon = day.slice(0, 7);
        const pm = perMonth[mon] || (perMonth[mon] = { steps: 0, calories: 0, days: new Set() });
        pm.steps += s; pm.calories += c; pm.days.add(day);

        if (mm > longestSession.minutes) longestSession = { minutes: mm, date: a.date, activityType: type };
    }

    // Рекорды по дню
    let maxSteps = { value: 0, date: null }, maxCal = { value: 0, date: null };
    for (const [day, v] of Object.entries(perDay)) {
        if (v.steps > maxSteps.value) maxSteps = { value: v.steps, date: day };
        if (v.calories > maxCal.value) maxCal = { value: v.calories, date: day };
    }

    // Самая длинная серия подряд
    const sortedDays = Object.keys(perDay).sort();
    let longest = 0, cur = 0, from = null, bestFrom = null, bestTo = null, prev = null;
    for (const day of sortedDays) {
        if (prev && dayDiff(prev, day) === 1) { cur += 1; } else { cur = 1; from = day; }
        if (cur > longest) { longest = cur; bestFrom = from; bestTo = day; }
        prev = day;
    }

    const byType = Object.entries(byTypeMap).map(([type, v]) => ({ type, ...v }));
    const monthlyStats = Object.entries(perMonth).map(([month, v]) => ({
        month, steps: v.steps, calories: v.calories, activeDays: v.days.size,
    }));

    const computed = {
        totalStats: { steps, calories, activeMinutes: minutes, activeDays: days.size },
        byType,
        monthlyStats,
        records: {
            maxStepsPerDay: { value: maxSteps.value, date: maxSteps.date ? new Date(maxSteps.date) : null, activityType: null },
            maxCaloriesPerDay: { value: maxCal.value, date: maxCal.date ? new Date(maxCal.date) : null, activityType: null },
            longestSession,
            longestStreak: { days: longest, from: bestFrom ? new Date(bestFrom) : null, to: bestTo ? new Date(bestTo) : null },
        },
    };

    // --- UserProfile ---
    let doc = await UserProfile.findOne({ userId: uid });
    if (!doc) {
        doc = new UserProfile({ userId: uid, ...computed });
    } else {
        Object.assign(doc, computed);
    }
    await doc.save();

    // --- Achievements ---
    // Факт получения (code + earnedAt) хранится в MongoDB, а правила и названия —
    // в каталоге AchievementTypes (PostgreSQL). Какие коды заслужены, решает каталог.
    const existingAch = await Achievement.find({ userId: uid });
    const prevEarned = {};
    for (const a of existingAch) prevEarned[a.code] = a.earnedAt;

    const metrics = {
        sessions: acts.length,
        steps,
        calories,
        maxStepsPerDay: maxSteps.value,
        longestStreak: longest,
        typeCount: byType.length,
    };
    const activeCodes = await qualifyingCodes(metrics);

    for (const code of activeCodes) {
        await Achievement.findOneAndUpdate(
            { userId: uid, code },
            { $setOnInsert: { userId: uid, code, earnedAt: prevEarned[code] || new Date() } },
            { upsert: true }
        );
    }
    await Achievement.deleteMany({ userId: uid, code: { $nin: activeCodes } });

    // --- DailyStats (отдельная коллекция) ---
    const bulkOps = Object.entries(perDay).map(([date, v]) => ({
        updateOne: {
            filter: { userId: uid, date },
            update: {
                $set: {
                    steps: v.steps,
                    calories: v.calories,
                    minutes: v.minutes,
                    byType: Object.entries(v.byType).map(([type, t]) => ({
                        type, steps: t.steps, calories: t.calories, minutes: t.minutes, sessions: t.sessions,
                    })),
                },
            },
            upsert: true,
        },
    }));
    if (bulkOps.length > 0) {
        await DailyStat.bulkWrite(bulkOps);
    }
    // Удалить дни, которых больше нет в активностях
    const allDays = Object.keys(perDay);
    if (allDays.length > 0) {
        await DailyStat.deleteMany({ userId: uid, date: { $nin: allDays } });
    } else {
        await DailyStat.deleteMany({ userId: uid });
    }

    // Вернуть совместимый объект для dashboard/summary
    const achievements = await Achievement.find({ userId: uid });
    doc.achievements = achievements;
    return doc;
}

async function safeRecompute(userId) {
    try {
        await recomputeStats(userId);
    } catch (err) {
        console.warn('recomputeStats:', err.message);
    }
}

module.exports = { recomputeStats, safeRecompute, ymd };
