"use strict";
const { Sequelize, DataTypes, Model } = require("sequelize");
const bcrypt = require("bcrypt");
const sequelize = require("../../config/database");

class role extends Model {}

role.init(
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

    permissions: {
      type: DataTypes.ARRAY(DataTypes.STRING), // Array of permission IDs
      allowNull: true,
    },

    category: {
      type: DataTypes.STRING,
    },

    companyId: {
      type: DataTypes.UUID,
    },

    deletedAt: {
      type: DataTypes.DATE,
    },
  },
  {
    sequelize,
    paranoid: true,
    freezeTableName: true,
    modelName: "role",
  }
);

module.exports = role;
