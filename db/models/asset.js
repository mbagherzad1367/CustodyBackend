"use strict";
const { Model, DataTypes, Sequelize } = require("sequelize");
const sequelize = require("../../config/database");

class asset extends Model {}

asset.init(
  {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },

    name: { type: DataTypes.STRING },

    assetId: { type: DataTypes.STRING },

    icon: { type: DataTypes.STRING },

    krakenAssetId: {
      type: DataTypes.STRING,
    },
    createdAt: {
      type: DataTypes.DATE,
    },

    updatedAt: {
      type: DataTypes.DATE,
    },

    deletedAt: {
      type: DataTypes.DATE,
    },
  },
  {
    sequelize,
    paranoid: true,
    freezeTableName: true,
    modelName: "asset",
  }
);

module.exports = asset;
