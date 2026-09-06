const Activity = require('../models/activity');

function parseId(req) {
    return Number(req.params.id);
}

function validatePayload(body) {
    const { date, steps, calories } = body;

    if (!date || typeof date !== 'string') {
        return 'Поле "date" обязательно и должно быть строкой (YYYY-MM-DD)';
    }
    if (!Number.isInteger(steps) || steps < 0) {
        return 'Поле "steps" обязательно и должно быть целым неотрицательным числом';
    }
    if (!Number.isFinite(calories) || calories < 0) {
        return 'Поле "calories" обязательно и должно быть неотрицательным числом';
    }

    return null;
}

// GET /activities — список всех записей, опционально ?date=YYYY-MM-DD
function getActivities(req, res) {
    const { date } = req.query;
    const items = Activity.getAll();

    if (date !== undefined) {
        return res.status(200).json(items.filter((activity) => activity.date === date));
    }

    res.status(200).json(items);
}

// GET /activities/:id
function getActivityById(req, res) {
    const activity = Activity.findById(parseId(req));
    if (!activity) {
        return res.status(404).json({ error: 'Запись активности не найдена' });
    }
    res.status(200).json(activity);
}

// POST /activities
function createActivity(req, res) {
    const error = validatePayload(req.body);
    if (error) {
        return res.status(400).json({ error });
    }

    const { date, steps, calories } = req.body;
    const created = Activity.create({ date, steps, calories });
    res.status(201).json(created);
}

// PUT /activities/:id — полное обновление
function updateActivity(req, res) {
    const id = parseId(req);
    if (!Activity.findById(id)) {
        return res.status(404).json({ error: 'Запись активности не найдена' });
    }

    const error = validatePayload(req.body);
    if (error) {
        return res.status(400).json({ error });
    }

    const { date, steps, calories } = req.body;
    const updated = Activity.update(id, { date, steps, calories });
    res.status(200).json(updated);
}

// DELETE /activities/:id
function deleteActivity(req, res) {
    const removed = Activity.remove(parseId(req));
    if (!removed) {
        return res.status(404).json({ error: 'Запись активности не найдена' });
    }
    res.status(200).json({ message: 'Запись активности удалена' });
}

module.exports = {
    getActivities,
    getActivityById,
    createActivity,
    updateActivity,
    deleteActivity
};
