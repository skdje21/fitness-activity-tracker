'use strict';

/** Роль пользователя и флаг блокировки администратором. */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('Users', 'role', {
            type: Sequelize.STRING(20),
            allowNull: false,
            defaultValue: 'user',
        });
        await queryInterface.addColumn('Users', 'isBlocked', {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('Users', 'role');
        await queryInterface.removeColumn('Users', 'isBlocked');
    },
};
