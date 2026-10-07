// Логирующее middleware: метод, URL, время запроса и длительность обработки
function logger(req, res, next) {
    const start = Date.now();
    const time = new Date().toLocaleString('ru-RU');

    console.log(`[${time}] --> ${req.method} ${req.originalUrl}`);

    // Событие 'finish' срабатывает, когда ответ полностью отправлен клиенту
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${time}] <-- ${req.method} ${req.originalUrl} ${res.statusCode} (${duration} мс)`);
    });

    next();
}

module.exports = logger;
