// Имитация авторизации: если в запросе есть ?auth=1 — считаем пользователя вошедшим
function fakeAuth(req, res, next) {
    if (req.query.auth === '1') {
        req.user = { name: 'Р. А. Рудковский', role: 'user' };
    } else {
        req.user = { name: 'Гость', role: 'guest' };
    }

    // res.locals доступен внутри всех EJS-шаблонов, включая partials
    res.locals.user = req.user;

    next();
}

module.exports = fakeAuth;
