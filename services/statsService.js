// Сервис доменной логики: пересчёт статистики и достижений пользователя
// из его активностей (PostgreSQL) в документ StatsAchievements (MongoDB).
// Пересчёт идемпотентный — считаем всё заново, чтобы не копить ошибки.
const { Activity } = require('../models');
const Stats = require('../models/MongoUser');

// 'YYYY-MM-DD' из даты
function ymd(value) {
    const d = new Date(value);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function dayDiff(a, b) {
    return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}

// Правила достижений. category обязана входить в enum ['steps','calories','streak','type'].
function buildAchievements(m, prevEarned) {
    const defs = [
        { code: 'first_activity', title: 'Первая активность', category: 'type', when: m.sessions >= 1 },
        { code: 'steps_10k_day', title: '10 000 шагов за день', category: 'steps', when: m.maxStepsPerDay >= 10000 },
        { code: 'steps_100k_total', title: '100 000 шагов суммарно', category: 'steps', when: m.steps >= 100000 },
        { code: 'calories_10k_total', title: '10 000 калорий суммарно', category: 'calories', when: m.calories >= 10000 },
        { code: 'streak_7', title: '7 дней подряд с активностью', category: 'streak', when: m.longestStreak >= 7 },
        { code: 'multisport', title: '3 разных вида активности', category: 'type', when: m.typeCount >= 3 },
    ];
    return defs
        .filter((d) => d.when)
        .map((d) => ({
            code: d.code,
            title: d.title,
            category: d.category,
            earnedAt: prevEarned[d.code] || new Date(), // сохраняем исходную дату получения
        }));
}

async function recomputeStats(userId) {
    const uid = String(userId);
    const acts = await Activity.findAll({ where: { userId }, order: [['date', 'ASC']] });

    let steps = 0, calories = 0, minutes = 0;
    const days = new Set();
    const byTypeMap = {};
    const perDay = {};   // ymd -> {steps, calories}
    const perMonth = {}; // YYYY-MM -> {steps, calories, days:Set}
    let longestSession = { minutes: 0, date: null, activityType: null };

    for (const a of acts) {
        const s = a.steps || 0, c = a.calories || 0, mm = a.duration || 0;
        steps += s; calories += c; minutes += mm;
        const day = ymd(a.date); days.add(day);
        const type = a.type || 'Другое';

        const bt = byTypeMap[type] || (byTypeMap[type] = { totalSteps: 0, totalCalories: 0, totalMinutes: 0, sessions: 0 });
        bt.totalSteps += s; bt.totalCalories += c; bt.totalMinutes += mm; bt.sessions += 1;

        const pd = perDay[day] || (perDay[day] = { steps: 0, calories: 0 });
        pd.steps += s; pd.calories += c;

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

    // Самая длинная серия подряд идущих дней
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

    // Сохраняем профиль/цели/историю веса и исходные даты достижений
    let doc = await Stats.findOne({ userId: uid });
    const prevEarned = {};
    if (doc) for (const a of doc.achievements) prevEarned[a.code] = a.earnedAt;

    const achievements = buildAchievements(
        { sessions: acts.length, steps, calories, maxStepsPerDay: maxSteps.value, longestStreak: longest, typeCount: byType.length },
        prevEarned
    );

    if (!doc) {
        doc = new Stats({ userId: uid, ...computed, achievements });
    } else {
        Object.assign(doc, computed);
        doc.achievements = achievements;
    }
    await doc.save();
    return doc;
}

// Безопасная обёртка: пересчёт не должен ломать CRUD активностей
async function safeRecompute(userId) {
    try {
        await recomputeStats(userId);
    } catch (err) {
        console.warn('recomputeStats:', err.message);
    }
}

module.exports = { recomputeStats, safeRecompute, ymd };
