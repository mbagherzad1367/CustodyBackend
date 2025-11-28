// const { authentication } = require("../controller/authController");

const catchAsync = require("../utils/catchAsync");
const { ethWebhook } = require("../files/quicknode/eth");
const { btcWebhook } = require("../files/quicknode/btc");
const { TRON_Webhook } = require("../files/quicknode/tron");
const { ETH_TOKEN_WEBHOOK } = require("../files/quicknode/eth_tokens");
const { POLYGON_TOKEN_WEBHOOK } = require("../files/quicknode/polygon_tokens");
const { BSC_TOKEN_WEBHOOK } = require("../files/quicknode/bsc_tokens");
const { testwebhook } = require("../files/quicknode/test");

const router = require("express").Router();

// router.route("/eth").post(ethWebhook);
router.route("/eth").post(ethWebhook);
// router.route("/eth_token").post(ETH_TOKEN_WEBHOOK);
router.route("/btc").post(btcWebhook);
router.route("/polygon_token").post(POLYGON_TOKEN_WEBHOOK);
router.route("/bnb_token").post(BSC_TOKEN_WEBHOOK);
router.route("/tron").post(TRON_Webhook);

module.exports = router;
