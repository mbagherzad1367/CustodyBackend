const { Op } = require("sequelize");
const Web3 = require("web3");

const { v4: uuidv4 } = require("uuid");
const Big = require("big.js");
const sequelize = require("../../config/database");
const {
  TEST_COINS,
  QUICKNODE_URL,
  GAS_WALLET_ID,
  CONTRACT_ADDRESS,
  TOKEN_ABI,
} = require("../crypto/cryptoConstants");
const {
  createTransactionOrUpdate,
  findAssetByContractAddress,
  extractAddressAndValueandOther,
} = require("../helper");
const wallet = require("../../db/models/wallet");
const adminWallet = require("../../db/models/adminWallet");
const transaction = require("../../db/models/transaction");

const ethWebhook = async (req, res, next) => {
  try {
    const webhookDataArray = req?.body?.transactions?.length
      ? req?.body?.transactions
      : req?.body?.receipts;

    for (const webhookData of webhookDataArray) {
      const sequelizeTrx = await sequelize.transaction();
      try {
        if (!webhookData || !webhookData.to) {
          continue;
        }

        // Validate webhook data
        if (!webhookData || !webhookData.to) {
          return res.status(400).send("Invalid webhook data");
        }

        const web3 = new Web3(
          new Web3.providers.HttpProvider(QUICKNODE_URL.ETH)
        );

        const { from, to } = webhookData;

        const hash = webhookData?.hash
          ? webhookData?.hash
          : webhookData?.transactionHash;

        const fromAddress = from.toLowerCase();
        const status = hash ? "COMPLETED" : "FAILED";

        const contractAddresses = Object.values(CONTRACT_ADDRESS);

        let isItContrctAddress = contractAddresses.includes(to.toLowerCase());

        const transactionByHash = await web3.eth.getTransaction(hash);

        if (!transactionByHash) {
          return res
            .status(404)
            .send(`Trx with hash ${hash} not found on Ethereum`);
        }

        let assetId,
          toAddress,
          transactionId = "";
        let valueInEth = 0;

        if (isItContrctAddress) {
          const coin1 = TEST_COINS.USDC_ERC20;
          const coin2 = TEST_COINS.USDT_ERC20;
          const contractAddress = to.toLowerCase();

          assetId = findAssetByContractAddress(contractAddress, [coin1, coin2]);

          const {
            address: token_toAddress,
            value: extractedValue,
            note,
          } = extractAddressAndValueandOther(transactionByHash.input);

          transactionId = await web3.utils.hexToAscii(note);

          const tokenContract = new web3.eth.Contract(
            TOKEN_ABI,
            CONTRACT_ADDRESS[assetId]
          );

          const decimals = await tokenContract.methods.decimals().call();

          valueInEth = Number(extractedValue) / Math.pow(10, decimals);

          valueInEth = parseFloat(valueInEth) || 0;

          toAddress = token_toAddress;
        } else {
          assetId = TEST_COINS.ETH;

          valueInEth = parseFloat(
            web3.utils.fromWei(transactionByHash.value, "ether")
          );
          toAddress = to.toLowerCase();

          transactionId = web3.utils.hexToAscii(transactionByHash.input);
        }

        const isFromAddress_GAS_wallet = await adminWallet.findOne({
          where: { vaultId: GAS_WALLET_ID, address: fromAddress },
        });

        if (isFromAddress_GAS_wallet) {
          continue;
        }

        const where = [];

        if (transactionId) where.push({ transactionId });
        if (hash) where.push({ txHash: hash });

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
              txHash: hash,
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
};

module.exports = { ethWebhook };
