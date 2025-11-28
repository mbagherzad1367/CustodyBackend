"use strict";
const { Sequelize, DataTypes, Model } = require("sequelize");
const bcrypt = require("bcrypt");
const sequelize = require("../../config/database");
const role = require("./role");

class permission extends Model {}

permission.init(
  {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },

    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    label: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    category: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    deletedAt: {
      type: DataTypes.DATE,
    },
  },
  {
    sequelize,
    paranoid: true,
    freezeTableName: true,
    modelName: "permission",
  }
);

module.exports = permission;
