require("dotenv").config({ path: `${process.cwd()}/.env` });

module.exports = {
  development: {
    username: process.env.DB_USER || "cryptoprocessingdb",
    password: process.env.DB_PASSWORD || "Oa6DlSbavLa0NNp",
    database: process.env.DB_NAME || "postgres",
    host: process.env.DB_HOST || "db",
    port: process.env.DB_PORT || 5432,
    dialect: "postgres",
    dialectOptions: {
      ssl: process.env.DB_SSL === "true" ? {
        require: true,
        rejectUnauthorized: false,
      } : false,
    },
    pool: {
      max: parseInt(process.env.DB_POOL_MAX) || 5,
      min: parseInt(process.env.DB_POOL_MIN) || 0,
      acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 60000,
      idle: parseInt(process.env.DB_POOL_IDLE) || 20000,
    },
    logging: process.env.DB_LOGGING === "true"
  },

  db2: {
    username: process.env.DB2_USER || "cryptoprocessingdb",
    password: process.env.DB2_PASSWORD || "Oa6DlSbavLa0NNp",
    database: process.env.DB2_NAME || "postgresprime",
    host: process.env.DB2_HOST || "db",
    port: process.env.DB2_PORT || 5432,
    dialect: "postgres",
    dialectOptions: {
      ssl: process.env.DB2_SSL === "true" ? {
        require: true,
        rejectUnauthorized: false,
      } : false,
    },
    pool: {
      max: parseInt(process.env.DB2_POOL_MAX) || 5,
      min: parseInt(process.env.DB2_POOL_MIN) || 0,
      acquire: parseInt(process.env.DB2_POOL_ACQUIRE) || 60000,
      idle: parseInt(process.env.DB2_POOL_IDLE) || 20000,
    },
    logging: process.env.DB2_LOGGING === "true"
  },

  db3: {
    username: process.env.DB3_USER || "cryptoprocessingdb",
    password: process.env.DB3_PASSWORD || "Oa6DlSbavLa0NNp",
    database: process.env.DB3_NAME || "postgressecond",
    host: process.env.DB3_HOST || "db",
    port: process.env.DB3_PORT || 5432,
    dialect: "postgres",
    dialectOptions: {
      ssl: process.env.DB3_SSL === "true" ? {
        require: true,
        rejectUnauthorized: false,
      } : false,
    },
    pool: {
      max: parseInt(process.env.DB3_POOL_MAX) || 5,
      min: parseInt(process.env.DB3_POOL_MIN) || 0,
      acquire: parseInt(process.env.DB3_POOL_ACQUIRE) || 60000,
      idle: parseInt(process.env.DB3_POOL_IDLE) || 20000,
    },
    logging: process.env.DB3_LOGGING === "true"
  },
};
