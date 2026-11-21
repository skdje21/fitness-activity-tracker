
const { RequestLog } = require('../models/requestLog');


async function writeLog(entry) {
    try {
        await RequestLog.create(entry);
    } catch (err) {
        // Признак отсутствия таблицы (PostgreSQL: код 42P01 / "does not exist")
        const tableMissing =
            err.original?.code === '42P01' ||
            /does not exist|не существует/i.test(err.message);

        if (!tableMissing) {
            console.error('Не удалось записать лог в БД:', err.message);
            return;
        }

        try {
            await RequestLog.sync(); 
            console.warn(
                `[${new Date().toLocaleString('ru-RU')}] Таблица RequestLogs отсутствовала — создана заново`
            );
            await RequestLog.create(entry);
        } catch (err2) {
            console.error('Не удалось восстановить таблицу логов:', err2.message);
        }
    }
}

function logger(req, res, next) {
    const start = Date.now();
    const time = new Date().toLocaleString('ru-RU');

    console.log(`[${time}] --> ${req.method} ${req.originalUrl}`);


    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${time}] <-- ${req.method} ${req.originalUrl} ${res.statusCode} (${duration} мс)`);

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
