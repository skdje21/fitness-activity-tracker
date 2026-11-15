'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'name', {
      type: Sequelize.STRING(100),
      allowNull: true,
      defaultValue: null,
    });
  },

  async down (queryInterface) {
    await queryInterface.removeColumn('Users', 'name');
  }
};
