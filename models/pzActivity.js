const { Sequelize, DataTypes } = require('sequelize');
const rules = require('../config/validation.json');

const sequelize = new Sequelize('fitness_tracker', 'postgres', 'postgres', {
    host: '127.0.0.1',
    port: 5432,
    dialect: 'postgres',
    logging: false, // не засорять консоль SQL-запросами
});

const PzActivity = sequelize.define('PzActivity', {
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    steps: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: rules.steps.min, max: rules.steps.max },
    },
    calories: {
        type: DataTypes.FLOAT,
        allowNull: false,
        validate: { min: rules.calories.min, max: rules.calories.max },
    },
}, {
    tableName: 'PzActivities',
    timestamps: true,
});

module.exports = { sequelize, PzActivity };
