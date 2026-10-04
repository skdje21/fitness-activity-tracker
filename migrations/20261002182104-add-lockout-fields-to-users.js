'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'failedLoginAttempts', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn('Users', 'lockUntil', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down (queryInterface) {
    await queryInterface.removeColumn('Users', 'failedLoginAttempts');
    await queryInterface.removeColumn('Users', 'lockUntil');
  }
};
