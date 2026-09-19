const { Activity } = require('../models');

function parseId(req) {
    return Number(req.params.id);
}

function validatePayload(body) {
    const { date, steps, calories, duration } = body;

    if (!date || typeof date !== 'string') {
        return 'Поле "date" обязательно и должно быть строкой (YYYY-MM-DD)';
    }
    if (!Number.isInteger(steps) || steps < 0) {
        return 'Поле "steps" обязательно и должно быть целым неотрицательным числом';
    }
    if (!Number.isFinite(calories) || calories < 0) {
        return 'Поле "calories" обязательно и должно быть неотрицательным числом';
    }
    if (duration !== undefined && duration !== null && (!Number.isInteger(duration) || duration < 0)) {
        return 'Поле "duration" должно быть целым неотрицательным числом (минуты)';
    }

    return null;
}

async function getActivities(req, res, next) {
    try {
        const { date } = req.query;
        const where = date === undefined ? {} : { date };
        const activities = await Activity.findAll({ where });
        res.status(200).json(activities);
    } catch (error) {
        next(error);
    }
}


async function getActivityById(req, res, next) {
    try {
        const activity = await Activity.findByPk(parseId(req));
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

        const { date, steps, calories, duration } = req.body;
        const created = await Activity.create({ date, steps, calories, duration });
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

        const [updatedCount] = await Activity.update(req.body, { where: { id } });
        if (updatedCount === 0) {
            return res.status(404).json({ error: 'Запись активности не найдена' });
        }

        const updated = await Activity.findByPk(id);
        res.status(200).json(updated);
    } catch (error) {
        next(error);
    }
}

async function deleteActivity(req, res, next) {
    try {
        const deletedCount = await Activity.destroy({ where: { id: parseId(req) } });
        if (deletedCount === 0) {
            return res.status(404).json({ error: 'Запись активности не найдена' });
        }
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
