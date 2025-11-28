const { authentication, checkRole } = require("../controller/authController");
const {
  getAllPermissions,
  addRole,
  getAllRoles,
  updatePermission,
  deleteRole,
} = require("../controller/roleController");
const {
  decryptRequestBody,
  encryptResponseBody,
} = require("../middleware/encryptDecrypt");
const catchAsync = require("../utils/catchAsync");

const router = require("express").Router();

router.use(decryptRequestBody);
router.use(encryptResponseBody);
router
  .route("/permissons")
  .get(authentication, checkRole("access"), catchAsync(getAllPermissions));
router
  .route("/addRole")
  .post(authentication, checkRole("createRole"), catchAsync(addRole));
router
  .route("/all")
  .get(authentication, checkRole("access"), catchAsync(getAllRoles));
router
  .route("/update")
  .put(
    authentication,
    checkRole("rolePermission"),
    catchAsync(updatePermission)
  );
router
  .route("/deleteRole")
  .delete(authentication, checkRole("deleteRole"), catchAsync(deleteRole));

module.exports = router;
