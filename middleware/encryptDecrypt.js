const CryptoJS = require("crypto-js");
const { ENCRYPTION_KEY } = require("../files/constants");

const decryptRequestBody = (req, res, next) => {
  if (req?.body?.data) {
    const decryptedData = CryptoJS.AES.decrypt(
      req.body.data,
      ENCRYPTION_KEY
    ).toString(CryptoJS.enc.Utf8);
    req.body = JSON.parse(decryptedData);
  }
  next();
};

const encryptResponseBody = (req, res, next) => {
  const originalJson = res.json;

  res.json = function (data) {
    const encryptedData = CryptoJS.AES.encrypt(
      JSON.stringify(data),
      ENCRYPTION_KEY
    ).toString();
    return originalJson.call(this, encryptedData);
  };

  next();
};

const VPN_check = async (req, res, next) => {
  try {
    const forwarded = req.headers["x-forwarded-for"];
    const ip =
      (typeof forwarded === "string" ? forwarded.split(",")[0] : null) ||
      req.connection.remoteAddress;

    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=16969727`
    );
    const data = await response?.json();

    if (data?.proxy) {
      return res.status(403).json({
        status: "fail",
        message: "VPN or Proxy detected. Access denied.",
      });
    }

    next();
  } catch (error) {
    console.error("VPN check failed", error.message);
    next(); // optionally block on failure too
  }
};

module.exports = {
  decryptRequestBody,
  encryptResponseBody,
  VPN_check,
};
