// Имитация авторизации: если в запросе есть ?auth=1 — считаем пользователя вошедшим
function fakeAuth(req, res, next) {
    if (req.query.auth === '1') {
        req.user = { name: 'Р. А. Рудковский', role: 'user' };
    } else {
        req.user = { name: 'Гость', role: 'guest' };
    }

    res.locals.user = req.user;
    // Суффикс для ссылок, чтобы сохранять "авторизацию" (?auth=1) при переходах.
    // Для гостя — пустая строка.
    res.locals.authQuery = req.user.role === 'user' ? '?auth=1' : '';

    next();
}

module.exports = fakeAuth;
