const Web3 = require("web3");
const {
  TEST_COINS,
  QUICKNODE_URL,
  GAS_WALLET_ID,
} = require("../crypto/cryptoConstants");
const sequelize = require("../../config/database");
const {
  findAssetByContractAddress,
  createTransactionOrUpdate,
} = require("../helper");
const { Op } = require("sequelize");
const transaction = require("../../db/models/transaction");
const wallet = require("../../db/models/wallet");
const adminWallet = require("../../db/models/adminWallet");
const { fromHex } = require("tron-format-address");
const TRON_Webhook = async (req, res, next) => {
  try {
    const webhookDataArray = req?.body?.receipts;
    for (const webhookData of webhookDataArray) {
      const sequelizeTrx = await sequelize.transaction();
      try {
        if (!webhookData) {
          continue;
        }

        const web3 = new Web3(
          new Web3.providers.HttpProvider(QUICKNODE_URL.USDC_ERC20)
        );

        const {
          transactionHash,
          blockNumber,
          gasUsed,
          effectiveGasPrice,
          from,
          to,
          status: webhookStatus,
        } = webhookData;

        const coin1 = TEST_COINS.USDC_TRC20;
        const coin2 = TEST_COINS.USDT_TRC20;
        const hexContract = fromHex(to);
        const assetId = findAssetByContractAddress(hexContract, [coin1, coin2]);

        const fromAddress = fromHex(from);

        const status = webhookStatus === "0x1" ? "COMPLETED" : "FAILED";
        const blockNumberInt = parseInt(blockNumber, 16);

        // LOG CHECK
        const log = webhookData.logs[0];
        const amount = log.data;
        const lastTopic = log.topics[log.topics.length - 1];

        const hexAddress = lastTopic.replace(
          "0x000000000000000000000000",
          "0x"
        );
        console.log("hexAddress: ", hexAddress);
        const toAddress = fromHex(hexAddress);
        console.log("toAddress: ", toAddress);

        const amountInWei = web3.utils.hexToNumberString(amount);
        const amountInUSDC = web3.utils.fromWei(amountInWei, "mwei");

        const isFromAddress_GAS_wallet = await adminWallet.findOne({
          where: { vaultId: GAS_WALLET_ID, address: fromAddress },
        });

        if (isFromAddress_GAS_wallet) {
          continue;
        }

        const where = [];

        if (transactionHash) where.push({ txHash: transactionHash });

        const existingOutgoingTrx = await transaction.findOne({
          where: {
            [Op.or]: where,
          },
        });

        let incomingClientTrx, incomingAdminTrx;
        incomingClientTrx = await wallet.findOne({
          where: { address: toAddress, assetId },
        });

        if (!incomingClientTrx) {
          incomingAdminTrx = await adminWallet.findOne({
            where: { address: toAddress, assetId },
          });
        }

        if (incomingClientTrx || incomingAdminTrx || existingOutgoingTrx) {
          await createTransactionOrUpdate(
            {
              assetId,
              amount: amountInUSDC,
              txHash: transactionHash,
              sourceAddress: fromAddress,
              targetAddress: toAddress,
              status,
            },
            incomingClientTrx,
            incomingAdminTrx,
            existingOutgoingTrx,
            sequelizeTrx
          );
        }

        await sequelizeTrx.commit();
      } catch (error) {
        console.log("Error_parsing_JSON:", error.message);
        await sequelizeTrx.rollback();
      }
    }
  } catch (error) {
    console.log("Error_parsing_JSON:", error.message);
  }

  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Webhook received");
};

module.exports = { TRON_Webhook };
