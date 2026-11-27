'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ActivityType extends Model {
    static associate(models) {
      // У одного типа — много активностей (связь по названию, а не по id)
      ActivityType.hasMany(models.Activity, { foreignKey: 'type', sourceKey: 'name', as: 'activities' });
    }
  }
  ActivityType.init({
    name: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      allowNull: false,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  }, {
    sequelize,
    modelName: 'ActivityType',
  });
  return ActivityType;
};
