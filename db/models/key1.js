const { DataTypes, Model } = require("sequelize");
const sequelize = require("../../config/database");

class key1 extends Model {}

key1.init(
  {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    key: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    walletId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize: sequelize,
    modelName: "key1",
    tableName: "key1",
    timestamps: true,
  }
);

module.exports = key1;
