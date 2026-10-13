const { DataTypes } = require('sequelize');
const { sequelize } = require('./pzActivity'); // переиспользуем то же подключение к БД

// Таблица журнала запросов
const RequestLog = sequelize.define('RequestLog', {
    method: {               // HTTP-метод (GET, POST, ...)
        type: DataTypes.STRING,
        allowNull: false,
    },
    url: {                  // запрошенный адрес
        type: DataTypes.STRING,
        allowNull: false,
    },
    statusCode: {           // статус ответа (200, 302, 404, 500, ...)
        type: DataTypes.INTEGER,
    },
    durationMs: {           // длительность обработки в миллисекундах
        type: DataTypes.INTEGER,
    },
    // поле createdAt (время запроса) Sequelize добавляет автоматически
}, {
    tableName: 'RequestLogs',
});

module.exports = { RequestLog };
