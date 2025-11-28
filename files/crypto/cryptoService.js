const bip39 = require("bip39");
const bitcoin = require("bitcoinjs-lib");
const BIP32Factory = require("bip32").default;
const ecc = require("tiny-secp256k1");
const TronWeb = require("tronweb");
var Web3 = require("web3");
const { ethers } = require("ethers");
const {
  ETH_PATH,
  BTC_PATH,
  TEST_COINS,
  QUICKNODE_URL,
  BTC_NETWORK,
  TRON_FULL_HOST,
  STATUS,
} = require("./cryptoConstants");
const { v4: uuidv4 } = require("uuid");
const {
  createETHWithdraw,
  createBTCWithdraw,
  createUSDTTRONWithdraw,
  createUSDCTRONWithdraw,
  createTokenWithdraw,
} = require("./withdrawls");
const { setNotificationAlertForStatus } = require("../quicknode/stream");

async function createTransaction(data) {
  const {
    assetId,
    sourceAddress,
    targetAddress,
    amount,
    privateKey,
    transactionId,
  } = data;

  let txHash, errorMessage;
  console.log(assetId, sourceAddress, targetAddress, amount, privateKey, transactionId)
  try {
    let result;

    switch (assetId) {
      case TEST_COINS.ETH:
        result = await createETHWithdraw(
          assetId,
          sourceAddress,
          targetAddress,
          amount,
          privateKey,
          QUICKNODE_URL.ETH,
          transactionId
        );
        break;
      case TEST_COINS.BTC:
        result = await createBTCWithdraw(
          assetId,
          sourceAddress,
          targetAddress,
          amount,
          privateKey,
          QUICKNODE_URL.BTC,
          transactionId
        );
        break;
      case TEST_COINS.USDC_ERC20:
      case TEST_COINS.USDT_ERC20:
      case TEST_COINS.USDC_BSC:
      case TEST_COINS.USDT_BSC:
      case TEST_COINS.USDC_POLYGON:
      case TEST_COINS.USDC_e_POLYGON:
      case TEST_COINS.USDT_POLYGON:
        result = await createTokenWithdraw(
          assetId,
          sourceAddress,
          targetAddress,
          amount,
          privateKey,
          undefined,
          transactionId
        );
        break;

      case TEST_COINS.USDC_TRC20:
        result = await createUSDCTRONWithdraw(
          assetId,
          sourceAddress,
          targetAddress,
          amount,
          privateKey
        );
        break;
      case TEST_COINS.USDT_TRC20:
        result = await createUSDTTRONWithdraw(
          assetId,
          sourceAddress,
          targetAddress,
          amount,
          privateKey
        );
        break;
      default:
        throw new Error("Unsupported asset type");
    }

    if (result.success === false) {
      throw new Error(result.error);
    } else {
      txHash = result.txHash;
    }

    return {
      txHash: txHash || null,
      id: transactionId,
      status: txHash ? STATUS.SUBMITTED : STATUS.FAILED,
      subStatus: txHash ? STATUS.SUBMITTED : errorMessage || STATUS.FAILED,
      targetAddress,
      assetId,
    };
  } catch (error) {
    console.log("error: ", error);
    errorMessage = error.message;

    return {
      id: transactionId,
      status: STATUS.FAILED,
      subStatus: errorMessage,
      targetAddress,
      assetId,
    };
  }
}

async function createAssetWithMnemonic(mnemonic, assetId, path = 0) {
  try {
    let assetAddress,
      privateKey,
      publicKey,
      status = false;

    // BITCOIN
    if (assetId === TEST_COINS.BTC) {
      const seed = await bip39.mnemonicToSeed(mnemonic);
      const bip32 = BIP32Factory(ecc);
      const root = bip32.fromSeed(seed, BTC_NETWORK);

      const child = root.derivePath(`m/44'/0'/0'/0/${path}`);
      const { address } = bitcoin.payments.p2wpkh({
        pubkey: child.publicKey,
        network: BTC_NETWORK,
      });

      assetAddress = address;
      privateKey = child.privateKey.toString("hex");
      publicKey = child.publicKey.toString("hex");

      status = await setNotificationAlertForStatus(assetId, assetAddress);
    }

    const masterNode = ethers.utils.HDNode.fromMnemonic(mnemonic);
    const wallet = masterNode.derivePath(`m/44'/60'/0'/0/${path}`);
    publicKey = wallet.publicKey;

    // ETHEREUM  // USDT_TRC20   // USDC_TRC20
    if (
      assetId === TEST_COINS.ETH ||
      assetId === TEST_COINS.USDC_ERC20 ||
      assetId === TEST_COINS.USDT_ERC20
    ) {
      assetAddress = wallet.address.toLowerCase();
      privateKey = wallet.privateKey;

      status = await setNotificationAlertForStatus(assetId, assetAddress);
    }

    // USDC_TRC20   // USDT_TRC20
    if (
      assetId === TEST_COINS.USDC_TRC20 ||
      assetId === TEST_COINS.USDT_TRC20
    ) {
      const HttpProvider = TronWeb.providers.HttpProvider;
      const fullNode = new HttpProvider(TRON_FULL_HOST);
      const solidityNode = new HttpProvider(TRON_FULL_HOST);
      const eventServer = new HttpProvider(TRON_FULL_HOST);
      const tronWeb = new TronWeb(fullNode, solidityNode, eventServer);
      const trxResult = tronWeb.fromMnemonic(
        mnemonic,
        `m/44'/195'/0'/0/${path}`
      );

      let slicedPrivateKey = "";
      if (trxResult.privateKey.startsWith("0x")) {
        slicedPrivateKey = trxResult.privateKey.slice(2);
      }

      privateKey = slicedPrivateKey;
      publicKey = trxResult.publicKey;
      assetAddress = trxResult.address;
      status = await setNotificationAlertForStatus(assetId, assetAddress);
    }

    // USDC_BSC // USDT_BSC
    if (assetId === TEST_COINS.USDC_BSC || assetId === TEST_COINS.USDT_BSC) {
      const web3_bsc = new Web3("https://bsc-dataseed1.binance.org:443");
      var bscWallet = web3_bsc.eth.accounts.privateKeyToAccount(
        wallet.privateKey
      );
      privateKey = bscWallet.privateKey;
      assetAddress = bscWallet.address.toLowerCase();
      status = await setNotificationAlertForStatus(assetId, assetAddress);
    }

    // USDC_POLYGON // USDT_POLYGON || USDC_e_POLYGON
    if (
      assetId === TEST_COINS.USDC_POLYGON ||
      assetId === TEST_COINS.USDT_POLYGON ||
      assetId === TEST_COINS.USDC_e_POLYGON
    ) {
      const web3_polygon = new Web3("https://polygon-rpc.com");
      var polygonWallet = web3_polygon.eth.accounts.privateKeyToAccount(
        wallet.privateKey
      );
      privateKey = polygonWallet.privateKey;
      assetAddress = polygonWallet.address.toLowerCase();
      status = await setNotificationAlertForStatus(assetId, assetAddress);
    }

    return {
      address: assetAddress,
      mnemonic,
      privateKey,
      publicKey,
      status,
    };
  } catch (error) {
    console.log("QUICKNODE_ERROR ", error);
    //
  }
}

module.exports = {
  createAssetWithMnemonic,
  createTransaction,
};
