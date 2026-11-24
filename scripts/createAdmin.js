// Создание (или обновление) выделенной учётной записи администратора.
//
//   node scripts/createAdmin.js                      -> admin@admin.com / admin123
//   node scripts/createAdmin.js <email> <пароль>      -> свои данные
//   node scripts/createAdmin.js --list                -> показать всех админов
require('dotenv').config();
const bcrypt = require('bcrypt');
const { User, sequelize } = require('../models');

const DEFAULT_EMAIL = 'admin@admin.com';
const DEFAULT_PASSWORD = 'admin123';

async function main() {
    if (process.argv[2] === '--list') {
        const admins = await User.findAll({
            where: { role: 'admin' },
            attributes: ['id', 'email', 'name', 'isBlocked'],
            order: [['id', 'ASC']],
        });
        console.log(admins.length ? '\nАдминистраторы:' : '\nАдминистраторов нет.');
        admins.forEach((a) => console.log(`  #${a.id}  ${a.email}${a.isBlocked ? '  [ЗАБЛОКИРОВАН]' : ''}`));
        console.log('');
        return;
    }

    const email = process.argv[2] || DEFAULT_EMAIL;
    const password = process.argv[3] || DEFAULT_PASSWORD;

    if (password.length < 6) {
        console.error('Пароль должен быть не короче 6 символов.');
        process.exitCode = 1;
        return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const existing = await User.findOne({ where: { email } });

    if (existing) {
        await existing.update({
            passwordHash,
            role: 'admin',
            isBlocked: false,
            failedLoginAttempts: 0,
            lockUntil: null,
        });
        console.log(`Обновлён администратор: ${email}`);
    } else {
        await User.create({
            email,
            passwordHash,
            name: 'Администратор',
            role: 'admin',
        });
        console.log(`Создан администратор: ${email}`);
    }

    console.log(`Пароль: ${password}`);
}

main()
    .catch((err) => {
        console.error('Ошибка:', err.message);
        process.exitCode = 1;
    })
    .finally(() => sequelize.close());
