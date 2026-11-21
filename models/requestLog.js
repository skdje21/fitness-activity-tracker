const { DataTypes } = require('sequelize');
const { sequelize } = require('./pzActivity'); // переиспользуем то же подключение к БД

// Таблица журнала запросов
const RequestLog = sequelize.define('RequestLog', {
    method: {               
        type: DataTypes.STRING,
        allowNull: false,
    },
    url: {                 
        type: DataTypes.STRING,
        allowNull: false,
    },
    statusCode: {           
        type: DataTypes.INTEGER,
    },
    durationMs: {         
        type: DataTypes.INTEGER,
    },
    // поле createdAt (время запроса) Sequelize добавляет автоматически
}, {
    tableName: 'RequestLogs',
});

module.exports = { RequestLog };
