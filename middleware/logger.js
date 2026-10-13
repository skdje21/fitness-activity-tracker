// Логирующее middleware: метод, URL, время запроса и длительность обработки.
// Пишет лог и в консоль, и в таблицу RequestLogs базы данных.
const { RequestLog } = require('../models/requestLog');

function logger(req, res, next) {
    const start = Date.now();
    const time = new Date().toLocaleString('ru-RU');

    console.log(`[${time}] --> ${req.method} ${req.originalUrl}`);

    // Событие 'finish' срабатывает, когда ответ полностью отправлен клиенту
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${time}] <-- ${req.method} ${req.originalUrl} ${res.statusCode} (${duration} мс)`);

        // Запись лога в БД (не блокирует ответ; ошибку только логируем)
        RequestLog.create({
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            durationMs: duration,
        }).catch((err) => {
            console.error('Не удалось записать лог в БД:', err.message);
        });
    });

    next();
}

module.exports = logger;
