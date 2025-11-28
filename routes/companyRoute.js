const { authentication, checkRole } = require("../controller/authController");
const {
  allCompanies,
  addCompany,
  editCompany,
  deleteCompany,
  companyUsersById,
} = require("../controller/companyController");
const {
  getAllPermissions,
  addRole,
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
  .route("/all")
  .get(authentication, checkRole("companies"), catchAsync(allCompanies));

router
  .route("/details/:id")
  .get(authentication, checkRole("companies"), catchAsync(companyUsersById));

router
  .route("/addCompany")
  .post(authentication, checkRole("createCompany"), catchAsync(addCompany));

router
  .route("/editCompany")
  .put(authentication, checkRole("editCompany"), catchAsync(editCompany));

router
  .route("/deleteCompany")
  .delete(
    authentication,
    checkRole("deleteCompany"),
    catchAsync(deleteCompany)
  );

module.exports = router;
