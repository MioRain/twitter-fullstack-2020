'use strict'
const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class PrivateMessage extends Model {
    static associate(models) {
      PrivateMessage.belongsTo(models.User, { as: 'sender', foreignKey: 'senderId' })
      PrivateMessage.belongsTo(models.User, { as: 'receiver', foreignKey: 'receiverId' })
    }
  }

  PrivateMessage.init(
    {
      senderId: DataTypes.INTEGER,
      receiverId: DataTypes.INTEGER,
      unread: DataTypes.BOOLEAN,
      message: DataTypes.TEXT
    },
    {
      sequelize,
      modelName: 'PrivateMessage',
      tableName: 'PrivateMessages',
      underscored: true
    }
  )
  return PrivateMessage
}