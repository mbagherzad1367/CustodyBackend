const {
  signup,
  login,
  getUser,
  authentication,
  generateTwoFactorDetails,
  verifyTwoFactorOTP,
  verifyEmail,
  verifyOTP,
  resetPassword,
  switchProfile,
} = require("../controller/authController");
const {
  decryptRequestBody,
  encryptResponseBody,
} = require("../middleware/encryptDecrypt");
const catchAsync = require("../utils/catchAsync");

const router = require("express").Router();

router.use(decryptRequestBody);
router.use(encryptResponseBody);
router.route("/signup").post(catchAsync(signup));
router.route("/login").post(catchAsync(login));
router.route("/getUser").get(authentication, getUser);
router.route("/verifyEmail").post(verifyEmail);
router.route("/verifyOTP").post(verifyOTP);
router.route("/reset_password").post(resetPassword);
router
  .route("/two-factor-authenticator")
  .post(catchAsync(generateTwoFactorDetails));

router.route("/verify-two-factor-otp").post(catchAsync(verifyTwoFactorOTP));
router.route("/switch").post(authentication, catchAsync(switchProfile));

module.exports = router;
