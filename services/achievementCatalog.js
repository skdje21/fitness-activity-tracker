// Каталог достижений из PostgreSQL. Отделяет справочные данные
// (название, категория, правило) от факта получения, который хранится
// в MongoDB как { userId, code, earnedAt }.
const { AchievementType } = require('../models');

let cache = null;

async function getCatalog() {
    if (!cache) {
        const rows = await AchievementType.findAll({ order: [['sortOrder', 'ASC']] });
        cache = rows.map((r) => r.get({ plain: true }));
    }
    return cache;
}

function clearCache() {
    cache = null;
}

// Коды достижений, порог которых достигнут по текущим метрикам пользователя.
async function qualifyingCodes(metrics) {
    const catalog = await getCatalog();
    return catalog
        .filter((c) => (metrics[c.metric] || 0) >= c.threshold)
        .map((c) => c.code);
}

// Дополняем полученные достижения (code + earnedAt) названием и категорией
// из каталога — чтобы клиент получал привычную форму.
async function enrich(earnedDocs) {
    const catalog = await getCatalog();
    const byCode = Object.fromEntries(catalog.map((c) => [c.code, c]));
    return earnedDocs
        .map((d) => {
            const c = byCode[d.code];
            if (!c) return null; // код, которого нет в каталоге, пропускаем
            return { code: d.code, title: c.title, category: c.category, earnedAt: d.earnedAt };
        })
        .filter(Boolean)
        .sort((a, b) => new Date(b.earnedAt) - new Date(a.earnedAt));
}

module.exports = { getCatalog, clearCache, qualifyingCodes, enrich };
