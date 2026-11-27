'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Справочник типов активности. Название — естественный первичный ключ:
    // в "Activities" тип хранится читаемой строкой, и Mongo-агрегаты
    // (byType) группируются по этому же названию.
    await queryInterface.createTable('ActivityTypes', {
      name: {
        type: Sequelize.STRING(50),
        primaryKey: true,
        allowNull: false,
      },
      sortOrder: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    const now = new Date();
    await queryInterface.bulkInsert('ActivityTypes', [
      { name: 'Ходьба',               sortOrder: 1,  createdAt: now, updatedAt: now },
      { name: 'Бег',                  sortOrder: 2,  createdAt: now, updatedAt: now },
      { name: 'Хайкинг',              sortOrder: 3,  createdAt: now, updatedAt: now },
      { name: 'Скандинавская ходьба', sortOrder: 4,  createdAt: now, updatedAt: now },
      { name: 'Подъём по лестнице',   sortOrder: 5,  createdAt: now, updatedAt: now },
      { name: 'Другое',               sortOrder: 99, createdAt: now, updatedAt: now },
    ]);

    // Подхватываем любые уже существующие в данных типы, которых нет в сиде,
    // иначе добавление внешнего ключа упадёт на «осиротевших» значениях.
    await queryInterface.sequelize.query(`
      INSERT INTO "ActivityTypes" (name, "sortOrder", "createdAt", "updatedAt")
      SELECT DISTINCT a.type, 50, NOW(), NOW()
      FROM "Activities" a
      WHERE a.type IS NOT NULL
        AND a.type NOT IN (SELECT name FROM "ActivityTypes")
    `);

    // Внешний ключ: тип активности обязан существовать в справочнике.
    // ON UPDATE CASCADE — переименование типа разойдётся по всем активностям;
    // ON DELETE RESTRICT — нельзя удалить тип, который ещё используется.
    await queryInterface.addConstraint('Activities', {
      fields: ['type'],
      type: 'foreign key',
      name: 'fk_activities_type',
      references: { table: 'ActivityTypes', field: 'name' },
      onUpdate: 'cascade',
      onDelete: 'restrict',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('Activities', 'fk_activities_type');
    await queryInterface.dropTable('ActivityTypes');
  },
};
