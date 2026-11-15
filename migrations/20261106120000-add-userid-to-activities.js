'use strict';

/** Добавляет связь активности с пользователем (Activities.userId -> Users.id). */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('Activities', 'userId', {
            type: Sequelize.INTEGER,
            allowNull: true, // nullable, чтобы не ломать существующие записи
            references: { model: 'Users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
        });
        await queryInterface.addIndex('Activities', ['userId']);
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('Activities', 'userId');
    },
};
