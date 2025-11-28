const { Sequelize } = require("sequelize");
const config = require("./config")["db3"];

const sequelizeDb3 = new Sequelize(config);
module.exports = sequelizeDb3;
