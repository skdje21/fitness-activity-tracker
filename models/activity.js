'use strict';
const {
  Model
} = require('sequelize');

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatDate(value) {
  const d = new Date(value);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDateTime(value) {
  const d = new Date(value);
  return `${formatDate(value)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

module.exports = (sequelize, DataTypes) => {
  class Activity extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }

    toJSON() {
      const values = { ...this.get() };
      if (values.date) values.date = formatDate(values.date);
      if (values.createdAt) values.createdAt = formatDateTime(values.createdAt);
      if (values.updatedAt) values.updatedAt = formatDateTime(values.updatedAt);
      return values;
    }
  }
  Activity.init({
    date: DataTypes.DATE,
    steps: DataTypes.INTEGER,
    calories: DataTypes.FLOAT,
    duration: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Activity',
  });
  return Activity;
};