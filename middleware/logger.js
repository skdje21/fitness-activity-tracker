const { RequestLog } = require('../models/requestLog');


function isTableMissing(err) {
    return (
        err?.original?.code === '42P01' ||
        /does not exist|не существует/i.test(err?.message || '')
    );
}

async function writeLog(entry) {
    try {
        await RequestLog.create(entry);
    } catch (err) {
        if (isTableMissing(err)) {
            console.error(
                `[ЖУРНАЛ] Отказ записи лога: таблица RequestLogs недоступна (удалена/переименована). ${err.message}`
            );
        } else {
            console.error('[ЖУРНАЛ] Не удалось записать лог в БД:', err.message);
        }

        // --- РАНЕЕ здесь было молчаливое авто-восстановление таблицы ---
        //  журнал не чинится сам, а операция записи получает отказ.
        // try {
        //     await RequestLog.sync(); // пересоздавало таблицу RequestLogs
        //     console.warn(`[${new Date().toLocaleString('ru-RU')}] Таблица RequestLogs отсутствовала — создана заново`);
        //     await RequestLog.create(entry);
        // } catch (err2) {
        //     console.error('Не удалось восстановить таблицу логов:', err2.message);
        // }
    }
}

function logger(req, res, next) {
    const start = Date.now();
    const time = new Date().toLocaleString('ru-RU');

    console.log(`[${time}] --> ${req.method} ${req.originalUrl}`);


    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${time}] <-- ${req.method} ${req.originalUrl} ${res.statusCode} (${duration} мс)`);


        if (req.skipFinishDbLog) return;

        writeLog({
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            durationMs: duration,
        });
    });

    next();
}

module.exports = logger;
module.exports.writeLog = writeLog;
module.exports.isTableMissing = isTableMissing;
