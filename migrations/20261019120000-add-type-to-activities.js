'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Activities', 'type', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'Другое', // значение для уже существующих записей
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Activities', 'type');
  }
};
