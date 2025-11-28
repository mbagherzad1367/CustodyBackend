"use strict";
const { Model, DataTypes, Sequelize } = require("sequelize");
const sequelize = require("../../config/database");
const asset = require("./asset");
const wallet = require("./wallet");
const user = require("./user");

class transaction extends Model {}

transaction.init(
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

    transactionId: {
      allowNull: false,
      type: DataTypes.UUID,
      unique: true,
    },

    amount: { type: DataTypes.FLOAT },
    assetId: { type: DataTypes.STRING },
    sourceAddress: { type: DataTypes.STRING },
    targetAddress: { type: DataTypes.STRING },
    txHash: { type: DataTypes.STRING },
    status: { type: DataTypes.STRING },
    subStatus: { type: DataTypes.STRING },
    note: { type: DataTypes.STRING },
    userType: { type: DataTypes.STRING },
    transactionType: { type: DataTypes.STRING },
    whichUser: { type: DataTypes.STRING },

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
    modelName: "transaction",
  }
);

module.exports = transaction;

transaction.hasOne(asset, {
  foreignKey: "assetId",
  sourceKey: "assetId",
  as: "asset",
});

transaction.hasOne(user, {
  foreignKey: "userId",
  sourceKey: "userId",
  as: "user",
});

transaction.hasOne(wallet, {
  foreignKey: "assetId",
  sourceKey: "assetId",
  as: "targetAsset",
  scope: sequelize.literal(
    '"transaction"."targetAddress"="targetAsset"."address"'
  ),
});

transaction.hasOne(wallet, {
  foreignKey: "assetId",
  sourceKey: "assetId",
  as: "sourceAsset",
  scope: sequelize.literal(
    '"transaction"."sourceAddress"="sourceAsset"."address"'
  ),
});
