const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize('fitness_tracker', 'postgres', 'postgres', {
    host: '127.0.0.1',
    port: 5432,
    dialect: 'postgres',
    logging: false, // не засорять консоль SQL-запросами
});

const PzActivity = sequelize.define('PzActivity', {
    date: {
        type: DataTypes.DATEONLY, // только дата (YYYY-MM-DD), без времени и таймзон
        allowNull: false,
    },
    steps: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    calories: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
}, {
    tableName: 'PzActivities',
});

module.exports = { sequelize, PzActivity };
