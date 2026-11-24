// Восстановление типов активностей, испорченных при вводе через не-UTF-8 клиент.
//
// Такие значения состоят из символов-замен U+FFFD («�»): исходные байты потеряны
// ещё при записи, побайтно восстановить нельзя. Но длина строки сохранилась,
// а набор типов фиксированный — по длине тип определяется однозначно
// (кроме 6 символов: «Ходьба» / «Другое» — берём «Ходьба», она реально
// встречается в данных, «Другое» — ни разу).
//
//   node scripts/fixEncoding.js --dry   -> только показать, что будет изменено
//   node scripts/fixEncoding.js         -> применить
require('dotenv').config();
const { Op } = require('sequelize');
const { Activity, sequelize } = require('../models');

const BY_LENGTH = {
    3: 'Бег',
    6: 'Ходьба',
    7: 'Хайкинг',
    8: 'Плавание',
    9: 'Велосипед',
};
const FALLBACK = 'Другое';

async function main() {
    const dry = process.argv.includes('--dry');

    const broken = await Activity.findAll({
        where: { type: { [Op.like]: '%�%' } },
        order: [['id', 'ASC']],
    });

    if (broken.length === 0) {
        console.log('Испорченных типов не найдено — данные в порядке.');
        return;
    }

    console.log(`Найдено записей с повреждённым типом: ${broken.length}\n`);

    const ambiguous = [];
    for (const a of broken) {
        const len = String(a.type).length;
        const fixed = BY_LENGTH[len] || FALLBACK;
        if (len === 6) ambiguous.push(a.id);

        console.log(`  #${a.id}  длина ${len}  ->  "${fixed}"   (шагов: ${a.steps})`);
        if (!dry) await a.update({ type: fixed });
    }

    console.log(dry ? '\n[--dry] Изменения НЕ применены.' : '\nГотово: типы восстановлены.');

    if (ambiguous.length) {
        console.log(
            `\nВнимание: записи ${ambiguous.map((i) => '#' + i).join(', ')} имели длину 6 —\n` +
            'это могло быть и «Ходьба», и «Другое». Проставлена «Ходьба».\n' +
            'Если нужно иначе — поправь вручную в разделе «Активности».'
        );
    }
}

main()
    .catch((err) => {
        console.error('Ошибка:', err.message);
        process.exitCode = 1;
    })
    .finally(() => sequelize.close());
