// Сервис доменной логики: пересчёт статистики и достижений пользователя
// из его активностей (PostgreSQL) в коллекции MongoDB.
const { Activity } = require('../models');
const UserProfile = require('../models/UserProfile');
const Achievement = require('../models/Achievement');
const DailyStat = require('../models/DailyStat');

function ymd(value) {
    const d = new Date(value);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function dayDiff(a, b) {
    return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}

// Правила достижений
function buildAchievements(m, prevEarned) {
    const defs = [
        // Начало пути
        { code: 'first_activity', title: 'Первая активность', category: 'type', when: m.sessions >= 1 },
        { code: 'sessions_10', title: '10 тренировок', category: 'type', when: m.sessions >= 10 },
        { code: 'sessions_50', title: '50 тренировок', category: 'type', when: m.sessions >= 50 },
        { code: 'sessions_100', title: '100 тренировок', category: 'type', when: m.sessions >= 100 },
        // Шаги
        { code: 'steps_5k_day', title: '5 000 шагов за день', category: 'steps', when: m.maxStepsPerDay >= 5000 },
        { code: 'steps_10k_day', title: '10 000 шагов за день', category: 'steps', when: m.maxStepsPerDay >= 10000 },
        { code: 'steps_20k_day', title: '20 000 шагов за день', category: 'steps', when: m.maxStepsPerDay >= 20000 },
        { code: 'steps_50k_total', title: '50 000 шагов суммарно', category: 'steps', when: m.steps >= 50000 },
        { code: 'steps_100k_total', title: '100 000 шагов суммарно', category: 'steps', when: m.steps >= 100000 },
        { code: 'steps_500k_total', title: '500 000 шагов суммарно', category: 'steps', when: m.steps >= 500000 },
        { code: 'steps_1m_total', title: '1 000 000 шагов суммарно', category: 'steps', when: m.steps >= 1000000 },
        // Калории
        { code: 'calories_1k_total', title: '1 000 калорий суммарно', category: 'calories', when: m.calories >= 1000 },
        { code: 'calories_10k_total', title: '10 000 калорий суммарно', category: 'calories', when: m.calories >= 10000 },
        { code: 'calories_50k_total', title: '50 000 калорий суммарно', category: 'calories', when: m.calories >= 50000 },
        // Серии
        { code: 'streak_3', title: '3 дня подряд', category: 'streak', when: m.longestStreak >= 3 },
        { code: 'streak_7', title: '7 дней подряд', category: 'streak', when: m.longestStreak >= 7 },
        { code: 'streak_14', title: '14 дней подряд', category: 'streak', when: m.longestStreak >= 14 },
        { code: 'streak_30', title: '30 дней подряд', category: 'streak', when: m.longestStreak >= 30 },
        // Разнообразие
        { code: 'multisport', title: '3 вида активности', category: 'type', when: m.typeCount >= 3 },
        { code: 'multisport_4', title: '4 вида активности', category: 'type', when: m.typeCount >= 4 },
    ];
    return defs.filter((d) => d.when).map((d) => ({
        code: d.code,
        title: d.title,
        category: d.category,
        earnedAt: prevEarned[d.code] || new Date(),
    }));
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

    // --- Achievements (отдельная коллекция) ---
    const existingAch = await Achievement.find({ userId: uid });
    const prevEarned = {};
    for (const a of existingAch) prevEarned[a.code] = a.earnedAt;

    const newAchievements = buildAchievements(
        { sessions: acts.length, steps, calories, maxStepsPerDay: maxSteps.value, longestStreak: longest, typeCount: byType.length },
        prevEarned
    );

    for (const ach of newAchievements) {
        await Achievement.findOneAndUpdate(
            { userId: uid, code: ach.code },
            { $setOnInsert: { userId: uid, ...ach } },
            { upsert: true }
        );
    }
    const activeCodes = newAchievements.map(a => a.code);
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
