// Конфигурация подключения к PostgreSQL для Sequelize.
// Значения берутся из .env (секреты не хранятся в коде); при отсутствии —
// используются безопасные значения по умолчанию для локальной разработки.
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
    // На проде удобно задавать единую строку DATABASE_URL (Render/Railway и т.п.)
    production: process.env.DATABASE_URL
        ? {
            use_env_variable: 'DATABASE_URL',
            dialect: 'postgres',
            logging: false,
            dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
        }
        : { ...base, database: process.env.PG_DATABASE || 'fitness_tracker' },
};
