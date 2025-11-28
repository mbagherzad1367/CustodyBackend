// middleware/auditLogger.js
const { v4: uuidv4 } = require("uuid");
const { ENCRYPTION_KEY } = require("../files/constants");
const CryptoJS = require("crypto-js");
const logs = require("../db/models/logs");
const user = require("../db/models/user");
// const AuditLog = require("../models/auditLog");

function decryptData(encryptedBase64) {
  try {
    const decrypted = CryptoJS.AES.decrypt(
      encryptedBase64,
      ENCRYPTION_KEY
    ).toString(CryptoJS.enc.Utf8);
    return JSON.parse(decrypted);
  } catch (err) {
    console.error("Decrypt error in audit logger:", err);
    return null;
  }
}

const auditLogger = (req, res, next) => {
  const METHODS_TO_LOG = ["POST", "PUT", "DELETE"];
  if (!METHODS_TO_LOG.includes(req.method)) return next();

  const originalJson = res.json.bind(res);
  let logDesc = null;
  let decrypted_data = null;

  // Intercept JSON response
  res.json = (body) => {
    decrypted_data = decryptData(body);

    // If decrypted data has a success or error message
    if (decrypted_data?.desc || decrypted_data?.message) {
      logDesc = decrypted_data.desc || decrypted_data?.message;
    } else if (decrypted_data?.error) {
      logDesc = decrypted_data.error;
    }

    return originalJson(body);
  };

  res.on("finish", async () => {
    try {
      let userId = req?.user?.userId || null;
      let firstname = req?.user?.firstname || null;
      let lastname = req?.user?.lastname || null;

      // For signup/login cases
      if (
        (!userId || !firstname) &&
        (req.path.includes("/signup") || req.path.includes("/login"))
      ) {
        userId = decrypted_data?.body?.userId || userId;
        firstname = decrypted_data?.body?.firstname || firstname;
        lastname = decrypted_data?.body?.lastname || lastname;
      }

      if (req.body.userId) {
        const founUser = await user.findOne({
          where: { userId: req.body.userId },
          attributes: ["firstname", "lastname"],
        });

        firstname = founUser?.firstname;
        lastname = founUser?.lastname;
        userId = req.body.userId;
      }

      const logEntry = {
        userId,
        firstname,
        lastname,
        method: req.method,
        ip: req.ip,
        desc: logDesc || res.locals.errorMessage || `Status ${res.statusCode}`,
        statusCode: res.statusCode,
      };

      // Save to DB
      await logs.create(logEntry);
      console.log("AUDIT LOG:", logEntry);
    } catch (err) {
      console.error("Audit log save error:", err);
    }
  });

  next();
};

module.exports = auditLogger;
