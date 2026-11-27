'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AchievementType extends Model {}
  AchievementType.init({
    code:        { type: DataTypes.STRING(50), primaryKey: true, allowNull: false },
    title:       { type: DataTypes.STRING(100), allowNull: false },
    category:    { type: DataTypes.STRING(20), allowNull: false },
    metric:      { type: DataTypes.STRING(30), allowNull: false },
    threshold:   { type: DataTypes.INTEGER, allowNull: false },
    description: { type: DataTypes.STRING(200), allowNull: true },
    sortOrder:   { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  }, {
    sequelize,
    modelName: 'AchievementType',
  });
  return AchievementType;
};
