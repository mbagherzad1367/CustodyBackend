// PATHS
const bitcoin = require("bitcoinjs-lib");

exports.ETH_PATH = `m/44'/60'/0'/0/0`;
exports.BTC_PATH = `m/44'/0'/0'/0/0`;

exports.GAS_LIMITS = {
  ETH: 30000,
  ETH_TOKEN: 200000,
  TRON: 15e6,
};

exports.KRAKEN_KEYS = {
  USDC_ERC20: process.env.KRAKEN_KEY_USDC_ERC20,
  USDT_ERC20: process.env.KRAKEN_KEY_USDT_ERC20,
  USDC_BSC: process.env.KRAKEN_KEY_USDC_BSC,
  USDT_BSC: process.env.KRAKEN_KEY_USDT_BSC,
  USDC_POLYGON: process.env.KRAKEN_KEY_USDC_POLYGON,
  USDT_POLYGON: process.env.KRAKEN_KEY_USDT_POLYGON,
  USDT_TRC20: process.env.KRAKEN_KEY_USDT_TRC20,
  USDC_TRC20: process.env.KRAKEN_KEY_USDC_TRC20,
  ETH: process.env.KRAKEN_KEY_ETH,
  BTC: process.env.KRAKEN_KEY_BTC,
};

exports.LIQUIDITY_ADDRESS = {
  BTC: process.env.BTC_LIQUIDITY_ADDRESS,
  ETH: process.env.ETH_LIQUIDITY_ADDRESS,
  USDC_TRC20: process.env.USDC_TRON_LIQUIDITY_ADDRESS,
  USDT_TRC20: process.env.USDT_TRON_LIQUIDITY_ADDRESS,
  USDC_ERC20: process.env.USDC_ERC20_LIQUIDITY_ADDRESS,
  USDT_ERC20: process.env.USDT_ERC20_LIQUIDITY_ADDRESS,
  USDC_POLYGON: process.env.USDC_POLYGON_LIQUIDITY_ADDRESS,
  USDT_POLYGON: process.env.USDT_POLYGON_LIQUIDITY_ADDRESS,
};

exports.TEST_COINS = {
  BTC: "BTC",
  ETH: "ETH",
  USDC_ERC20: "USDC_ERC20",
  USDT_ERC20: "USDT_ERC20",
  USDC_BSC: "USDC_BSC",
  USDT_BSC: "USDT_BSC",
  USDC_TRC20: "USDC_TRC20",
  USDT_TRC20: "USDT_TRC20",
  USDT_POLYGON: "USDT_POLYGON",
  USDC_POLYGON: "USDC_POLYGON",
  USDC_e_POLYGON: "USDC_e_POLYGON",
};

exports.WALLET_STORE_LIST = {
  BTC: "CUSTODY_PROD_TEST_BTC",
  ETH: "CUSTODY_PROD_TEST_ETH",
  USDC_USDT_ERC20: "CUSTODY_PROD_TEST_ETH_TOKEN",
  USDC_USDT_BSC: "CUSTODY_PROD_TEST_BSC_TOKEN",
  USDC_USDT_TRC20: "CUSTODY_PROD_TEST_TRON",
  USDT_USDC_POLYGON: "CUSTODY_PROD_TEST_POLYGON_TOKEN",
};

exports.CONVERT_TO_VALID_ASSETIDS = function (assetId) {
  let converted;
  switch (assetId) {
    case "USDC_ERC20":
    case "USDC_BSC":
    case "USDC_TRC20":
    case "USDC_POLYGON":
    case "USDC_e_POLYGON":
      converted = "USDC";
      break;
    case "USDT_ERC20":
    case "USDT_BSC":
    case "USDT_TRC20":
    case "USDT_POLYGON":
      converted = "USDT";
      break;
    default:
      converted = assetId; // If the assetId doesn't match any case, return it as is
  }
  return converted;
};

exports.KRAKEN_VALID_PAIRS = [
  "BTC/USDT",
  "ETH/USDT",
  "BTC/USDC",
  "BTC/USDT",
  "BTC/EUR",
  "USDC/EUR",
  "USDC/USDT",
  "ETH/EUR",
  "ETH/USDC",
  "ETH/USDT",
  "ETH/BTC",
  "USDT/EUR",
  "MATIC/USDT",
  "MATIC/BTC",
  "MATIC/EUR",
];

exports.ASSETS = [
  "ETH",
  "BTC",
  "USDC_ERC20",
  "USDT_ERC20",
  "USDC_BSC",
  "USDT_BSC",
  "USDC_POLYGON",
  "USDC_e_POLYGON",
  "USDT_POLYGON",
  "USDC_TRC20",
  "USDT_TRC20",
];

exports.GAS_COINS = {
  ETH: "ETH",
  BNB: "BNB",
  MATIC: "MATIC",
  TRX: "TRX",
};

exports.TOKEN_ABI = [
  {
    constant: false,
    inputs: [
      {
        name: "_to",
        type: "address",
      },
      {
        name: "_value",
        type: "uint256",
      },
    ],
    name: "transfer",
    outputs: [
      {
        name: "",
        type: "bool",
      },
    ],
    type: "function",
  },
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
  },
];

exports.STATUS = {
  COMPLETED: "COMPLETED",
  SUBMITTED: "SUBMITTED",
  FAILED: "FAILED",
  PENDING: "PENDING",
};

exports.GAS_WALLET_ID = 0;
exports.MASTER_WALLET_ID = 1;
exports.is_TESTNET = process.env.NETWORK === "TESTNET";
exports.NETWORK = process.env.NETWORK || "TESTNET";

exports.BSC_ICON =
  "https://exchangecrm.blob.core.windows.net/static-images/bsc.svg";
exports.ETH_ICON =
  "https://exchangecrm.blob.core.windows.net/static-images/Ethernum.svg";
exports.POLYGON_ICON =
  "https://exchangecrm.blob.core.windows.net/static-images/polygon.svg";
exports.TRON_ICON =
  "https://exchangecrm.blob.core.windows.net/static-images/trx.svg";

exports.QUICKNODE_URL = {
  BTC: this.is_TESTNET
    ? process.env.BTC_INFURA_TESTNET
    : process.env.BTC_QUICKNODE_MAINNET,
  ETH: this.is_TESTNET
    ? process.env.ETH_INFURA_TESTNET
    : process.env.ETH_QUICKNODE_MAINNET,
  USDC_BSC: this.is_TESTNET
    ? process.env.USDC_BSC_INFURA_TESTNET
    : process.env.USDC_BSC_QUICKNODE_MAINNET,
  USDT_BSC: this.is_TESTNET
    ? process.env.USDT_BSC_INFURA_TESTNET
    : process.env.USDT_BSC_QUICKNODE_MAINNET,
  USDC_ERC20: this.is_TESTNET
    ? process.env.USDC_ERC20_INFURA_TESTNET
    : process.env.USDC_ERC20_QUICKNODE_MAINNET,
  USDT_ERC20: this.is_TESTNET
    ? process.env.USDT_ERC20_INFURA_TESTNET
    : process.env.USDT_ERC20_QUICKNODE_MAINNET,
  USDC_POLYGON: this.is_TESTNET
    ? process.env.USDC_POLYGON_INFURA_TESTNET
    : process.env.USDC_POLYGON_QUICKNODE_MAINNET,
  USDC_e_POLYGON: this.is_TESTNET
    ? process.env.USDC_e_POLYGON_INFURA_TESTNET
    : process.env.USDC_e_POLYGON_QUICKNODE_MAINNET,
  USDT_POLYGON: this.is_TESTNET
    ? process.env.USDT_POLYGON_INFURA_TESTNET
    : process.env.USDT_POLYGON_QUICKNODE_MAINNET,
};

exports.CONTRACT_ADDRESS = {
  USDC_ERC20: this.is_TESTNET
    ? process.env.TESTNET_USDC_ERC20_CONTRACT
    : process.env.MAINNET_USDC_ERC20_CONTRACT,
  USDT_ERC20: this.is_TESTNET
    ? process.env.TESTNET_USDT_ERC20_CONTRACT
    : process.env.MAINNET_USDT_ERC20_CONTRACT,
  USDC_BSC: this.is_TESTNET
    ? process.env.TESTNET_USDC_BSC_CONTRACT
    : process.env.MAINNET_USDC_BSC_CONTRACT,
  USDT_BSC: this.is_TESTNET
    ? process.env.TESTNET_USDT_BSC_CONTRACT
    : process.env.MAINNET_USDT_BSC_CONTRACT,
  USDC_POLYGON: this.is_TESTNET
    ? process.env.TESTNET_USDC_POLYGON_CONTRACT
    : process.env.MAINNET_USDC_POLYGON_CONTRACT,
  USDC_e_POLYGON: this.is_TESTNET
    ? process.env.TESTNET_USDC_e_POLYGON_CONTRACT
    : process.env.MAINNET_USDC_e_POLYGON_CONTRACT,
  USDT_POLYGON: this.is_TESTNET
    ? process.env.TESTNET_USDT_POLYGON_CONTRACT
    : process.env.MAINNET_USDT_POLYGON_CONTRACT,
  USDC_TRC20: this.is_TESTNET
    ? process.env.TESTNET_USDC_TRC20_CONTRACT
    : process.env.MAINNET_USDC_TRC20_CONTRACT,
  USDT_TRC20: this.is_TESTNET
    ? process.env.TESTNET_USDT_TRC20_CONTRACT
    : process.env.MAINNET_USDT_TRC20_CONTRACT,
};

exports.BTC_NETWORK = this.is_TESTNET
  ? bitcoin.networks.testnet
  : bitcoin.networks.bitcoin;

exports.TRON_FULL_HOST = this.is_TESTNET
  ? "https://nile.trongrid.io/"
  : "https://api.trongrid.io/";

// https://nile.trongrid.io/
exports.TOKEN_DECIMALS = 18;

exports.BLOCK_STREAM_URL = this.is_TESTNET
  ? "https://mempool.space/testnet/api/address"
  : "https://blockstream.info/api/address";
