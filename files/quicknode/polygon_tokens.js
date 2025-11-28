const Big = require("big.js");
const Web3 = require("web3");
const {
  QUICKNODE_URL,
  TEST_COINS,
  CONTRACT_ADDRESS,
  TOKEN_ABI,
  GAS_WALLET_ID,
} = require("../crypto/cryptoConstants");
const {
  extractAddressAndValueandOther,
  createTransactionOrUpdate,
  findAssetByContractAddress,
} = require("../helper");
const adminWallet = require("../../db/models/adminWallet");
const sequelize = require("../../config/database");
const transaction = require("../../db/models/transaction");
const wallet = require("../../db/models/wallet");
const user = require("../../db/models/user");
const { Op } = require("sequelize");

const POLYGON_TOKEN_WEBHOOK = async (req, res, next) => {
  try {
    const webhookDataArray = req?.body?.receipts;
    for (const webhookData of webhookDataArray) {
      const sequelizeTrx = await sequelize.transaction();
      try {
        if (!webhookData || !webhookData.to) {
          continue;
        }

        const web3 = new Web3(
          new Web3.providers.HttpProvider(QUICKNODE_URL.USDC_POLYGON)
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

        const coin1 = TEST_COINS.USDC_POLYGON;
        const coin2 = TEST_COINS.USDT_POLYGON;
        const coin3 = TEST_COINS.USDC_e_POLYGON;
        const contractAddress = to.toLowerCase();
        const assetId = findAssetByContractAddress(contractAddress, [
          coin1,
          coin2,
          coin3,
        ]);

        if (!assetId || !CONTRACT_ADDRESS[assetId]) continue;

        const fromAddress = from.toLowerCase();
        const status = webhookStatus === "0x1" ? "COMPLETED" : "FAILED";
        const blockNumberInt = parseInt(blockNumber, 16);

        const transactionDetails = await web3.eth.getTransaction(
          transactionHash
        );

        const {
          address: toAddress,
          value: extractedValue,
          note,
        } = extractAddressAndValueandOther(transactionDetails.input);

        const transactionId = await web3.utils.hexToAscii(note);

        const tokenContract = new web3.eth.Contract(
          TOKEN_ABI,
          CONTRACT_ADDRESS[assetId]
        );

        const decimals = await tokenContract.methods.decimals().call();

        let valueInEth = Number(extractedValue) / Math.pow(10, decimals);

        valueInEth = parseFloat(valueInEth) || 0;

        const isFromAddress_GAS_wallet = await adminWallet.findOne({
          where: { vaultId: GAS_WALLET_ID, address: fromAddress },
        });

        if (isFromAddress_GAS_wallet) {
          continue;
        }

        const where = [];

        if (transactionId) where.push({ transactionId });
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
              amount: valueInEth,
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

      // await webhookRawData(webhookData);
    }
  } catch (error) {
    console.log("Error_parsing_JSON:", error.message);
  }

  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Webhook received");
};

module.exports = { POLYGON_TOKEN_WEBHOOK };
