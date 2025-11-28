globalThis.crypto = require("crypto").webcrypto;
const { ethers } = require("ethers");
const bitcoin = require("bitcoinjs-lib");
const bip39 = require("bip39");
const BIP32Factory = require("bip32").default;
const ECPairFactory = require("ecpair").default;
const ecc = require("tiny-secp256k1");
const ECPair = ECPairFactory(ecc);
const axios = require("axios");

const Web3 = require("web3");
const TronWeb = require("tronweb");
const {
  CONTRACT_ADDRESS,
  TOKEN_ABI,
  TOKEN_DECIMALS,
  TEST_COINS,
  QUICKNODE_URL,
  TRON_FULL_HOST,
  BTC_NETWORK,
  GAS_LIMITS,
  is_TESTNET,
  GAS_WALLET_ID,
} = require("./cryptoConstants");
const { getAssetBalance, getGasBalance } = require("./balance");
const adminWallet = require("../../db/models/adminWallet");
// const kms = require("../../db/models/kms");
const key1 = require("../../db/models/key1");
// const AWS = require("aws-sdk");
// const hsm = require("../../db/models/hsm");
// AWS.config.update({
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   region: process.env.AWS_REGION,
// });
const { combine } = require("shamirs-secret-sharing");
const key2 = require("../../db/models-db2/key2");
const key3 = require("../../db/models-db3/key3");

const { decryptWithGCPKMS, KMS_KEYS } = require("../kms");

// const kms_config = new AWS.KMS();`

const TO_WEI = (value, decimals = 18) => {
  return Web3.utils
    .toBN(Web3.utils.toWei(value.toString(), "ether"))
    .div(Web3.utils.toBN(10).pow(Web3.utils.toBN(18 - decimals)));
};

async function web3Init(assetId) {
  try {
    const web3 = new Web3(
      new Web3.providers.HttpProvider(QUICKNODE_URL[assetId])
    );

    return web3;
  } catch (error) {
    throw new Error(error.message);
  }
}

async function getGasFromApi(assetId) {
  let url, defaultValue, mainnetValue;
  if (
    assetId === "ETH" ||
    assetId === "USDC_ERC20" ||
    assetId === "USDT_ERC20"
  ) {
    const apikey = process.env.ETHERSCAN_API_KEY;
    url = `https://api.etherscan.io/v2/api?chainid=1&module=gastracker&action=gasoracle&apikey=${apikey}`;
    defaultValue = "40";
    mainnetValue = "1";
  } else if (assetId === "USDC_BSC" || assetId === "USDT_BSC") {
    const apikey = process.env.ETHERSCAN_API_KEY;
    url = `https://api.etherscan.io/v2/api?chainid=56&module=gastracker&action=gasoracle&apikey=${apikey}`;
    defaultValue = "30";
    mainnetValue = "0.05";
  } else if (
    assetId === "USDT_POLYGON" ||
    assetId === "USDC_POLYGON" ||
    assetId === "USDC_e_POLYGON"
  ) {
    const apikey = process.env.ETHERSCAN_API_KEY;
    url = `https://api.etherscan.io/v2/api?chainid=137&module=gastracker&action=gasoracle&apikey=${apikey}`;
    defaultValue = "30";
    mainnetValue = "80";
  }

  const res = await fetch(url);
  const data = await res.json();

  return is_TESTNET
    ? defaultValue
    : data?.result?.FastGasPrice
    ? data?.result?.FastGasPrice
    : mainnetValue;
}

async function getSpeedGasFromApi(assetId) {
  let url, defaultValue, mainnetValue;
  if (
    assetId === "ETH" ||
    assetId === "USDC_ERC20" ||
    assetId === "USDT_ERC20"
  ) {
    const apikey = process.env.ETHERSCAN_API_KEY;
    url = `https://api.etherscan.io/v2/api?chainid=1&module=gastracker&action=gasoracle&apikey=${apikey}`;
    defaultValue = "40";
    mainnetValue = "1";
  } else if (assetId === "USDC_BSC" || assetId === "USDT_BSC") {
    const apikey = process.env.ETHERSCAN_API_KEY;
    url = `https://api.etherscan.io/v2/api?chainid=56&module=gastracker&action=gasoracle&apikey=${apikey}`;
    defaultValue = "40";
    mainnetValue = "0.05";
  } else if (
    assetId === "USDT_POLYGON" ||
    assetId === "USDC_POLYGON" ||
    assetId === "USDC_e_POLYGON"
  ) {
    const apikey = process.env.ETHERSCAN_API_KEY;
    url = `https://api.etherscan.io/v2/api?chainid=137&module=gastracker&action=gasoracle&apikey=${apikey}`;
    defaultValue = "30";
    mainnetValue = "80";
  }

  const res = await fetch(url);
  const data = await res.json();

  return is_TESTNET
    ? defaultValue
    : data?.result?.FastGasPrice
    ? data?.result?.FastGasPrice
    : mainnetValue;
}

async function SpeedUpTheTransaction(
  assetId,
  sourceAddress,
  receiverAddress,
  privateKey,
  hash
) {
  try {
    const web3 = await web3Init(assetId);

    const tx = await web3.eth.getTransaction(hash);

    const GasPriceGwei = await getSpeedGasFromApi(assetId);
    const gasPrice = web3.utils.toWei(GasPriceGwei, "gwei");
    const gasLimit =
      assetId === TEST_COINS.ETH ? GAS_LIMITS.ETH : GAS_LIMITS.ETH_TOKEN;

    const gasFee = web3.utils.toBN(gasPrice).mul(web3.utils.toBN(gasLimit));

    const sourceBalance = await web3.eth.getBalance(sourceAddress);

    if (web3.utils.toBN(sourceBalance).lt(gasFee)) {
      const gasWalletTrx = await ETH_GAS_STATION(
        assetId,
        sourceAddress,
        web3.utils.fromWei(gasFee, "ether"),
        QUICKNODE_URL[assetId]
      );

      if (!gasWalletTrx.success) {
        throw new Error(gasWalletTrx.error);
      }

      // Recheck the ETH balance
      const updatedEthBalance = await web3.eth.getBalance(sourceAddress);

      if (web3.utils.toBN(updatedEthBalance).lt(gasFee)) {
        throw new Error("INSUFFICIENT_FUNDS_AFTER_GAS_TRANSFER");
      }
    }

    let trx;
    if (assetId === "ETH") {
      trx = {
        from: sourceAddress,
        to: receiverAddress,
        value: tx.value,
        gas: GAS_LIMITS.ETH,
        gasPrice: gasPrice, // Higher gas price
        nonce: tx.nonce,
      };
    } else {
      const tokenContract = new web3.eth.Contract(
        TOKEN_ABI,
        CONTRACT_ADDRESS[assetId]
      );

      const dataWithoutSelector = tx.input.slice(10);

      const decimals = await tokenContract.methods.decimals().call();

      const amountHex = "0x" + dataWithoutSelector.slice(64, 128); // Next 64-byte block
      const amountInWei = web3.utils.toBN(amountHex);
      console.log("amountInWei: ", amountInWei.toString());

      const amountFormatted = amountInWei.div(
        web3.utils.toBN(10).pow(web3.utils.toBN(decimals))
      );
      console.log("amountFormatted: ", amountFormatted.toString());

      const transferFunction = tokenContract.methods
        .transfer(receiverAddress, amountFormatted)
        .encodeABI();

      trx = {
        from: sourceAddress,
        to: CONTRACT_ADDRESS[assetId],
        data: transferFunction,
        gas: GAS_LIMITS.ETH_TOKEN,
        nonce: tx.nonce,
        gasPrice: gasPrice,
      };
    }
    console.log("trx: ", trx);

    const signedTx = await web3.eth.accounts.signTransaction(trx, privateKey);

    web3.eth
      .sendSignedTransaction(signedTx.rawTransaction)
      .on("transactionHash", function (hash) {
        console.log(`SPEED TRX HASH:, ${hash}`);
        // You can store the hash or use it in further logic
      })
      .on("receipt", function (receipt) {
        console.log(`${assetId} SPEED TRX receipt:`, receipt);
        // Here you can handle the receipt, e.g., update the transaction status
      })
      .on("error", function (error) {
        // console.error(${assetId} TRX ERROR, error);
        // Log the error but don't return or throw it
        // You can handle errors later when checking the transaction status
      });

    return { success: true, txHash: signedTx.transactionHash };
  } catch (error) {
    return { success: true, error: error.message };
  }
}

async function getGasWalletDetails(assetId) {
  const gasWallet = await adminWallet.findOne({
    where: {
      vaultId: GAS_WALLET_ID,
      assetId: assetId,
    },
  });

  if (!gasWallet) {
    throw new Error("GAS WALLET NOT FOUND");
  }

  /*const vaultId = gasWallet.vaultId.toString();

  const STORED_CURRENCY = {
    BTC: "BTC",
    ETH: "ETH",
    USDC_ERC20: "ETH",
    USDT_ERC20: "ETH",
    USDC_BSC: "ETH",
    USDT_BSC: "ETH",
    USDC_TRC20: "TRON",
    USDT_TRC20: "TRON",
    USDT_POLYGON: "ETH",
    USDC_POLYGON: "ETH",
    USDC_e_POLYGON: "ETH",
  };

  const baseAsset = STORED_CURRENCY[assetId];

  // key1 from database
  const k1 = await key1.findOne({
    where: {
      walletId: vaultId,
      currency: baseAsset,
    },
  });

  const k2 = await key2.findOne({
    where: {
      walletId: vaultId,
      currency: baseAsset,
    },
  });

  const k3 = await key3.findOne({
    where: {
      walletId: vaultId,
      currency: baseAsset,
    },
  });

  const [dec1, dec2, dec3] = await Promise.all([
    decryptWithGCPKMS(k1.key, KMS_KEYS.key1),
    decryptWithGCPKMS(k2.key, KMS_KEYS.key2),
    decryptWithGCPKMS(k3.key, KMS_KEYS.key3),
  ]);

  let shares = [
    Buffer.from(dec1, "hex"),
    Buffer.from(dec2, "hex"),
    Buffer.from(dec3, "hex"),
  ];

  const secret = combine(shares).toString("hex");

  let combinedKey;
  if (baseAsset === "BTC" || baseAsset === "TRON") {
    combinedKey = secret;
  } else {
    combinedKey = "0x" + secret;
  }

  let privateKey = combinedKey;
*/
  return {
    privateKey: gasWallet.privateKey,
    address: gasWallet.address,
  };
}

// ETH WITHDRAW
async function createETHWithdraw(
  assetId,
  sourceAddress,
  receiverAddress,
  amount,
  privateKey,
  quicknode_url = QUICKNODE_URL.ETH,
  transactionId
) {
  try {
    const web3 = await web3Init(assetId);

    // Get the source address balance
    let balance = await web3.eth.getBalance(sourceAddress);

    // Convert the amount from ether to wei
    const amountInWei = web3.utils.toWei(amount.toString(), "ether");
    console.log("amountInWei: ", amountInWei.toString());

    // Get the gas price from the external API
    const GasPriceGwei = await getGasFromApi(assetId);
    console.log("GasPriceGwei: ", GasPriceGwei);
    const gasPrice = web3.utils.toWei(GasPriceGwei, "gwei");
    console.log("gasPrice: ", gasPrice);

    const gas_limit = GAS_LIMITS.ETH;
    const feeInWei = web3.utils.toBN(gas_limit).mul(web3.utils.toBN(gasPrice));
    console.log("feeInWei: ", feeInWei.toString());

    console.log("Source balance before gas ", balance.toString());

    if (web3.utils.toBN(balance).lt(amountInWei)) {
      throw new Error("INSUFFICIENT FUNDS IN SOURCE ADDRESS");
    }
    // Check if the user has enough balance for the gas fee
    if (
      web3.utils
        .toBN(balance)
        .lt(web3.utils.toBN(feeInWei).add(web3.utils.toBN(amountInWei)))
    ) {
      // console.log(
      //   "Source address does not have enough gas fee. Using gas wallet."
      // );

      // Fetch gas wallet details
      const gasWalletDetails = await getGasWalletDetails(assetId);

      // Check the gas wallet balance
      let gasWalletBalance = await web3.eth.getBalance(
        gasWalletDetails.address
      );

      if (web3.utils.toBN(gasWalletBalance).lt(feeInWei)) {
        throw new Error("INSUFFICIENT_FUNDS_IN_GAS_WALLET");
      }

      // Transfer gas fee from the gas wallet to the source address
      const nonce = await web3.eth.getTransactionCount(
        gasWalletDetails.address,
        "pending"
      );

      const transferTx = {
        from: gasWalletDetails.address,
        to: sourceAddress,
        value: feeInWei.toString(),
        gas: gas_limit,
        gasPrice: gasPrice,
        nonce: nonce,
      };

      const signedTransferTx = await web3.eth.accounts.signTransaction(
        transferTx,
        gasWalletDetails.privateKey
      );

      await web3.eth.sendSignedTransaction(signedTransferTx.rawTransaction);

      // Update the source address balance after the transfer
      let sourceBalance = await web3.eth.getBalance(sourceAddress);
      console.log("SOURCEBALANCE_after_gas: ", sourceBalance.toString());

      if (
        web3.utils
          .toBN(sourceBalance)
          .lt(web3.utils.toBN(feeInWei).add(web3.utils.toBN(amountInWei)))
      ) {
        throw new Error("INSUFFICIENT_FUNDS_AFTER_GAS_TRANSFER");
      }
    }

    // Check if the user has enough balance for the transaction amount
    // if (web3.utils.toBN(balance).lt(web3.utils.toBN(amountInWei))) {
    //   throw new Error("INSUFFICIENT_FUNDS");
    // }

    // Get the current nonce
    const nonce = await web3.eth.getTransactionCount(sourceAddress, "pending");
    console.log("nonce: ", nonce);

    // Prepare the transaction object
    const tx = {
      from: sourceAddress,
      to: receiverAddress,
      value: amountInWei,
      gas: gas_limit,
      gasPrice: web3.utils.toBN(gasPrice),
      nonce: nonce,
      // data: web3.utils.asciiToHex(transactionId),
    };

    const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);

    web3.eth
      .sendSignedTransaction(signedTx.rawTransaction)
      .on("transactionHash", function (hash) {
        console.log(`${assetId} TRX HASH:, ${hash}`);
        // You can store the hash or use it in further logic
      })
      .on("receipt", function (receipt) {
        console.log(`${assetId} TRX receipt:`, receipt);
        // Here you can handle the receipt, e.g., update the transaction status
      })
      .on("error", function (error) {
        // console.error(`${assetId} TRX ERROR`, error);
        // Log the error but don't return or throw it
        // You can handle errors later when checking the transaction status
      });

    // const receipt = await web3.eth.sendSignedTransaction(
    //   signedTx.rawTransaction
    // );

    return { success: true, txHash: signedTx?.transactionHash };
  } catch (error) {
    console.error("Error: ", error);
    return { success: false, error: error.message };
  }
}

//BTC WITHDRAW
async function createBTCWithdraw(
  assetId,
  sourceAddress,
  receiverAddress,
  amount,
  privateKey,
  qicknode_url,
  transactionId
) {
  try {
    if (!privateKey || privateKey.length !== 64) {
      throw new Error(
        "Invalid privateKey. Expected a 64-character hexadecimal string."
      );
    }

    const keyPair = ECPair.fromPrivateKey(Buffer.from(privateKey, "hex"), {
      network: BTC_NETWORK,
    });

    const privateKeyWIF = keyPair.toWIF();

    const transactionHex = await createTransaction(
      sourceAddress,
      privateKeyWIF,
      receiverAddress,
      amount
    );

    const result = await broadcastTransaction(transactionHex);

    return { success: true, txHash: result?.result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function broadcastTransaction(transactionHex) {
  const response = await fetch(QUICKNODE_URL.BTC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // httpsAgent: agent,
    body: JSON.stringify({
      method: "sendrawtransaction",
      params: [transactionHex],
    }),
  });

  const result = await response.json();
  return result;
}

async function getFeeRate(blocks) {
  try {
    const response = await axios.post(QUICKNODE_URL.BTC, {
      jsonrpc: "1.0",
      id: "curltest",
      method: "estimatesmartfee",
      params: [blocks], // Number of blocks to estimate fee for, e.g., 6 blocks
    });

    if (response.data.error) {
      console.error("Error:", response.data.error);
      return null;
    }

    const feeRate = response.data.result.feerate;
    console.log(`Estimated fee rate for ${blocks} blocks: ${feeRate} BTC/KB`);
    return feeRate;
  } catch (error) {
    // console.error("Error fetching fee rate:", error);
    return null;
  }
}

// Function to convert fee rate to satoshis per byte
async function getFeeRateInSatoshisPerByte(blocks) {
  const feeRateInBTCPerKB = await getFeeRate(blocks);
  if (feeRateInBTCPerKB === null) {
    return null;
  }

  const feeRateInSatoshisPerByte = Math.round((feeRateInBTCPerKB * 1e8) / 1000);

  return feeRateInSatoshisPerByte;
}

async function calculateFee(inputs, outputs) {
  const feeRate = (await getFeeRateInSatoshisPerByte(6)) || 70; // Increase fee rate to 20 satoshis per byte

  const txSize = inputs * 148 + outputs * 34 + 10; // approximate transaction size in bytes
  return txSize * feeRate;
}

async function createTransaction(
  senderAddress,
  privateKeyWIF,
  receiverAddress,
  amount
) {
  try {
    console.log("senderAddress: ", senderAddress);
    console.log("amount: ", amount);
    console.log("receiverAddress: ", receiverAddress);
    const utxourl = is_TESTNET
      ? `https://mempool.space/testnet/api/address/${senderAddress}/utxo`
      : `https://mempool.space/api/address/${senderAddress}/utxo`;

    const utxosResponse = await axios.get(utxourl);
    const utxos = utxosResponse.data;

    const satoshiToSend = Math.round(amount * 100000000);

    const keyPair = ECPair.fromWIF(privateKeyWIF, BTC_NETWORK);
    const psbt = new bitcoin.Psbt({ network: BTC_NETWORK });

    let totalAmountAvailable = 0;
    let inputCount = 0;
    let fee = 0;
    for (const utxo of utxos) {
      totalAmountAvailable += utxo.value;
      inputCount += 1;

      const txUrl = is_TESTNET
        ? `https://mempool.space/testnet/api/tx/${utxo.txid}/hex`
        : `https://mempool.space/api/tx/${utxo.txid}/hex`;

      const txData = await axios.get(txUrl);
      utxo.hex = txData.data;

      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        nonWitnessUtxo: Buffer.from(utxo.hex, "hex"),
      });

      fee = await calculateFee(inputCount, 2);

      console.log("satoshiToSend + fee: ", satoshiToSend + fee);
      if (totalAmountAvailable >= satoshiToSend + fee) break;
    }

    console.log("satoshiToSend: ", satoshiToSend);
    console.log("total_fee", fee);
    console.log("totalAmountAvailable: ", totalAmountAvailable);
    // if (totalAmountAvailable < satoshiToSend + fee) {
    //   throw new Error("INSUFFICIENT_FUNDS");
    // }

    const satoshiToSendAfterFee = satoshiToSend - fee;
    console.log("satoshiToSendAfterFee: ", satoshiToSendAfterFee);

    if (satoshiToSendAfterFee <= 0) {
      throw new Error("AMOUNT_TOO_LOW");
    }

    if (totalAmountAvailable < satoshiToSendAfterFee) {
      throw new Error("INSUFFICIENT_FUNDS");
    }

    console.log("satoshiToSend after fee deduction: ", satoshiToSendAfterFee);
    psbt.addOutput({ address: receiverAddress, value: satoshiToSendAfterFee });

    const changeAmount = totalAmountAvailable - satoshiToSend;

    console.log("changeAmount: ", changeAmount);

    if (changeAmount > 546) {
      // Include change only if it's above the dust threshold
      psbt.addOutput({ address: senderAddress, value: changeAmount });
    }

    psbt.signAllInputs(keyPair);
    psbt.finalizeAllInputs();
    const txRaw = psbt.extractTransaction();

    return txRaw.toHex();
  } catch (error) {
    throw new Error(error.message);
  }
}

// ETH GAS STATION
async function ETH_GAS_STATION(
  assetId,
  sourceAddress,
  amount,
  quicknode_url = QUICKNODE_URL.ETH
) {
  try {
    const gasWallet = await getGasWalletDetails(assetId);

    const { address: gas_address, privateKey } = gasWallet;

    const web3 = await web3Init(assetId);

    let balance = await web3.eth.getBalance(gas_address);

    balance = web3.utils.toBN(balance);
    console.log("GAS BALANCE", balance.toString());

    // Convert the amount from ether to wei
    const amountInWei = web3.utils.toWei(amount.toString(), "ether");
    console.log("GAS AMOUNT TO SEND", amountInWei.toString());

    // Get the gas price from the external API
    const GasPriceGwei = await getSpeedGasFromApi(assetId);
    console.log("GasPriceGwei: ", GasPriceGwei);

    let gasPrice = web3.utils.toWei(GasPriceGwei, "gwei");
    console.log("gasPrice: ", gasPrice);
    // let gasPrice = await web3.eth.getGasPrice();
    gasPrice = web3.utils.toBN(gasPrice);

    let gasLimit = GAS_LIMITS.ETH;

    let gasCost = gasPrice.mul(web3.utils.toBN(gasLimit));

    if (balance.lt(web3.utils.toBN(amountInWei).add(gasCost))) {
      throw new Error("INSUFFICIENT FUNDS IN GAS WALLET");
    }

    const nonce = await web3.eth.getTransactionCount(gas_address, "pending");

    const signedTx = await web3.eth.accounts.signTransaction(
      {
        to: sourceAddress,
        value: amountInWei,
        gas: gasLimit,
        gasPrice: gasPrice,
        nonce: nonce,
      },
      privateKey
    );

    const receipt = await web3.eth.sendSignedTransaction(
      signedTx.rawTransaction
    );

    return { success: true, txHash: receipt?.transactionHash };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function createTokenWithdraw(
  assetId,
  sourceAddress,
  receiverAddress,
  amount,
  privateKey,
  quicknode_url,
  transactionId
) {
  try {
    // Initialize Web3 instance
    const web3 = await web3Init(assetId);

    // Create contract instance
    const tokenContract = new web3.eth.Contract(
      TOKEN_ABI,
      CONTRACT_ADDRESS[assetId]
    );

    const decimals = await tokenContract.methods.decimals().call();

    let tokenBalance = await getAssetBalance(assetId, sourceAddress);

    // converting erc20 to wei
    tokenBalance = web3.utils.toWei(tokenBalance.toString(), "ether");

    // conveting erc20 to big number
    tokenBalance = web3.utils.toBN(tokenBalance);

    const amountToSend = TO_WEI(amount, decimals);

    const GasPriceGwei = await getGasFromApi(assetId);
    const gasPrice = web3.utils.toWei(GasPriceGwei, "gwei");
    const gasLimit = GAS_LIMITS.ETH_TOKEN;

    const gasFee = web3.utils.toBN(gasPrice).mul(web3.utils.toBN(gasLimit));

    if (web3.utils.toBN(tokenBalance).lt(amountToSend)) {
      throw new Error(`INSUFFICIENT FUNDS IN SOURCE ADDRESS ${assetId}`);
    }

    const sourceGasBalance = await web3.eth.getBalance(sourceAddress);

    // GAS THING
    if (web3.utils.toBN(sourceGasBalance).lt(web3.utils.toBN(gasFee))) {
      const gasWalletTrx = await ETH_GAS_STATION(
        assetId,
        sourceAddress,
        web3.utils.fromWei(gasFee, "ether"),
        QUICKNODE_URL[assetId]
      );

      if (!gasWalletTrx.success) {
        throw new Error(gasWalletTrx.error);
      }
    }

    const transferFunction = tokenContract.methods
      .transfer(receiverAddress, amountToSend)
      .encodeABI();

    const noteHex = web3.utils.asciiToHex(transactionId);
    const data = transferFunction + noteHex.slice(2); // Remove '0x' from noteHex

    const nonce = await web3.eth.getTransactionCount(sourceAddress, "pending");

    const tx = {
      from: sourceAddress,
      to: CONTRACT_ADDRESS[assetId],
      data: data,
      gas: gasLimit,
      gasPrice: web3.utils.toBN(gasPrice),
      nonce: nonce,
    };

    const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);

    // await web3.eth
    //   .sendSignedTransaction(signedTx.rawTransaction)
    //   .on("transactionHash", function (hash) {
    //     // console.log(`${assetId} TRX HASH:`, hash);
    //     // You can store the hash or use it in further logic
    //   })
    //   .on("receipt", function (receipt) {
    //     // console.log(`${assetId} TRX receipt:`, receipt);
    //     // Here you can handle the receipt, e.g., update the transaction status
    //   })
    //   .on("error", function (error) {
    //     // console.error(`${assetId} TRX ERROR`, error);
    //     // Log the error but don't return or throw it
    //     // You can handle errors later when checking the transaction status
    //   });
    // const receipt = await web3.eth.sendSignedTransaction(
    //   signedTx.rawTransaction
    // );

    const txHash = await new Promise((resolve, reject) => {
      web3.eth
        .sendSignedTransaction(signedTx.rawTransaction)
        .on("transactionHash", (hash) => {
          console.log(`${assetId} TX hash:`, hash);
          resolve(hash); // Resolve promise with tx hash
        })
        .on("error", (error) => {
          // console.error(`${assetId} TX error:`, error);
          reject(error); // Reject promise on error
        });
    });

    return { success: true, txHash: txHash };

    // return { success: true, txHash: receipt?.transactionHash };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// USDC TRON
async function createUSDCTRONWithdraw(
  assetId,
  sourceAddress,
  receiverAddress,
  amount,
  privateKey
) {
  let tronWeb = new TronWeb({
    fullHost: TRON_FULL_HOST,
    privateKey: privateKey,
  });

  try {
    const contract = await tronWeb.contract().at(CONTRACT_ADDRESS.USDC_TRC20);
    let accountInfo = await tronWeb.trx.getAccount(sourceAddress);

    // for the first time activating the account
    if (Object.keys(accountInfo).length === 0) {
      const activationAmount = 1e6;
      await TRON_REFILL(TEST_COINS.USDC_TRC20, sourceAddress, activationAmount);
    }

    let balance = await getAssetBalance(
      TEST_COINS.USDC_TRC20,
      sourceAddress,
      privateKey
    );

    balance = balance * 1e6;

    let amountToSend = Math.floor(amount * 1e6);

    if (balance < amountToSend) {
      throw new Error("INSUFFICIENT_FUNDS");
    }

    let gasBalance = await getGasBalance(
      TEST_COINS.USDC_TRC20,
      sourceAddress,
      privateKey
    );

    gasBalance = gasBalance * 1e6;

    // for every transaction sending gas fees
    if (Number(gasBalance) < GAS_LIMITS.TRON)
      await TRON_REFILL(TEST_COINS.USDC_TRC20, sourceAddress, GAS_LIMITS.TRON);

    const trx = await contract.methods
      .transfer(receiverAddress, amountToSend)
      .send({
        from: sourceAddress,
      });

    const adding0xToHash = "0x" + trx;

    return { success: true, txHash: adding0xToHash };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

const TRON_REFILL = async (assetId, address, amount) => {
  try {
    const gasWallet = await getGasWalletDetails(assetId);

    const { privateKey, address: sourceAddress } = gasWallet;

    const tronWebGasWallet = new TronWeb({
      fullHost: TRON_FULL_HOST,
      privateKey: privateKey,
    });

    const balance = await tronWebGasWallet.trx.getBalance(sourceAddress);

    if (parseFloat(balance) < parseFloat(amount)) {
      throw new Error("INSUFFICIENT_FUNDS_IN_GAS_WALLET");
    }

    const trx = await tronWebGasWallet.trx.sendTransaction(address, amount);

    return trx;
  } catch (error) {
    throw new Error(error.message);
  }
};

// USDT TRON
async function createUSDTTRONWithdraw(
  assetId,
  sourceAddress,
  receiverAddress,
  amount,
  privateKey
) {
  let tronWeb = new TronWeb({
    fullHost: TRON_FULL_HOST,
    privateKey: privateKey,
  });

  try {
    const contract = await tronWeb.contract().at(CONTRACT_ADDRESS.USDT_TRC20);
    let accountInfo = await tronWeb.trx.getAccount(sourceAddress);

    // for the first time activating the account
    if (Object.keys(accountInfo).length === 0) {
      const activationAmount = 1e6; // 1 TRX
      await TRON_REFILL(TEST_COINS.USDT_TRC20, sourceAddress, activationAmount);
    }

    let balance = await getAssetBalance(
      TEST_COINS.USDT_TRC20,
      sourceAddress,
      privateKey
    );

    balance = tronWeb.toDecimal(balance) * 1e6;

    let amountToSend = Math.floor(amount * 1e6);

    if (balance < amountToSend) {
      throw new Error("INSUFFICIENT_FUNDS");
    }

    let gasBalance = await getGasBalance(
      TEST_COINS.USDT_TRC20,
      sourceAddress,
      privateKey
    );

    gasBalance = gasBalance * 1e6;

    // for every transaction sending gas fees
    if (Number(gasBalance) < GAS_LIMITS.TRON)
      await TRON_REFILL(TEST_COINS.USDT_TRC20, sourceAddress, GAS_LIMITS.TRON);

    const trx = await contract.methods
      .transfer(receiverAddress, amountToSend)
      .send({
        from: sourceAddress,
      });

    const adding0xToHash = "0x" + trx;

    return { success: true, txHash: adding0xToHash };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  createETHWithdraw,
  createBTCWithdraw,
  createUSDTTRONWithdraw,
  createUSDCTRONWithdraw,
  ETH_GAS_STATION,
  SpeedUpTheTransaction,
  createTokenWithdraw,
  getSpeedGasFromApi,
};
