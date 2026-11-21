const { Sequelize, DataTypes } = require('sequelize');
const rules = require('../config/validation.json');

const sequelize = new Sequelize(
    process.env.PG_DATABASE || 'fitness_tracker',
    process.env.PG_USER || 'postgres',
    process.env.PG_PASSWORD || 'postgres',
    {
        host: process.env.PG_HOST || '127.0.0.1',
        port: Number(process.env.PG_PORT) || 5432,
        dialect: 'postgres',
        logging: false, // не засорять консоль SQL-запросами
    }
);

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
