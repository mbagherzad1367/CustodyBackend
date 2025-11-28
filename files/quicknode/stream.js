const { TEST_COINS, WALLET_STORE_LIST } = require("../crypto/cryptoConstants");
const { toHex, fromHex } = require("tron-format-address");
const { QUICKNODE_API } = require("./constant");

async function updateStream(assetId, address, walletStoreList) {
  const myHeaders = {
    accept: "application/json",
    "Content-Type": "application/json",
    "x-api-key": QUICKNODE_API,
  };
  try {
    const patchNotify = await fetch(
      `https://api.quicknode.com/kv/rest/v1/lists/${walletStoreList}`,
      {
        method: "PATCH",
        headers: myHeaders,
        redirect: "follow",
        body: JSON.stringify({
          addItems: [address],
        }),
      }
    );
    const result = await patchNotify.json();

    if (result) {
      return true;
    }
  } catch (err) {
    return false;
  }
}

async function deleteStreamList(assetId, address, walletStoreList) {
  const myHeaders = {
    accept: "application/json",
    "Content-Type": "application/json",
    "x-api-key": QUICKNODE_API,
  };

  try {
    const patchNotify = await fetch(
      `https://api.quicknode.com/kv/rest/v1/lists/${walletStoreList}`,
      {
        method: "PATCH",
        headers: myHeaders,
        redirect: "follow",
        body: JSON.stringify({
          removeItems: [address],
        }),
      }
    );
    const result = await patchNotify.json();

    if (result) {
      return true;
    }
  } catch (err) {
    return false;
  }
}

async function quicknodeUpdateAddress(assetId, toAddress) {
  try {
    const walletStoreMap = {
      [TEST_COINS.ETH]: WALLET_STORE_LIST.ETH,
      [TEST_COINS.BTC]: WALLET_STORE_LIST.BTC,
      [TEST_COINS.USDC_ERC20]: WALLET_STORE_LIST.ETH,
      [TEST_COINS.USDT_ERC20]: WALLET_STORE_LIST.ETH,
      [TEST_COINS.USDC_BSC]: WALLET_STORE_LIST.USDC_USDT_BSC,
      [TEST_COINS.USDT_BSC]: WALLET_STORE_LIST.USDC_USDT_BSC,
      [TEST_COINS.USDC_POLYGON]: WALLET_STORE_LIST.USDT_USDC_POLYGON,
      [TEST_COINS.USDT_POLYGON]: WALLET_STORE_LIST.USDT_USDC_POLYGON,
      [TEST_COINS.USDC_e_POLYGON]: WALLET_STORE_LIST.USDT_USDC_POLYGON,
      [TEST_COINS.USDC_TRC20]: WALLET_STORE_LIST.USDC_USDT_TRC20,
      [TEST_COINS.USDT_TRC20]: WALLET_STORE_LIST.USDC_USDT_TRC20,
    };

    const walletStore = walletStoreMap[assetId];
    if (!walletStore) return false;

    if (
      assetId === TEST_COINS.USDC_TRC20 ||
      assetId === TEST_COINS.USDT_TRC20
    ) {
      toAddress = await padTopic(toAddress);
    }
    const result = await updateStream(assetId, toAddress, walletStore);
    console.log("result: ", result);
    return result ? true : false;
  } catch (error) {
    console.log("QUICKNODE_ERROR_UPDATE", error);
    throw new Error("Failed to update the address. Please try again.");
  }
}

// Tron
async function padTopic(tronTopic) {
  let addressBase58 = toHex(tronTopic);
  if (!/^0x[0-9a-fA-F]+$/.test(addressBase58)) {
    addressBase58 = toHex(addressBase58).replace(/^0x/, "");
  } else {
    addressBase58 = addressBase58.replace(/^0x/, "");
  }
  // while (addressBase58.length < 64) {
  //   addressBase58 = "0" + addressBase58;
  // }
  return "0x" + addressBase58;
}

async function setNotificationAlertForStatus(
  assetId,
  address,
  isAddressMasterOrCommission = false
) {
  return await quicknodeUpdateAddress(
    assetId,
    address,
    isAddressMasterOrCommission
  );
}

module.exports = { setNotificationAlertForStatus };
