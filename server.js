require("dotenv").config({ path: `${process.cwd()}/.env` });
// const { webcrypto } = require("crypto");

// if (!globalThis.crypto) {
//   globalThis.crypto = webcrypto;
// }
const express = require("express");
const cors = require("cors");
const authRouter = require("./routes/authRoute");
const AppError = require("./utils/appError");
const catchAsync = require("./utils/catchAsync");
const globalErrorHandler = require("./controller/errorController");
const app = express();

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

const routes = require("./routes");
const { VPN_check } = require("./middleware/encryptDecrypt");
const auditLogger = require("./middleware/auditLogger");

const corsOptions = {
  origin: (origin, callback) => {
    callback(null, origin || "*");
  },
  credentials: true,
};

app.use(cors(corsOptions));

app.set("view enginer", "ejs");
app.use(function (req, res, next) {
  if (req.protocol === "http") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }
  next();
});

app.use(auditLogger); // saves log for PUT POST DELETE
app.use(VPN_check);

app.get("/", (req, res) => {
  res.status(200).json({
    status: "SUCCESS",
    message: "Backend is running oct 29 1",
  });
});

app.use("/", routes);

app.use(
  "*",
  catchAsync(async (req, res, next) => {
    throw new AppError(`Can't find ${req.originalUrl} on this server`, 404);
  })
);

app.use(globalErrorHandler);

const PORT = process.env.APP_PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running in PORT ${PORT}`);
});
