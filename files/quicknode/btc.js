const Big = require("big.js");

const satoshisToBTC = (satoshis) => satoshis / 100000000;
const { v4: uuidv4 } = require("uuid");
const {
  TEST_COINS,
  STATUS,
  GAS_WALLET_ID,
} = require("../crypto/cryptoConstants");
const sequelize = require("../../config/database");
const adminWallet = require("../../db/models/adminWallet");
const transaction = require("../../db/models/transaction");
const { Op } = require("sequelize");
const wallet = require("../../db/models/wallet");
const { createTransactionOrUpdate } = require("../helper");

const btcWebhook = async (req, res, next) => {
  try {
    const webhookDataArray = req?.body?.transactions;

    for (const webhookData of webhookDataArray) {
      const sequelizeTrx = await sequelize.transaction();
      const assetId = TEST_COINS.BTC;
      try {
        if (!webhookData) {
          continue;
        }

        const transactionHash = webhookData.txid;
        const status = transactionHash ? STATUS.COMPLETED : STATUS.FAILED;
        const feesBTC = satoshisToBTC(parseInt(webhookData.fees));
        const confirmations = webhookData.confirmations;
        let valueBTC;
        let toAddress;
        let fromAddress;

        webhookData.vin.forEach((vin) => {
          if (vin.isAddress) {
            const address = vin.addresses[0];

            fromAddress = address;
          }
        });
        webhookData.vout.forEach((vout) => {
          if (vout.isAddress) {
            const address = vout.addresses[0];

            if (address !== fromAddress) {
              valueBTC = satoshisToBTC(parseInt(vout.value));
              toAddress = address;
            }
          }
        });
        if (!transactionHash) {
          return res.status(400).send("txid is missing in webhook data");
        }

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
              amount: valueBTC,
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
        await sequelizeTrx.rollback();
      }
    }
  } catch (error) {
    //
  }

  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Webhook received");

  // await webhookRawData(webhookData);
};

module.exports = { btcWebhook };
