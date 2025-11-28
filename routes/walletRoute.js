// const { authentication } = require("../controller/authController");

const { enc } = require("crypto-js");
const { authentication, checkRole } = require("../controller/authController");
const {
  createClientWallet,
  createAdminWallet,
  clientWallets,
  adminWallets,
  createWithdraw,
  fetchPaginatedWhiteListedAddress,
  createWhiteListedAddress,
  fetchWhiteListedAddress,
  allTransactions,
  deleteWhiteListedAddress,
  allAssets,
  allUsers,
  editUser,
  addUser,
  deleteUser,
  resetUser2FA,
  allClients,
  editClient,
  deleteClient,
  deleteClientAsset,
  notifyClientTrx,
  notifyMasterTrx,
  allClientsWithBalance,
  allLogs,
  allClientsVaultIds,
  archiveVault,
  archiveAsset,
} = require("../controller/walletController");
const catchAsync = require("../utils/catchAsync");
const {
  decryptRequestBody,
  encryptResponseBody,
} = require("../middleware/encryptDecrypt");

const router = require("express").Router();

router.use(decryptRequestBody);
router.use(encryptResponseBody);
router
  .route("/client")
  .post(
    authentication,
    checkRole("createClientWallet"),
    catchAsync(createClientWallet)
  );

router
  .route("/admin")
  .post(
    authentication,
    checkRole("createMasterWallet"),
    catchAsync(createAdminWallet)
  );
router
  .route("/admin/emailnotify/:id")
  .put(authentication, checkRole("notifyMaster"), catchAsync(notifyMasterTrx));

router
  .route("/whitelist")
  .post(
    authentication,
    checkRole("createWhitelist"),
    catchAsync(createWhiteListedAddress)
  );

router
  .route("/whitelist")
  .delete(
    authentication,
    checkRole("deleteWhitelist"),
    catchAsync(deleteWhiteListedAddress)
  );

router
  .route("/whitelist/paginated")
  .get(
    authentication,
    checkRole("whitelistedAddress"),
    catchAsync(fetchPaginatedWhiteListedAddress)
  );

router
  .route("/whitelist")
  .get(authentication, catchAsync(fetchWhiteListedAddress));

router.route("/client").get(authentication, catchAsync(clientWallets));

router
  .route("/client/all")
  .get(authentication, checkRole("clientVaults"), catchAsync(allClients));

router
  .route("/client/vaultIds")
  .get(
    authentication,
    checkRole("clientVaults"),
    catchAsync(allClientsVaultIds)
  );

router
  .route("/client/:id")
  .put(authentication, checkRole("editClientWallet"), catchAsync(editClient));

router
  .route("/client/emailnotify/:id")
  .put(authentication, checkRole("notifyClient"), catchAsync(notifyClientTrx));

router
  .route("/client/:id")
  .delete(
    authentication,
    checkRole("deleteClientWallet"),
    catchAsync(deleteClient)
  );

router
  .route("/clientAsset")
  .delete(
    authentication,
    checkRole("deleteClientAsset"),
    catchAsync(deleteClientAsset)
  );

router
  .route("/admin")
  .get(authentication, checkRole("adminWallets"), catchAsync(adminWallets));

router
  .route("/withdraw")
  .post(authentication, checkRole("withdraw"), catchAsync(createWithdraw));

router
  .route("/reports")
  .get(authentication, checkRole("reports"), catchAsync(allTransactions));

router.route("/assets").get(catchAsync(allAssets));
router
  .route("/users")
  .get(authentication, checkRole("users"), catchAsync(allUsers));

router
  .route("/logs")
  .get(authentication, checkRole("logs"), catchAsync(allLogs));

router
  .route("/editUser")
  .put(authentication, checkRole("editUser"), catchAsync(editUser));
router
  .route("/addUser")
  .post(authentication, checkRole("createUser"), catchAsync(addUser));
router
  .route("/deleteUser")
  .delete(authentication, checkRole("deleteUser"), catchAsync(deleteUser));

router
  .route("/2FAReset")
  .put(authentication, checkRole("2faReset"), catchAsync(resetUser2FA));

router
  .route("/client/all/balance")
  .get(authentication, catchAsync(allClientsWithBalance));

router
  .route("/client/archiveVault/:id")
  .put(authentication, checkRole("archiveVault"), catchAsync(archiveVault));

router
  .route("/client/archiveAsset/:id")
  .put(authentication, checkRole("archiveAsset"), catchAsync(archiveAsset));

module.exports = router;
