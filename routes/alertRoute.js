const {
  getAlert,
  addAlert,
  getAlertLatest,
  motorControl,
} = require("../controller/alertController");
const { authentication } = require("../controller/authController");
const {
  decryptRequestBody,
  encryptResponseBody,
} = require("../middleware/encryptDecrypt");

const router = require("express").Router();

router.use(decryptRequestBody);
router.use(encryptResponseBody);
router.route("/all").get(authentication, getAlert);
router.route("/latest").get(authentication, getAlertLatest);
router.route("/add").post(authentication, addAlert);
router.route("/switch").post(authentication, motorControl);

module.exports = router;
