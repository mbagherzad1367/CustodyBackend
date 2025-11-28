const { authenticator } = require("otplib");
const qrcode = require("qrcode");
const user = require("../../db/models/user");
const AppError = require("../../utils/appError");

authenticator.options = {
  digits: 6,
  algorithm: "sha1",
  encoding: "hex",
};

async function generateQR(url) {
  return await qrcode.toDataURL(url);
}

async function getTwoFactorURI(userID, secret) {
  try {
    let user_ = await user.findOne({
      where: {
        userId: userID,
      },
    });

    const accountName = user_ ? `${user_.firstname} ${userID}` : userID;
    return authenticator.keyuri(accountName, "VAULT", secret);
  } catch (error) {
    throw error; // Re-throw error for handling elsewhere if needed
  }
}

async function getAuthURIWithQR(userID) {
  const secret = authenticator.generateSecret();

  let existingUser = await user.findOne({ where: { userId: userID } });

  let authURL, qrImage;
  if (existingUser?.authSecret) {
    // gennerate url using secret and userId
    authURL = await getTwoFactorURI(userID, existingUser?.authSecret);
    qrImage = await generateQR(authURL);
  } else {
    if (secret) {
      let userUpdate;
      userUpdate = await user.update(
        {
          authSecret: secret,
        },
        {
          where: { userId: userID },
        }
      );

      if (!userUpdate) {
        throw new new ("URI not updated.", 500)()();
      }
    }
    authURL = await getTwoFactorURI(userID, secret);
    qrImage = await generateQR(authURL);
  }

  return {
    authURL,
    qrImage,
  };
}

async function validateTwoFAOTP(otp, userId) {
  let existingUser;

  existingUser = await user.findOne({ where: { userId } });

  let updatedUser;
  if (!existingUser?.authSecret) {
    updatedUser = await user.update(
      { tfaEnabled: false },
      { where: { userId } }
    );
  }

  if (!existingUser?.authSecret) {
    throw new AppError("Invalid OTP verify again", 400);
  }

  if (!otp) {
    throw new AppError("OTP cannot be empty", 400);
  }

  if (otp.length < 6) {
    throw new AppError("OTP too short", 400);
  }

  const validToken = authenticator.verify({
    token: otp,
    secret: existingUser?.authSecret,
  });

  return validToken;
}

module.exports = {
  getTwoFactorURI,
  generateQR,
  getAuthURIWithQR,
  validateTwoFAOTP,
};
