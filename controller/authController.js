const user = require("../db/models/user");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const { encryptTheResponse, decryptTheRequest } = require("../files/constants");
const { Op } = require("sequelize");
const {
  getAuthURIWithQR,
  validateTwoFAOTP,
} = require("../files/auth/twoFactor");
const sequelize = require("../config/database");
const { sendEmail } = require("../files/sendEmail");
const role = require("../db/models/role");
const wallet = require("../db/models/wallet");

const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });
};

const signup = async (req, res, next) => {
  const body = req.body;

  // Hash the password before saving
  const hashedPassword = await bcrypt.hash(body.password, 10);

  const newUser = await user.create({
    firstname: body.firstname,
    lastname: body.lastname,
    email: body.email,
    phone: body.phone,
    countrycode: body.countrycode,
    password: hashedPassword, // Store the hashed password
  });

  if (!newUser) {
    return next(new AppError("Failed to create the user", 400));
  }

  const result = newUser.toJSON();

  delete result.password;
  delete result.deletedAt;

  result.token = generateToken({
    id: result.id,
  });

  const resBody = {
    message: "User Created successfully!",
    success: true,
    body: result, // Send the created user details without password
  };

  return res.json(resBody);
};

const login = async (req, res, next) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return next(new AppError("Please provide email and password", 400));
  }
  const result = await user.findOne({
    where: {
      [Op.or]: [{ email: identifier }, { phone: identifier }],
    },
    include: [
      { model: role, attributes: ["name", "permissions"], as: "roleDetails" },
    ],
  });

  if (!result) {
    return next(new AppError("User not found", 401));
  }

  const isMatch = await bcrypt.compare(password, result.password);
  if (!isMatch) {
    return next(new AppError("Incorrect email or password", 401));
  }

  const token = generateToken({
    id: result.id,
  });

  const { firstname, lastname, email, tfaEnabled, userId, userType } = result;

  const resBody = {
    success: true,
    message: "Successfully Loggedin",
    desc: `${firstname} ${lastname} logged in successfully!`,
    body: {
      token,
      userId,
      firstname,
      lastname,
      email,
      tfaEnabled,
      roleDetails: result.roleDetails,
      userType,
    },
  };

  return res.json(resBody);
};

const getUser = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
   console.log('called', userId);
  const foundUser = await user.findByPk(userId, {
    attributes: { exclude: ["password", "deletedAt"] },
  });

  if (!foundUser) {
    return next(new AppError("User not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: foundUser,
  });
});

const authentication = catchAsync(async (req, res, next) => {
  let idToken = "";
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    // Bearer
    idToken = req.headers.authorization.split(" ")[1];
  }
  if (!idToken) {
    return next(new AppError("Please login to get access", 401));
  }
  const tokenDetail = jwt.verify(idToken, process.env.JWT_SECRET_KEY);
  const freshUser = await user.findByPk(tokenDetail.id);

  if (!freshUser) {
    return next(new AppError("User no longer exists", 400));
  }

  req.user = freshUser;
  return next();
});

const checkRole = (requiredPermission) => {
  return catchAsync(async (req, res, next) => {
    // Authentication middleware should have set req.user
    const roleId = req.user?.roleId;

    // Get role
    const userRole = await role.findByPk(roleId);
    if (!userRole) {
      return next(new AppError("Role not found", 403));
    }

    let permissionToCheck = requiredPermission;

    // withdraw permission check
    if (permissionToCheck === "withdraw") {
      const walletName = req.query.wallet;
       console.log("walletName: ", walletName);

      if (walletName === "MASTER") {
        permissionToCheck = "masterWithdraw";
      } else if (walletName === "CLIENT") {
        permissionToCheck = "clientWithdraw";

        const { assetId, sourceAddress } = req.body;

        const walletDetails = await wallet.findOne({
          where: {
            assetId,
            address: sourceAddress,
          },
          attributes: ["userId"],
        });

        // if (req?.user?.userId === walletDetails?.userId) {
        //   next();
        // }
      } else {
        return next(new AppError("Invalid walletName provided", 400));
      }
    }

    // master and gas permission check
    if (permissionToCheck === "adminWallets") {
      const walletName = req.query.wallet;

      if (walletName === "MASTER") {
        permissionToCheck = "masterVaults";
      } else if (walletName === "GAS") {
        permissionToCheck = "gasStation";
      } else {
        return next(new AppError("Invalid walletName provided", 400));
      }
    }

    // Check permission
    if (!userRole.permissions?.includes(permissionToCheck)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }

    next();
  });
};

const restrictTo = (...userType) => {
  const checkPermission = (req, res, next) => {
    if (!userType.includes(req.user.userType)) {
      return next(
        new AppError("You don't have permission to perform this action", 403)
      );
    }
    return next();
  };

  return checkPermission;
};

const generateTwoFactorDetails = async (req, res, next) => {
  const userId = req?.body?.userId;
  const qrURI = await getAuthURIWithQR(userId);
  const body = {
    body: qrURI,
    message: "Sucessfully generated 2FA",
    success: true,
  };

  res.json(body);
};

const verifyTwoFactorOTP = async (req, res, next) => {
  const { otp, userId, tfaEnabled } = req.body;

  if (!tfaEnabled) {
    const transaction = await sequelize.transaction();
    let updatedUser;

    updatedUser = await user.update(
      { tfaEnabled: true },
      { where: { userId }, transaction }
    );

    if (!updatedUser) {
      await transaction.rollback();
      return next(new AppError("Failed to verify OTP", 500));
    }

    await transaction.commit();
  }

  const verified = await validateTwoFAOTP(otp, userId);
  if (!verified) {
    return next(new AppError("Invalid OTP", 400));
  }

  const response = {
    body: { verified, userId },
    message: "OTP Validated",
    success: true,
  };

  res.json(response);
};

const verifyEmail = async (req, res, next) => {
  const { email } = req.body;

  // Check if user exists
  const existingUser = await user.findOne({ where: { email } });

  if (!existingUser) {
    return next(new AppError("User not found", 400));
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiresAt = new Date(Date.now() + 1 * 60 * 1000); // Expires in 1 mins
  const isOTPVerified = false;

  // Save OTP to user table
  await existingUser.update({ otp, otpExpiresAt, isOTPVerified });

  // Send OTP via email
  await sendEmail(
    email,
    "Password Reset OTP",
    `
  <div style="max-width: 500px; margin: auto; padding: 20px; font-family: Arial, sans-serif; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9;">
    <div style="text-align: center; padding-bottom: 20px;">
      <h2 style="color: #333;">Password Reset Request</h2>
      <p style="color: #666;">Use the OTP below to reset your password. This OTP is valid for 1 minute.</p>
    </div>
    <div style="text-align: center; padding: 15px; background: #fff; border-radius: 8px; box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);">
      <h1 style="margin: 0; color: #2D89FF; font-size: 28px;">${otp}</h1>
    </div>
    <p style="text-align: center; margin-top: 15px; color: #666;">If you didn’t request this, you can ignore this email.</p>
  </div>
  `
  );

  const response = {
    success: true,
    message: "OTP sent to email",
    desc: `OTP sent to ${existingUser?.firstname} ${existingUser?.lastname}`,
    body: { email },
  };

  res.json(response);
};

const verifyOTP = async (req, res, next) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return next(new AppError("Invalid email or otp", 400));
  }

  // Check if user exists
  const existingUser = await user.findOne({ where: { email } });

  if (
    !existingUser ||
    !existingUser.otp ||
    existingUser.otpExpiresAt < new Date()
  ) {
    return next(new AppError("Invalid or expired OTP", 400));
  }

  if (existingUser.otp !== otp) {
    return next(new AppError("Incorrect OTP", 400));
  }

  await existingUser.update({ isOTPVerified: true });

  const response = {
    success: true,
    message: "OTP verified, proceed to reset password",
    desc: `OTP verified, proceed to reset password for ${existingUser?.firstname} ${existingUser?.lastname}`,
    body: { email },
  };

  res.json(response);
};

const resetPassword = async (req, res, next) => {
  const { email, newPassword } = req.body;

  // Check if user exists
  const existingUser = await user.findOne({ where: { email } });

  if (!existingUser) {
    return next(new AppError("User not found", 400));
  }

  if (!existingUser.isOTPVerified) {
    return next(new AppError("Please Verfiy email to reset password", 400));
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await existingUser.update({
    password: hashedPassword,
    otp: null,
    otpExpiresAt: null,
    isOTPVerified: false,
  });

  const response = {
    success: true,
    message: "Password changed successfully",
    desc: ` Password changed successfully for ${existingUser?.firstname} ${existingUser?.lastname} `,
    body: {
      email,
    },
  };

  res.json(response);
};

const switchProfile = async (req, res, next) => {
  const { switchingUserId } = req.body;

  if (!switchingUserId) {
    return next(new AppError("Please provide a user to switch to", 400));
  }

  // Fetch the target user
  const targetUser = await user.findOne({
    where: { userId: switchingUserId },
    include: [
      { model: role, attributes: ["name", "permissions"], as: "roleDetails" },
    ],
  });

  if (!targetUser) {
    return next(new AppError("Target user not found", 404));
  }

  // You can add logic here to restrict switching
  // Example: only allow switching between company and companyUser
  const allowedSwitch =
    (req.user.userType === "company" && targetUser.userType === "user") ||
    (req.user.userType === "user" && targetUser.userType === "company");

  if (!allowedSwitch) {
    return next(
      new AppError("You are not allowed to switch to this profile", 403)
    );
  }

  // Generate new token for the switched profile
  const token = generateToken({
    id: targetUser.id,
  });

  const { firstname, lastname, email, tfaEnabled, userId, userType } =
    targetUser;

  const resBody = {
    success: true,
    message: "Profile switched successfully",
    desc: `${firstname} ${lastname} profile switched successfully!`,
    body: {
      token,
      userId,
      firstname,
      lastname,
      email,
      tfaEnabled,
      roleDetails: targetUser.roleDetails,
      userType,
    },
  };

  return res.json(resBody);
};

module.exports = {
  signup,
  login,
  authentication,
  restrictTo,
  getUser,
  generateTwoFactorDetails,
  verifyTwoFactorOTP,
  verifyEmail,
  verifyOTP,
  resetPassword,
  checkRole,
  switchProfile,
};
