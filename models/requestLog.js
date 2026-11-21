const { DataTypes } = require('sequelize');
const { sequelize } = require('./pzActivity'); 

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
    // поле createdAt (время создания записи лога) Sequelize добавляет автоматически
}, {
    tableName: 'RequestLogs',
    timestamps: true,       
    updatedAt: false,      
});

module.exports = { RequestLog };
