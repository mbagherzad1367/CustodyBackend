"use strict";
const { Sequelize, DataTypes, Model } = require("sequelize");
const sequelize = require("../../config/database");

class logs extends Model {}

logs.init(
  {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },

    userId: {
      type: DataTypes.UUID,
    },

    firstname: {
      type: DataTypes.STRING,
    },

    lastname: {
      type: DataTypes.STRING,
    },

    method: {
      type: DataTypes.STRING,
    },

    ip: {
      type: DataTypes.STRING,
    },

    desc: {
      type: DataTypes.TEXT, // Long descriptions
    },

    statusCode: {
      type: DataTypes.INTEGER,
    },
  },
  {
    sequelize,
    freezeTableName: true,
    modelName: "logs",
    timestamps: true, // createdAt, updatedAt
  }
);

module.exports = logs;
