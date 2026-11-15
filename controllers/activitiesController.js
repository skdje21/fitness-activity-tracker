const { Activity, Sequelize } = require('../models');
const { safeRecompute } = require('../services/statsService');

function parseId(req) {
    return Number(req.params.id);
}

// Пределы значений (защита от абсурдных и некорректных данных)
const LIMITS = { steps: 200000, calories: 50000, duration: 1440, typeLen: 50 };

function validatePayload(body) {
    const { date, type, steps, calories, duration } = body;

    // Дата: формат ГГГГ-ММ-ДД и валидность
    if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return 'Поле "date" обязательно в формате ГГГГ-ММ-ДД';
    }
    if (Number.isNaN(new Date(date).getTime())) {
        return 'Некорректная дата';
    }
    // Тип: строка разумной длины
    if (type != null && (typeof type !== 'string' || type.trim() === '' || type.length > LIMITS.typeLen)) {
        return `Поле "type" обязательно и не длиннее ${LIMITS.typeLen} символов`;
    }
    // Шаги: целое, 0..200000
    if (!Number.isInteger(steps) || steps < 0) {
        return 'Поле "steps" должно быть целым неотрицательным числом';
    }
    if (steps > LIMITS.steps) {
        return `Поле "steps" не может превышать ${LIMITS.steps}`;
    }
    // Калории: число, 0..50000
    if (!Number.isFinite(calories) || calories < 0) {
        return 'Поле "calories" должно быть неотрицательным числом';
    }
    if (calories > LIMITS.calories) {
        return `Поле "calories" не может превышать ${LIMITS.calories}`;
    }
    // Длительность (минуты): целое, 0..1440
    if (duration !== undefined && duration !== null &&
        (!Number.isInteger(duration) || duration < 0 || duration > LIMITS.duration)) {
        return `Поле "duration" должно быть целым числом от 0 до ${LIMITS.duration} (минуты)`;
    }

    return null;
}

async function getActivities(req, res, next) {
    try {
        const { date, search } = req.query;

        const conditions = [];

        if (date !== undefined) {
            conditions.push(Sequelize.where(Sequelize.fn('DATE', Sequelize.col('date')), date));
        }

        if (search) {
            conditions.push({ type: { [Sequelize.Op.iLike]: `%${search}%` } });
        }

        // Показываем только активности текущего пользователя
        conditions.push({ userId: req.user.id });

        const where = { [Sequelize.Op.and]: conditions };

        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const offset = (page - 1) * limit;

        const { count, rows } = await Activity.findAndCountAll({
            where,
            order: [['date', 'DESC']],
            limit,
            offset,
        });
        res.status(200).json({ data: rows, total: count, page, limit });
    } catch (error) {
        next(error);
    }
}


async function getActivityById(req, res, next) {
    try {
        const activity = await Activity.findOne({ where: { id: parseId(req), userId: req.user.id } });
        if (!activity) {
            return res.status(404).json({ error: 'Запись активности не найдена' });
        }
        res.status(200).json(activity);
    } catch (error) {
        next(error);
    }
}


async function createActivity(req, res, next) {
    try {
        const error = validatePayload(req.body);
        if (error) {
            return res.status(400).json({ error });
        }

        const { date, type, steps, calories, duration } = req.body;
        const created = await Activity.create({ date, type, steps, calories, duration, userId: req.user.id });
        await safeRecompute(req.user.id); // авто-обновление статистики и достижений
        res.status(201).json(created);
    } catch (error) {
        next(error);
    }
}


async function updateActivity(req, res, next) {
    const id = parseId(req);
    try {
        const error = validatePayload(req.body);
        if (error) {
            return res.status(400).json({ error });
        }

        const { date, type, steps, calories, duration } = req.body;
        const [updatedCount] = await Activity.update(
            { date, type, steps, calories, duration },
            { where: { id, userId: req.user.id } }
        );
        if (updatedCount === 0) {
            return res.status(404).json({ error: 'Запись активности не найдена' });
        }

        const updated = await Activity.findByPk(id);
        await safeRecompute(req.user.id);
        res.status(200).json(updated);
    } catch (error) {
        next(error);
    }
}

async function deleteActivity(req, res, next) {
    try {
        const deletedCount = await Activity.destroy({ where: { id: parseId(req), userId: req.user.id } });
        if (deletedCount === 0) {
            return res.status(404).json({ error: 'Запись активности не найдена' });
        }
        await safeRecompute(req.user.id);
        res.status(200).json({ message: 'Запись активности удалена' });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getActivities,
    getActivityById,
    createActivity,
    updateActivity,
    deleteActivity
};
