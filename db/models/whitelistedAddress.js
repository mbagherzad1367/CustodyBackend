"use strict";
const { Model, DataTypes } = require("sequelize");
const sequelize = require("../../config/database");
const asset = require("./asset");

class whitelistedAddress extends Model {}

whitelistedAddress.init(
  {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    name: { type: DataTypes.STRING },
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
    assetId: { type: DataTypes.STRING },

    roleIds: {
      type: DataTypes.ARRAY(DataTypes.INTEGER), // Array of permission IDs
      allowNull: true,
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
    modelName: "whitelistedAddress",
  }
);

module.exports = whitelistedAddress;

whitelistedAddress.hasOne(asset, {
  foreignKey: "assetId",
  sourceKey: "assetId",
  as: "asset",
});
