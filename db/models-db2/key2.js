const { DataTypes, Model } = require("sequelize");
const sequelizeDb2 = require("../../config/database.db2");

class key2 extends Model {}

key2.init(
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
    sequelize: sequelizeDb2,
    modelName: "key2",
    tableName: "key2",
    timestamps: true,
  }
);

module.exports = key2;
