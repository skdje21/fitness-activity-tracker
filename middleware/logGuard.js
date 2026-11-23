const { RequestLog } = require('../models/requestLog');
const { isTableMissing } = require('./logger');

async function logGuard(req, res, next) {
    try {
        await RequestLog.create({
            method: req.method,
            url: req.originalUrl,
            statusCode: null,
            durationMs: null,
        });

        req.skipFinishDbLog = true;
        next();
    } catch (err) {
        if (isTableMissing(err)) {
            console.error(
                `[ЦЕЛОСТНОСТЬ] Отказ операции ${req.method} ${req.originalUrl}: ` +
                `журнал логов недоступен (таблица RequestLogs удалена/переименована). ${err.message}`
            );
            return res.status(503).render('log-error', {
                title: 'Ошибка журнала логов',
                message: 'Невозможно записать операцию в журнал логов: таблица журнала недоступна. ' +
                         'Операция отклонена для сохранения целостности данных.'
            });
        }
        // Иная ошибка БД — отдаём в общий обработчик (500)
        next(err);
    }
}

module.exports = logGuard;
