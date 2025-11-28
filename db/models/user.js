"use strict";
const { Sequelize, DataTypes, Model } = require("sequelize");
const bcrypt = require("bcrypt");
const sequelize = require("../../config/database");
const role = require("./role");
// const transaction = require("./transaction");

class user extends Model {}

user.init(
  {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },

    userId: {
      allowNull: false,
      type: DataTypes.UUID,
      defaultValue: Sequelize.UUIDV4,
      unique: true,
    },

    firstname: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: { msg: "firstname cannot be null" },
        notEmpty: { msg: "firstname cannot be empty" },
      },
    },

    lastname: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: { msg: "lastname cannot be null" },
        notEmpty: { msg: "lastname cannot be empty" },
      },
    },

    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: { msg: "password cannot be null" },
        notEmpty: { msg: "password cannot be empty" },
      },
    },

    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notNull: { msg: "email cannot be null" },
        notEmpty: { msg: "email cannot be empty" },
        isEmail: { msg: "Invalid email id" },
      },
    },

    phone: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notNull: { msg: "phone cannot be null" },
        notEmpty: { msg: "phone cannot be empty" },
        isNumeric: { msg: "Invalid phone number" },
      },
    },

    tfaEnabled: {
      defaultValue: false,
      type: DataTypes.BOOLEAN,
    },

    authSecret: {
      type: DataTypes.STRING,
    },

    countrycode: {
      type: DataTypes.STRING,
    },

    otp: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    otpExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true, // Expiry time for the OTP
    },

    isOTPVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    // role: {
    //   type: DataTypes.STRING,
    //   allowNull: true,
    //   defaultValue: "user",
    // },

    roleId: {
      type: DataTypes.INTEGER,
    },

    vaultIds: {
      type: DataTypes.ARRAY(DataTypes.STRING), // Array of permission IDs
      allowNull: true,
    },

    // company
    userType: {
      type: DataTypes.STRING,
      defaultValue: "user", // ["user","company","companyUser"]
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
    modelName: "user",
  }
);

user.hasOne(role, {
  foreignKey: "id",
  sourceKey: "roleId",
  as: "roleDetails",
});

user.hasMany(user, {
  foreignKey: "companyId",
  sourceKey: "userId",
  as: "companyUsers",
});

// user.hasMany(transaction, {
//   foreignKey: "userId",
//   sourceKey: "userId",
//   as: "transactions",
// });

module.exports = user;
