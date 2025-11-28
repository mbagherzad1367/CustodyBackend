"use strict";
const { Model, DataTypes } = require("sequelize");
const sequelize = require("../../config/database");
const user = require("./user");
const asset = require("./asset");

class wallet extends Model {}

wallet.init(
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

    address: { type: DataTypes.STRING },
    walletName: { type: DataTypes.STRING },
    assetId: { type: DataTypes.STRING },
    vaultId: { type: DataTypes.STRING },
    mnemonic: { type: DataTypes.STRING },
    privateKey: { type: DataTypes.STRING },
    publicKey: { type: DataTypes.STRING },
    balance: { type: DataTypes.FLOAT, defaultValue: 0 },
    notify: { type: DataTypes.BOOLEAN, defaultValue: false },
    createdAt: {
      type: DataTypes.DATE,
    },

    userType: { type: DataTypes.STRING, defaultValue: "user" },
    archived: { type: DataTypes.BOOLEAN, defaultValue: false }, // vault
    assetArchive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
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
    modelName: "wallet",
  }
);

module.exports = wallet;

wallet.hasOne(user, {
  foreignKey: "userId",
  sourceKey: "userId",
  as: "user",
});

wallet.hasOne(asset, {
  foreignKey: "assetId",
  sourceKey: "assetId",
  as: "asset",
});
