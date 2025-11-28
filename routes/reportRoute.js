const { authentication } = require("../controller/authController");
const { getReports, addReports } = require("../controller/reportController");
const {
  decryptRequestBody,
  encryptResponseBody,
} = require("../middleware/encryptDecrypt");

const router = require("express").Router();

router.use(decryptRequestBody);
router.use(encryptResponseBody);
router.route("/all").get(authentication, getReports);
router.route("/add").post(authentication, addReports);

module.exports = router;
