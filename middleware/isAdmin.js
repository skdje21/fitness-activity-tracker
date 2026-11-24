// Пропускает только администраторов. Ставится ПОСЛЕ authMiddleware,
// который уже положил актуальную роль из БД в req.user.
function isAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Доступ только для администратора' });
    }
    next();
}

module.exports = isAdmin;
