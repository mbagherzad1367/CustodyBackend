const express = require("express");
const authRoute = require("./authRoute");
const walletRoute = require("./walletRoute");
const webhookRoute = require("./webhookRoute");
const snapRoute = require("./snapshotRoute");
const roleRoute = require("./roleRoute");
const companyRoute = require("./companyRoute");

const router = express.Router();

router.use("/auth", authRoute);
router.use("/wallet", walletRoute);
router.use("/webhook", webhookRoute);
router.use("/snapshot", snapRoute);
router.use("/role", roleRoute);
router.use("/company", companyRoute);
// router.use('/users', userRouter);

module.exports = router;
