const { Sequelize } = require("sequelize");
const config = require("./config")["db2"];

const sequelizeDb2 = new Sequelize(config);
module.exports = sequelizeDb2;
