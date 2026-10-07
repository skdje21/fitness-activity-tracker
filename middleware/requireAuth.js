// Middleware только для защищённых маршрутов: без авторизации — редирект на /login
function requireAuth(req, res, next) {
    if (req.user.role !== 'user') {
        return res.redirect('/login');
    }
    next();
}

module.exports = requireAuth;
