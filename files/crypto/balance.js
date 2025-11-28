const { ethers } = require("ethers");

const axios = require("axios");

const Web3 = require("web3");
const TronWeb = require("tronweb");
const {
  CONTRACT_ADDRESS,
  TEST_COINS,
  QUICKNODE_URL,
  TRON_FULL_HOST,
  TOKEN_ABI,
  BLOCK_STREAM_URL,
  GAS_COINS,
} = require("./cryptoConstants");

const getAssetBalance = async (assetId, address, privateKey) => {
  try {
    let balance = 0;
    if (assetId === TEST_COINS.BTC) {
      const response = await axios.get(BLOCK_STREAM_URL + "/" + address);
      const data = response.data;
      balance =
        (data?.chain_stats?.funded_txo_sum || 0) -
        (data?.chain_stats?.spent_txo_sum || 0);
      balance = balance / 100000000 || 0;
    }

    if (assetId === TEST_COINS.ETH) {
      const provider = new ethers.providers.JsonRpcProvider(
        QUICKNODE_URL[assetId]
      );
      balance = await provider.getBalance(address);
      balance = ethers.utils.formatEther(balance);
      balance = parseFloat(balance);
    }

    if (
      assetId === TEST_COINS.USDC_ERC20 ||
      assetId === TEST_COINS.USDT_ERC20 ||
      assetId === TEST_COINS.USDC_BSC ||
      assetId === TEST_COINS.USDT_BSC ||
      assetId === TEST_COINS.USDC_POLYGON ||
      assetId === TEST_COINS.USDT_POLYGON ||
      assetId === TEST_COINS.USDC_e_POLYGON
    ) {
      const httpProvider = new Web3.providers.HttpProvider(
        QUICKNODE_URL[assetId]
      );
      const web3Client = new Web3(httpProvider);

      const contract = new web3Client.eth.Contract(
        TOKEN_ABI,
        CONTRACT_ADDRESS[assetId]
      );

      const [result, decimals] = await Promise.all([
        contract.methods.balanceOf(address).call(),
        contract.methods.decimals().call(),
      ]);

      console.log("decimals", decimals, "result", result);
      balance = Number(result) / Math.pow(10, decimals);

      balance = parseFloat(balance) || 0;
      console.log(`balance_: ${assetId}`, balance);
    }

    if (
      assetId === TEST_COINS.USDT_TRC20 ||
      assetId === TEST_COINS.USDC_TRC20
    ) {
      const tronWeb = new TronWeb({
        fullHost: TRON_FULL_HOST,
        privateKey: "41".repeat(32), // dummy private key
      });

      const contract = await tronWeb.contract().at(CONTRACT_ADDRESS[assetId]);

      balance = await contract.methods.balanceOf(address).call();

      balance = Number(balance) / 1e6;
      balance = parseFloat(balance);
    }

    return balance;
  } catch (error) {
    //
  }
};

const getGasBalance = async (assetId, address, privatekey) => {
  let balance = 0;
  if (
    assetId === TEST_COINS.ETH ||
    assetId === TEST_COINS.USDC_ERC20 ||
    assetId === TEST_COINS.USDT_ERC20 ||
    assetId === TEST_COINS.USDC_BSC ||
    assetId === TEST_COINS.USDT_BSC ||
    assetId === TEST_COINS.USDC_POLYGON ||
    assetId === TEST_COINS.USDT_POLYGON ||
    assetId === TEST_COINS.USDC_e_POLYGON
  ) {
    const web3 = new Web3(
      new Web3.providers.HttpProvider(QUICKNODE_URL[assetId])
    );

    balance = await web3.eth.getBalance(address);

    balance = web3.utils.fromWei(balance, "ether");
  }

  if (assetId === TEST_COINS.USDC_TRC20 || assetId === TEST_COINS.USDT_TRC20) {
    const tronWeb = new TronWeb({
      fullHost: TRON_FULL_HOST,
    });
    const balanceInSun = await tronWeb.trx.getBalance(address);
    balance = tronWeb.fromSun(balanceInSun);
  }

  return balance;
};

module.exports = {
  getAssetBalance,
  getGasBalance,
};
