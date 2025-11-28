"use strict";
const { Model, DataTypes } = require("sequelize");
const sequelize = require("../../config/database");
const user = require("./user");
const asset = require("./asset");

class snapshot extends Model {}

snapshot.init(
  {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },

    address: { type: DataTypes.STRING },
    walletName: { type: DataTypes.STRING },
    assetId: { type: DataTypes.STRING },
    balance: { type: DataTypes.FLOAT, defaultValue: 0 },
    vaultId: { type: DataTypes.STRING },
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
    modelName: "snapshot",
  }
);

module.exports = snapshot;

snapshot.hasOne(asset, {
  foreignKey: "assetId",
  sourceKey: "assetId",
  as: "asset",
});
