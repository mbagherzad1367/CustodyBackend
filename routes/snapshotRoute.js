const { authentication, checkRole } = require("../controller/authController");
const { snapshotApi, allsnapShots } = require("../controller/snapController");
const {
  decryptRequestBody,
  encryptResponseBody,
} = require("../middleware/encryptDecrypt");
const catchAsync = require("../utils/catchAsync");

const router = require("express").Router();

router.route("/take").get(catchAsync(snapshotApi));
router.use(decryptRequestBody);
router.use(encryptResponseBody);
router
  .route("/")
  .get(authentication, checkRole("snapshot"), catchAsync(allsnapShots));

module.exports = router;
