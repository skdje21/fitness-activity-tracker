'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // У пользователя много активностей
      User.hasMany(models.Activity, { foreignKey: 'userId', as: 'activities' });
    }
  }
  User.init({
    name: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: null,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    passwordHash: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    failedLoginAttempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    lockUntil: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    // Роль: 'user' — обычный пользователь, 'admin' — администратор платформы
    role: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'user',
    },
    // Бан администратором (в отличие от временного lockUntil при брутфорсе)
    isBlocked: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
}, {
    sequelize,
    modelName: 'User',
});

  return User;
};