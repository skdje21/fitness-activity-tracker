'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Каталог достижений — справочник в PostgreSQL. Хранит не только текст
    // (название, категория, описание), но и само правило выдачи:
    // метрику и порог. Благодаря этому правила — это данные, а не код.
    await queryInterface.createTable('AchievementTypes', {
      code: {
        type: Sequelize.STRING(50),
        primaryKey: true,
        allowNull: false,
      },
      title:       { type: Sequelize.STRING(100), allowNull: false },
      category:    { type: Sequelize.STRING(20),  allowNull: false }, // steps | calories | streak | type
      metric:      { type: Sequelize.STRING(30),  allowNull: false }, // sessions | steps | calories | maxStepsPerDay | longestStreak | typeCount
      threshold:   { type: Sequelize.INTEGER,     allowNull: false },
      description: { type: Sequelize.STRING(200), allowNull: true },
      sortOrder:   { type: Sequelize.INTEGER,     allowNull: false, defaultValue: 0 },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    const now = new Date();
    const rows = [
      ['first_activity',   'Первая активность',        'type',     'sessions',       1,       'Записана первая тренировка'],
      ['sessions_10',      '10 тренировок',            'type',     'sessions',       10,      'Записано 10 тренировок'],
      ['sessions_50',      '50 тренировок',            'type',     'sessions',       50,      'Записано 50 тренировок'],
      ['sessions_100',     '100 тренировок',           'type',     'sessions',       100,     'Записано 100 тренировок'],
      ['steps_5k_day',     '5 000 шагов за день',      'steps',    'maxStepsPerDay', 5000,    '5 000 шагов за один день'],
      ['steps_10k_day',    '10 000 шагов за день',     'steps',    'maxStepsPerDay', 10000,   '10 000 шагов за один день'],
      ['steps_20k_day',    '20 000 шагов за день',     'steps',    'maxStepsPerDay', 20000,   '20 000 шагов за один день'],
      ['steps_50k_total',  '50 000 шагов суммарно',    'steps',    'steps',          50000,   '50 000 шагов за всё время'],
      ['steps_100k_total', '100 000 шагов суммарно',   'steps',    'steps',          100000,  '100 000 шагов за всё время'],
      ['steps_500k_total', '500 000 шагов суммарно',   'steps',    'steps',          500000,  '500 000 шагов за всё время'],
      ['steps_1m_total',   '1 000 000 шагов суммарно', 'steps',    'steps',          1000000, 'Миллион шагов за всё время'],
      ['calories_1k_total','1 000 калорий суммарно',   'calories', 'calories',       1000,    '1 000 калорий за всё время'],
      ['calories_10k_total','10 000 калорий суммарно', 'calories', 'calories',       10000,   '10 000 калорий за всё время'],
      ['calories_50k_total','50 000 калорий суммарно', 'calories', 'calories',       50000,   '50 000 калорий за всё время'],
      ['streak_3',         '3 дня подряд',             'streak',   'longestStreak',  3,       'Активность 3 дня подряд'],
      ['streak_7',         '7 дней подряд',            'streak',   'longestStreak',  7,       'Активность 7 дней подряд'],
      ['streak_14',        '14 дней подряд',           'streak',   'longestStreak',  14,      'Активность 14 дней подряд'],
      ['streak_30',        '30 дней подряд',           'streak',   'longestStreak',  30,      'Активность 30 дней подряд'],
      ['multisport',       '3 вида активности',        'type',     'typeCount',      3,       'Испробовано 3 вида активности'],
      ['multisport_4',     '4 вида активности',        'type',     'typeCount',      4,       'Испробовано 4 вида активности'],
    ];

    await queryInterface.bulkInsert('AchievementTypes', rows.map((r, i) => ({
      code: r[0], title: r[1], category: r[2], metric: r[3], threshold: r[4], description: r[5],
      sortOrder: i + 1, createdAt: now, updatedAt: now,
    })));
  },

  async down(queryInterface) {
    await queryInterface.dropTable('AchievementTypes');
  },
};
