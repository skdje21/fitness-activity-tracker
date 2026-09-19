'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('Activities', [
      {
        date: new Date('2026-09-10'),
        steps: 8000,
        calories: 320.5,
        duration: 45,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        date: new Date('2026-09-11'),
        steps: 12000,
        calories: 510,
        duration: 70,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        date: new Date('2026-09-12'),
        steps: 6500,
        calories: 240,
        duration: 35,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('Activities', null, {});
  },
};
