// Конфигурация PostgreSQL для Sequelize из переменных окружения.
// Нужна для Docker: внутри сети compose бэкенд обращается к БД по имени сервиса (db),
// а не к 127.0.0.1. Локально (без Docker) работают значения по умолчанию.
require('dotenv').config();

const base = {
    username: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || 'postgres',
    host: process.env.PG_HOST || '127.0.0.1',
    port: Number(process.env.PG_PORT) || 5432,
    dialect: 'postgres',
    logging: false,
};

module.exports = {
    development: { ...base, database: process.env.PG_DATABASE || 'fitness_tracker' },
    test: { ...base, database: process.env.PG_DATABASE_TEST || 'fitness_tracker_test' },
    production: { ...base, database: process.env.PG_DATABASE || 'fitness_tracker' },
};
