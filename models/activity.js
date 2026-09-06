// Временное хранилище записей активности (шаги, калории).
// В следующих лабораторных этот массив заменит база данных.

let activities = [
    { id: 1, date: '2026-09-05', steps: 8200, calories: 420 },
    { id: 2, date: '2026-09-06', steps: 6100, calories: 315 }
];
let nextId = 3;

function getAll() {
    return activities;
}

function findById(id) {
    return activities.find((activity) => activity.id === id);
}

function create({ date, steps, calories }) {
    const newActivity = { id: nextId++, date, steps, calories };
    activities.push(newActivity);
    return newActivity;
}

function update(id, { date, steps, calories }) {
    const activity = findById(id);
    if (!activity) {
        return null;
    }
    activity.date = date;
    activity.steps = steps;
    activity.calories = calories;
    return activity;
}

function remove(id) {
    const index = activities.findIndex((activity) => activity.id === id);
    if (index === -1) {
        return false;
    }
    activities.splice(index, 1);
    return true;
}

module.exports = {
    getAll,
    findById,
    create,
    update,
    remove
};
