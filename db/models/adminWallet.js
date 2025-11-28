"use strict";
const { Model, DataTypes } = require("sequelize");
const sequelize = require("../../config/database");
const user = require("./user");
const asset = require("./asset");

class adminWallet extends Model {}

adminWallet.init(
  {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },

    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "user", // Table name in the database
        key: "userId",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },

    assetId: { type: DataTypes.STRING },
    address: { type: DataTypes.STRING },
    vaultId: { type: DataTypes.INTEGER },
    mnemonic: { type: DataTypes.STRING },
    privateKey: { type: DataTypes.STRING },
    publicKey: { type: DataTypes.STRING },
    balance: { type: DataTypes.FLOAT, defaultValue: 0 },
    notify: { type: DataTypes.BOOLEAN, defaultValue: false },
    network: { type: DataTypes.STRING },
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
    modelName: "adminWallet",
  }
);

module.exports = adminWallet;

adminWallet.hasOne(user, {
  foreignKey: "userId",
  sourceKey: "userId",
  as: "user",
});
adminWallet.hasOne(asset, {
  foreignKey: "assetId",
  sourceKey: "assetId",
  as: "asset",
});
