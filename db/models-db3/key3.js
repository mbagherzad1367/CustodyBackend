const { DataTypes, Model } = require("sequelize");
const sequelizeDb3 = require("../../config/database.db3");

class key3 extends Model {}

key3.init(
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
    sequelize: sequelizeDb3,
    modelName: "key3",
    tableName: "key3",
    timestamps: true,
  }
);

module.exports = key3;
