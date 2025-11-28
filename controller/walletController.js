globalThis.crypto = require("crypto").webcrypto;
const { Sequelize, Op, col, fn, where } = require("sequelize");
const adminWallet = require("../db/models/adminWallet");
const asset = require("../db/models/asset");
const transaction = require("../db/models/transaction");
const user = require("../db/models/user");
const wallet = require("../db/models/wallet");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const { split } = require("shamirs-secret-sharing");
const { combine } = require("shamirs-secret-sharing");
const { KeyManagementServiceClient } = require("@google-cloud/kms");

const {
  ASSETS,
  GAS_WALLET_ID,
  MASTER_WALLET_ID,
  STATUS,
  BSC_ICON,
  POLYGON_ICON,
  TRON_ICON,
  ETH_ICON,
  TEST_COINS,
} = require("../files/crypto/cryptoConstants");
const {
  createAssetWithMnemonic,
  createTransaction,
} = require("../files/crypto/cryptoService");
const { generateRandomString, paginate } = require("../files/helper");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const bip39 = require("bip39");
const whitelistedAddress = require("../db/models/whitelistedAddress");
const { getAssetBalance, getGasBalance } = require("../files/crypto/balance");
const key1 = require("../db/models/key1");
// const AWS = require("aws-sdk");
const logs = require("../db/models/logs");
const role = require("../db/models/role");

const key2 = require("../db/models-db2/key2");
const key3 = require("../db/models-db3/key3");
const {
  encryptWithGCPKMS,
  KMS_KEYS,
  decryptWithGCPKMS,
} = require("../files/kms");

// AWS.config.update({
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   region: process.env.AWS_REGION,
// });

// const kms_config = new AWS.KMS();
// const hsm_config = new AWS.HSM();

const createAdminWallet = async (req, res, next) => {
  const userId = req.user.userId;

  let walletName = req.query.wallet;

  const walletId =
    walletName === "GAS"
      ? GAS_WALLET_ID
      : walletName === "MASTER"
      ? MASTER_WALLET_ID
      : NaN;

  const foundWallets = await adminWallet.findOne({
    where: {
      vaultId: walletId,
    },
  });

  if (foundWallets) {
    return next(new AppError(`${walletName} wallet already exist`, 400));
  }

  const foundAnyWallet = await adminWallet.findOne({
    attributes: ["mnemonic"],
  });

  let mnemonic;

  if (foundAnyWallet) {
    mnemonic = foundAnyWallet?.mnemonic;
  } else {
    mnemonic = bip39.generateMnemonic();
  }

  const assets = await asset.findAll({});

  const addressDetails = await Promise.all(
    assets.map(async (item) => {
      const asset = await createAssetWithMnemonic(
        mnemonic,
        item.assetId,
        walletId
      );
      return {
        ...asset,
        assetId: item.assetId,
        vaultId: walletId,
        userId,
      };
    })
  );

  for (const item of addressDetails) {
    const currency = item.assetId;

    if (
      currency === TEST_COINS.BTC ||
      currency === TEST_COINS.ETH ||
      currency === TEST_COINS.USDC_TRC20
    ) {
      let secret;
      if (item === TEST_COINS.BTC || item === TEST_COINS.USDC_TRC20) {
        secret = Buffer.from(item.privateKey, "hex");
      } else {
        secret = Buffer.from(item.privateKey.replace("0x", ""), "hex");
      }

      const shares = split(secret, { shares: 3, threshold: 3 });

      const [enc1, enc2, enc3] = await Promise.all([
        encryptWithGCPKMS(shares[0].toString("hex"), KMS_KEYS.key1),
        encryptWithGCPKMS(shares[1].toString("hex"), KMS_KEYS.key2),
        encryptWithGCPKMS(shares[2].toString("hex"), KMS_KEYS.key3),
      ]);

      // DATABASE
      await key1.create({
        key: enc1,
        walletId: item.vaultId,
        currency: currency === TEST_COINS.USDC_TRC20 ? "TRON" : currency,
      });

      await key2.create({
        key: enc2,
        walletId: item.vaultId,
        currency: currency === TEST_COINS.USDC_TRC20 ? "TRON" : currency,
      });

      await key3.create({
        key: enc3,
        walletId: item.vaultId,
        currency: currency === TEST_COINS.USDC_TRC20 ? "TRON" : currency,
      });
    }

    // Remove privateKey from final insert
    delete item.privateKey;
    delete item.mnemonic;
  }

  await adminWallet.bulkCreate(addressDetails);

  const resBody = {
    message: `${walletName} Created successfully!`,
    desc: `${walletName} Created successfully!`,
    success: true,
    body: {},
  };
  return res.json(resBody);
};

const createClientWallet = async (req, res, next) => {
  const { userId, userType } = req.user;
  const walletName = req.query.walletName;

  if (!walletName) {
    return next(new AppError("Wallet name required", 400));
  }

  const foundWallet = await wallet.findOne({
    where: where(fn("LOWER", col("walletName")), walletName.toLowerCase()),

    attributes: ["walletName"],
    raw: true,
  });

  if (foundWallet) {
    return next(new AppError("Wallet name already exist!", 400));
  }

  let mnemonic = bip39.generateMnemonic();

  const assets = await asset.findAll({});

  const randomVaultId = generateRandomString();

  const addressDetails = await Promise.all(
    assets.map(async (item) => {
      const asset = await createAssetWithMnemonic(mnemonic, item.assetId);
      return {
        ...asset,
        assetId: item.assetId,
        userId,
        vaultId: randomVaultId,
        walletName,
        userType,
      };
    })
  );

  for (const item of addressDetails) {
    const currency = item.assetId;

    if (
      currency === TEST_COINS.BTC ||
      currency === TEST_COINS.ETH ||
      currency === TEST_COINS.USDC_TRC20
    ) {
      let secret;
      if (item === TEST_COINS.BTC || item === TEST_COINS.USDC_TRC20) {
        secret = Buffer.from(item.privateKey, "hex");
      } else {
        secret = Buffer.from(item.privateKey.replace("0x", ""), "hex");
      }

      const shares = split(secret, { shares: 3, threshold: 3 });

      const [enc1, enc2, enc3] = await Promise.all([
        encryptWithGCPKMS(shares[0].toString("hex"), KMS_KEYS.key1),
        encryptWithGCPKMS(shares[1].toString("hex"), KMS_KEYS.key2),
        encryptWithGCPKMS(shares[2].toString("hex"), KMS_KEYS.key3),
      ]);

      // DATABASE
      await key1.create({
        key: enc1,
        walletId: item.vaultId,
        currency: currency === TEST_COINS.USDC_TRC20 ? "TRON" : currency,
      });

      await key2.create({
        key: enc2,
        walletId: item.vaultId,
        currency: currency === TEST_COINS.USDC_TRC20 ? "TRON" : currency,
      });

      // KEY STORE 3

      await key3.create({
        key: enc3,
        walletId: item.vaultId,
        currency: currency === TEST_COINS.USDC_TRC20 ? "TRON" : currency,
      });
    }

    // Remove privateKey from final insert
    delete item.privateKey;
    delete item.mnemonic;
  }

  await wallet.bulkCreate(addressDetails);

  const resBody = {
    message: `Wallets Created successfully!`,
    desc: `${walletName} Created successfully!`,
    success: true,
    body: {},
  };
  return res.json(resBody);
};

const adminWallets = async (req, res, next) => {
  let walletName = req.query.wallet;

  const vaultId =
    walletName === "GAS"
      ? GAS_WALLET_ID
      : walletName === "MASTER"
      ? MASTER_WALLET_ID
      : NaN;

  let where = {};
  let conditions = [];

  conditions.push({ vaultId });

  if (walletName === "GAS") {
    conditions.push({
      assetId: ["ETH", "USDC_BSC", "USDC_TRC20", "USDC_POLYGON"],
    });
  }

  if (conditions.length > 0) {
    where = { [Op.and]: conditions };
  }

  const wallets = await adminWallet.findAll({
    where: where,
    order: [["createdAt", "DESC"]],
    include: [
      {
        model: user,
        as: "user",
        attributes: ["firstname", "lastname"],
      },
      {
        model: asset,
        as: "asset",
        attributes: ["assetId", "icon", "krakenAssetId"],
      },
    ],
  });

  let walletsWithBalance;

  if (walletName === "GAS" && wallets) {
    walletsWithBalance = await Promise.all(
      wallets.map(async (item) => {
        const jsonItem = item.toJSON();
        let balance = await getGasBalance(
          jsonItem.assetId,
          jsonItem.address,
          jsonItem.privateKey
        );

        let currency = jsonItem.assetId;

        const { privateKey, publickey, ...rest } = jsonItem;
        return {
          ...rest,
          balance: balance || 0,
          assetId:
            currency === "USDC_BSC"
              ? "BSC"
              : currency === "USDC_POLYGON"
              ? "POLYGON"
              : currency === "USDC_TRC20"
              ? "TRON"
              : currency,
          icon:
            currency === "USDC_BSC"
              ? BSC_ICON
              : currency === "USDC_POLYGON"
              ? POLYGON_ICON
              : currency === "USDC_TRC20"
              ? TRON_ICON
              : currency === "ETH"
              ? ETH_ICON
              : "",
        };
      })
    );
  }

  if (walletName === "MASTER" && wallets) {
    walletsWithBalance = await Promise.all(
      wallets.map(async (item) => {
        const jsonItem = item.toJSON();
        let balance = await getAssetBalance(
          jsonItem.assetId,
          jsonItem.address,
          jsonItem.privateKey
        );

        const { privateKey, publickey, ...rest } = jsonItem;

        return {
          ...rest,
          balance: balance || 0,
        };
      })
    );
  }

  const resBody = {
    message: "Admin Wallet fetched successfully!",
    success: true,
    body: walletsWithBalance,
  };

  return res.json(resBody);
};

// client
const clientWallets = async (req, res, next) => {
  const {
    client,
    sort = "DESC",
    field = "createdAt",
    vaultId,
    assetArchive,
    ...rest
  } = req.query;
  console.log("vaultId: ", vaultId);

  let userWhere = {};

  if (client) {
    userWhere[Op.or] = [
      Sequelize.literal(
        `CONCAT("user"."firstname", ' ', "user"."lastname") ILIKE '%${client}%'`
      ),
    ];
  }
  let orderList = [];
  if (field && sort) {
    if (field === "client") {
      orderList.push([{ model: user, as: "user" }, "firstname", sort]);
    } else {
      orderList.push([field, sort]);
    }
  }

  const wallets = await paginate({ ...req, query: rest }, wallet, {
    order: orderList,
    where: {
      vaultId,
      assetArchive,
    },
    include: [
      {
        model: asset,
        as: "asset",
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
      },
    ],
  });

  // let walletsWithBalance = await Promise.all(
  //   wallets?.data.map(async (item) => {
  //     const jsonItem = item.toJSON();
  //     let balance = await getAssetBalance(
  //       jsonItem.assetId,
  //       jsonItem.address,
  //       jsonItem.privateKey
  //     );

  //     return {
  //       ...jsonItem,
  //       balance: balance || 0,
  //     };
  //   })
  // );

  const walletsWithBalance = await Promise.allSettled(
    wallets?.data.map(async (item) => {
      const jsonItem = item.toJSON();
      const balance = await getAssetBalance(
        jsonItem.assetId,
        jsonItem.address,
        jsonItem.privateKey
      );

      const { privateKey, publickey, ...rest } = jsonItem;
      return { ...rest, balance };
    })
  );

  console.log("walletsWithBalance: ", walletsWithBalance);
  const resBody = {
    message: "Client Wallet fetched successfully!",
    success: true,
    body: {
      ...wallets,
      data: walletsWithBalance.map((result) =>
        result.status === "fulfilled" ? result.value : { balance: 0 }
      ),
    },
  };

  return res.json(resBody);
};

// PAGINATED CLIENT WALLETS
const allClients = async (req, res, next) => {
  const { userId, roleId, vaultIds, userType } = req.user;
  const {
    client,
    pageSize = 10,
    pageNumber = 1,
    walletName,
    vaultId,
    notify,
    createdAt,
    archived,
    sort = "DESC",
    field = "createdAt",
    ...rest
  } = req.query;

  const limit = parseInt(pageSize, 10);
  const offset = (parseInt(pageNumber, 10) - 1) * limit;

  // Build dynamic where clause
  const whereClause = {};

  // if not admin
  if (roleId !== 1) {
    if (userType === "companyUser") {
      whereClause[Op.or] = [
        { userId }, // fetch only company user wallets
        { vaultId: { [Op.in]: vaultIds } },
      ];
    } else if (userType === "company") {
      const foundCompanyLinkedUsers = await user.findAll({
        where: { companyId: userId },
        attributes: ["userId"],
      });

      const allUserIds = foundCompanyLinkedUsers?.map((item) => item.userId);

      const totalUserIds = [...allUserIds, userId];

      // fetch only company & company user wallets
      whereClause[Op.or] = [{ userId: { [Op.in]: totalUserIds } }];
    } else {
      whereClause[Op.or] = [
        { userType: "user" },
        { userId }, // fetch own wallets
        { vaultId: { [Op.in]: vaultIds } }, // fetch all wallets in allowed vaults
      ];
    }
  } else {
    whereClause[Op.or] = [{ userType: "user" }];
  }

  if (walletName) {
    whereClause.walletName = { [Op.iLike]: { [Op.any]: [`%${walletName}%`] } };
  }

  if (archived) {
    whereClause.archived = archived === "true" ? true : false;
  }

  if (vaultId) {
    whereClause.vaultId = vaultId;
  }

  if (notify) {
    whereClause.notify = notify === "Enabled" ? true : false;
  }

  if (createdAt) {
    const formattedDate = new Date(createdAt).toISOString().split("T")[0]; // Ensures format is YYYY-MM-DD

    whereClause[Op.and] = [
      Sequelize.where(
        Sequelize.fn("DATE", Sequelize.col('"wallet"."createdAt"')),
        formattedDate
      ),
    ];
  }

  let orderList = [];
  if (field && sort) {
    orderList.push([field, sort]);
  }

  const wallets = await wallet.findAll({
    order: orderList,
    where: whereClause,
    attributes: ["vaultId", "walletName", "createdAt", "notify", "archived"],
    group: ["vaultId", "walletName", "createdAt", "notify", "archived"],
    raw: true,
    limit,
    offset,
  });

  // 2. Fetch total items (count distinct vaultIds)
  const totalWallets = await wallet.count({
    distinct: true,
    where: whereClause,
    col: "vaultId",
  });

  const resBody = {
    message: "Client Wallet fetched successfully!",
    success: true,
    body: {
      data: wallets,
      pagination: {
        pageNumber: parseInt(pageNumber, 10),
        pageSize: parseInt(pageSize, 10),
        totalItems: totalWallets,
        totalPages: Math.ceil(totalWallets / limit),
      },
    },
  };

  return res.json(resBody);
};

const allClientsVaultIds = async (req, res, next) => {
  const whereClause = {};
  const { userId, roleId, vaultIds, userType } = req.user;

  if (roleId !== 1) {
    if (userType === "companyUser") {
      whereClause[Op.or] = [
        { userId }, // fetch only company user wallets
      ];
    } else if (userType === "company") {
      const foundCompanyLinkedUsers = await user.findAll({
        where: { companyId: userId },
        attributes: ["userId"],
      });

      const allUserIds = foundCompanyLinkedUsers?.map((item) => item.userId);

      const totalUserIds = [...allUserIds, userId];

      // fetch only company & company user wallets
      whereClause[Op.or] = [{ userId: { [Op.in]: totalUserIds } }];
    } else {
      whereClause[Op.or] = [
        { userType: "user" },
        { userId }, // fetch own wallets
        { vaultId: { [Op.in]: vaultIds } }, // fetch all wallets in allowed vaults
      ];
    }
  } else {
    whereClause[Op.or] = [{ userType: "user" }];
  }

  whereClause.archived = false;

  const wallets = await wallet.findAll({
    where: whereClause,
    order: [["createdAt", "DESC"]],
    attributes: ["vaultId", "walletName", "createdAt"],
    group: ["vaultId", "walletName", "createdAt"],
    raw: true,
  });

  const resBody = {
    message: "Client Wallet fetched successfully!",
    success: true,
    body: {
      data: wallets,
    },
  };

  return res.json(resBody);
};

const editClient = async (req, res, next) => {
  const vaultId = req.params.id;

  if (!req.body.walletName) {
    return next(new AppError("Wallet name not found", 400));
  }

  const updatedUser = await wallet.update(
    {
      walletName: req.body.walletName,
    },
    {
      where: { vaultId },
    }
  );

  if (!updatedUser) {
    return next(new AppError("Failed to update the walletName", 400));
  }

  const resBody = {
    message: "Wallet name updated successfully!",
    success: true,
    body: updatedUser, // Send the created user details without password
  };

  return res.json(resBody);
};

const notifyClientTrx = async (req, res, next) => {
  const vaultId = req.params.id;

  const [updatedCount, updatedRows] = await wallet.update(
    {
      notify: req.body.notify ? false : true,
    },
    {
      where: { vaultId },
      returning: true,
    }
  );

  if (updatedCount === 0) {
    return next(new AppError("Failed to update the email notification", 400));
  }

  const updatedUser = updatedRows[0];

  const resBody = {
    message: `Email notification turned ${
      req?.body?.notify ? "off" : "on"
    } successfully!`,
    desc: `Email notification turned ${req?.body?.notify ? "off" : "on"} for ${
      updatedUser.walletName
    } successfully!`,
    success: true,
    body: updatedUser, // Send the created user details without password
  };

  return res.json(resBody);
};

const notifyMasterTrx = async (req, res, next) => {
  const vaultId = req.params.id;

  const updatedUser = await adminWallet.update(
    {
      notify: req.body.notify ? false : true,
    },
    {
      where: { vaultId },
    }
  );

  if (!updatedUser) {
    return next(new AppError("Failed to update the email notification", 400));
  }

  const resBody = {
    message: `Email notification turned ${
      req?.body?.notify ? "off" : "on"
    } successfully!`,
    desc: `Email notification turned ${
      req?.body?.notify ? "off" : "on"
    } for master wallet successfully!`,
    success: true,
    body: updatedUser, // Send the created user details without password
  };

  return res.json(resBody);
};

const deleteClient = async (req, res, next) => {
  const vaultId = req.params.id;

  // Check if the whitelist entry exists
  const foundClient = await wallet.findOne({
    where: {
      vaultId,
    },
    attributes: ["vaultId", "walletName"],
  });

  let walletName = foundClient?.walletName;

  if (!foundClient) {
    return next(new AppError("Client not found", 400));
  }

  // Delete the whitelisted address
  await wallet.destroy({
    where: { vaultId },
  });

  let resBody = {
    message: "Client deleted successfully!",
    desc: `${walletName} wallet deleted successfully!`,
    success: true,
  };

  return res.json(resBody);
};

const deleteClientAsset = async (req, res, next) => {
  const { assetId, vaultId } = req.query;
  console.log("assetId, vaultId: ", assetId, vaultId);

  if (!assetId || !vaultId) {
    return next(new AppError("Parameters not found", 400));
  }

  // Check if the whitelist entry exists
  const foundClient = await wallet.findOne({
    where: {
      vaultId,
      assetId,
    },
    attributes: ["vaultId", "assetId", "walletName"],
  });

  if (!foundClient) {
    return next(new AppError("Client not found", 400));
  }

  let walletName = foundClient?.walletName;

  // Delete the whitelisted address
  await wallet.destroy({
    where: { vaultId, assetId },
  });

  let resBody = {
    message: "Currency deleted successfully!",
    desc: `${assetId} for ${walletName} deleted successfully!`,
    success: true,
  };

  return res.json(resBody);
};

// withdraw
const createWithdraw = async (req, res, next) => {
  const userId = req.user.userId;

  const { userType: whichUser } = req.user;
  console.log("userId__: ", userId);

  const walletName = req.query.wallet;
  console.log("walletName__: ", walletName);

  const { assetId, sourceAddress, targetAddress, amount, note } = req.body;

  let walletDetails;
  let privateKey;
  let vaultId;

  if (walletName === "MASTER") {
    walletDetails = await adminWallet.findOne({
      where: {
        assetId,
        address: sourceAddress,
      },
      attributes: ["vaultId"],
    });

    vaultId = walletDetails?.vaultId.toString();
  }

  if (walletName === "CLIENT") {
    walletDetails = await wallet.findOne({
      where: {
        assetId,
        address: sourceAddress,
      },
      attributes: ["vaultId"],
    });

    vaultId = walletDetails?.vaultId;
  }

  console.log({ vaultId });
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

  // key1 from database
  const k2 = await key2.findOne({
    where: {
      walletId: vaultId,
      currency: baseAsset,
    },
  });

  // key1 from database
  const k3 = await key3.findOne({
    where: {
      walletId: vaultId,
      currency: baseAsset,
    },
  });

  if (!k1 || !k2 || !k3) {
    return next(new AppError("Private key not found", 400));
  }
  console.log(k1, k2, k3, vaultId, baseAsset)
  const [dec1, dec2, dec3] = await Promise.all([
    decryptWithGCPKMS(k1.key, KMS_KEYS.key1),
    decryptWithGCPKMS(k2.key, KMS_KEYS.key2),
    decryptWithGCPKMS(k3.key, KMS_KEYS.key3),
  ]);

  console.log(KMS_KEYS.key1, KMS_KEYS.key2, KMS_KEYS.key3)
  console.log(dec1, dec2, dec3)
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

  privateKey = combinedKey;

  if (!walletDetails) {
    return next(new AppError("No wallet Details found ", 400));
  }

  const transactionId = uuidv4();

  await transaction.create({
    userId,
    assetId,
    transactionId,
    sourceAddress,
    targetAddress,
    amount,
    status: STATUS.SUBMITTED,
    subStatus: STATUS.SUBMITTED,
    transactionType: "OUTGOING",
    note,
    userType: walletName,
    whichUser: whichUser || "user",
  });

  const response = await createTransaction({
    assetId,
    sourceAddress,
    targetAddress,
    amount,
    privateKey,
    transactionId,
  });

  const { status, subStatus, txHash } = response;

  await transaction.update(
    {
      status: status || null,
      subStatus: subStatus || null,
      txHash: txHash || null,
    },
    {
      where: {
        transactionId: response.id,
      },
    }
  );

  const resBody = {
    message: "Withdrawl submitted!!",
    success: true,
    desc: `Withdrawal of ${amount} ${assetId} from ${sourceAddress} has been submitted successfully.`,
    body: {},
  };

  return res.json(resBody);
};

const fetchPaginatedWhiteListedAddress = async (req, res, next) => {
  const { roleId, userId, userType } = req.user;

  let where = {};

  if (userType === "companyUser") {
    where[Op.or] = [
      { userId }, // fetch only company-user wallets
    ];
  } else if (userType === "company") {
    const foundCompanyLinkedUsers = await user.findAll({
      where: { companyId: userId },
      attributes: ["userId"],
    });

    const allUserIds = foundCompanyLinkedUsers?.map((item) => item.userId);

    const totalUserIds = [...allUserIds, userId];

    // fetch only company & company user wallets
    where[Op.or] = [{ userId: { [Op.in]: totalUserIds } }];
  } else {
    where = {
      [Op.or]: [
        {
          [Op.and]: [
            { roleIds: { [Op.contains]: [roleId] } }, // roleIds array contains this roleId
          ],
        },
      ],
    };
  }

  const wallets = await paginate({ ...req }, whitelistedAddress, {
    where,
    order: [["createdAt", "DESC"]],
    include: [{ model: asset, as: "asset" }],
  });

  const resBody = {
    message: "Whitelisted address fetched successfully!",
    success: true,
    body: wallets,
  };

  return res.json(resBody);
};

const fetchWhiteListedAddress = async (req, res, next) => {
  const { roleId, userId, userType } = req.user;

  let where = {};

  if (userType === "companyUser") {
    where[Op.or] = [
      { userId }, // fetch only company-user wallets
    ];
  } else if (userType === "company") {
    const foundCompanyLinkedUsers = await user.findAll({
      where: { companyId: userId },
      attributes: ["userId"],
    });

    const allUserIds = foundCompanyLinkedUsers?.map((item) => item.userId);

    const totalUserIds = [...allUserIds, userId];

    // fetch only company & company user wallets
    where[Op.or] = [{ userId: { [Op.in]: totalUserIds } }];
  } else {
    where = {
      [Op.or]: [
        {
          [Op.and]: [
            { roleIds: { [Op.contains]: [roleId] } }, // roleIds array contains this roleId
          ],
        },
      ],
    };
  }

  const wallets = await whitelistedAddress.findAll({
    where,
    order: [["createdAt", "DESC"]],
    include: [{ model: asset, as: "asset" }],
  });

  const resBody = {
    message: "Whitelisted address fetched successfully!",
    success: true,
    body: wallets,
  };

  return res.json(resBody);
};

const createWhiteListedAddress = async (req, res, next) => {
  const { userId, roleId, userType, companyId } = req.user;

  const { address, assetId, name } = req.body;

  // const foundWhitelist = await whitelistedAddress.findOne({
  //   where: {
  //     address,
  //     assetId,
  //   },
  // });

  // if (foundWhitelist) {
  //   return next(
  //     new AppError(
  //       "Whitelisted address already exist with this currency and address",
  //       400
  //     )
  //   );
  // }

  let roleIds = [];
  if (userType === "companyUser") {
    const foundCompanyRoleId = await user.findOne({
      where: { userId: companyId },
      attributes: ["roleId"],
    });
    roleIds = [roleId, foundCompanyRoleId?.roleId];
  } else if (userType === "company") {
    roleIds = [roleId];
  } else {
    roleIds = [roleId, 1];
  }

  const wallets = await whitelistedAddress.create({
    address,
    assetId,
    name,
    userId,
    roleIds: roleIds,
  });

  const resBody = {
    message: "Whitelisted address created successfully!",
    success: true,
    body: wallets,
  };
  return res.json(resBody);
};

const deleteWhiteListedAddress = async (req, res, next) => {
  const { id } = req.query;

  // Check if the whitelist entry exists
  const foundWhitelist = await whitelistedAddress.findByPk(id, {
    attributes: ["id"],
  });

  if (!foundWhitelist) {
    return next(new AppError("Whitelisted address not found", 400));
  }

  // Delete the whitelisted address
  await whitelistedAddress.destroy({
    where: { id },
  });

  let resBody = {
    message: "Whitelisted address deleted successfully!",
    success: true,
  };

  return res.json(resBody);
};

const allTransactions = async (req, res, next) => {
  const { userId, vaultIds, roleId, userType } = req.user;
  const {
    walletName,
    createdAt,
    sort = "DESC",
    field = "createdAt",
    ...rest
  } = req.query;

  let userWhere = {};

  if (walletName) {
    userWhere[Op.or] = [
      Sequelize.literal(
        `CONCAT("sourceAsset"."walletName") ILIKE '%${walletName}%'`
      ),
    ];
  }

  let orderList = [];
  if (field && sort) {
    if (field === "client") {
      orderList.push([{ model: user, as: "user" }, "firstname", sort]);
    } else {
      orderList.push([field, sort]);
    }
  }

  let where = {};

  if (roleId !== 1) {
    if (userType === "companyUser") {
      // fetch only company user wallets

      const foundWallets = await wallet.findAll({
        where: { vaultId: { [Op.in]: vaultIds } },
        attributes: ["address"],
        raw: true,
      });

      const allAddresses = foundWallets.map((w) => w.address);

      where[Op.or] = [
        { userId },
        { sourceAddress: { [Op.in]: allAddresses } },
        { targetAddress: { [Op.in]: allAddresses } },
      ];
    } else if (userType === "company") {
      const foundCompanyLinkedUsers = await user.findAll({
        where: { companyId: userId },
        attributes: ["userId"],
      });
      const allUserIds = foundCompanyLinkedUsers?.map((item) => item.userId);
      const totalUserIds = [...allUserIds, userId];
      // fetch only company & company user wallets
      where[Op.or] = [{ userId: { [Op.in]: totalUserIds } }];
    } else {
      const foundWallets = await wallet.findAll({
        where: { vaultId: { [Op.in]: vaultIds } },
        attributes: ["address"],
        raw: true,
      });

      const allAddresses = foundWallets.map((w) => w.address);

      where[Op.or] = [
        { userId },
        { whichUser: "user" },
        { sourceAddress: { [Op.in]: allAddresses } },
        { targetAddress: { [Op.in]: allAddresses } },
      ];
    }
  }

  if (userType === "user") {
    where[Op.or] = [{ whichUser: "user" }];
  }

  if (createdAt) {
    const formattedDate = new Date(createdAt).toISOString().split("T")[0]; // Ensures format is YYYY-MM-DD

    where[Op.and] = [
      Sequelize.where(
        Sequelize.fn("DATE", Sequelize.col('"transaction"."createdAt"')),
        formattedDate
      ),
    ];
  }

  const trxs = await paginate({ ...req, query: rest }, transaction, {
    where,
    order: orderList,
    include: [
      {
        model: asset,
        as: "asset",
      },

      {
        model: user,
        as: "user",
        attributes: ["firstname", "lastname"],
      },

      { model: wallet, as: "targetAsset" },
      {
        model: wallet,
        as: "sourceAsset",
        where: userWhere,
        required: !!walletName,
      },
    ],
  });

  const resBody = {
    message: "Transactions fetched successfully!",
    success: true,
    body: trxs,
  };
  return res.json(resBody);
};

const allAssets = async (req, res, next) => {
  const assets = await asset.findAll({
    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
  });

  const resBody = {
    message: "Assets fetched successfully!",
    success: true,
    body: assets,
  };
  return res.json(resBody);
};

const allUsers = async (req, res, next) => {
  const {
    firstname,
    createdAt,
    sort = "DESC",
    field = "createdAt",
    ...rest
  } = req.query;

  let userWhere = {};

  let orderList = [];
  if (field && sort) {
    orderList.push([field, sort]);
  }

  const { userType, userId, companyId } = req.user;

  let where = {};

  if (userType === "company") {
    where[Op.and] = [
      {
        [Op.or]: [{ userType: "companyUser" }, { userType: "company" }],
      },
      {
        [Op.or]: [{ userId: userId }, { companyId: userId }],
      },
    ];
  } else if (userType === "companyUser") {
    where[Op.and] = [
      {
        [Op.or]: [{ userType: "companyUser" }, { userType: "company" }],
      },
      {
        [Op.or]: [
          { userId: userId },
          { userId: companyId },
          { companyId: userId },
          { companyId: companyId },
        ],
      },
    ];
  } else {
    where.userType = "user";
  }

  if (firstname) {
    where[Op.or] = [
      Sequelize.literal(
        `CONCAT("user"."firstname", ' ', "user"."lastname") ILIKE '%${firstname}%'`
      ),
    ];
  }

  if (createdAt) {
    const formattedDate = new Date(createdAt).toISOString().split("T")[0]; // Ensures format is YYYY-MM-DD

    where[Op.and] = [
      Sequelize.where(
        Sequelize.fn("DATE", Sequelize.col('"user"."createdAt"')),
        formattedDate
      ),
    ];
  }

  const users = await paginate({ ...req, query: rest }, user, {
    where,
    attributes: { exclude: ["password", "updatedAt", "deletedAt"] },
    order: orderList,
    include: [
      {
        model: role,
        atrributes: ["name", "id"],
        as: "roleDetails",
      },
    ],
  });

  const resBody = {
    message: "Users fetched successfully!",
    success: true,
    body: users,
  };
  return res.json(resBody);
};

const allLogs = async (req, res, next) => {
  const { userType, userId } = req.user;
  const {
    firstname,
    createdAt,
    sort = "DESC",
    field = "createdAt",
    ...rest
  } = req.query;

  let userWhere = {};

  let orderList = [];
  if (field && sort) {
    orderList.push([field, sort]);
  }
  let where = {};

  if (userType === "companyUser") {
    // fetch only company user wallets
    where[Op.or] = [{ userId }];
  } else if (userType === "company") {
    const foundCompanyLinkedUsers = await user.findAll({
      where: { companyId: userId },
      attributes: ["userId"],
    });
    const allUserIds = foundCompanyLinkedUsers?.map((item) => item.userId);
    const totalUserIds = [...allUserIds, userId];
    // fetch only company & company user wallets
    where[Op.or] = [{ userId: { [Op.in]: totalUserIds } }];
  }

  if (firstname) {
    where[Op.or] = [
      Sequelize.literal(
        `CONCAT("user"."firstname", ' ', "user"."lastname") ILIKE '%${firstname}%'`
      ),
    ];
  }

  if (createdAt) {
    const formattedDate = new Date(createdAt).toISOString().split("T")[0]; // Ensures format is YYYY-MM-DD

    where[Op.and] = [
      Sequelize.where(
        Sequelize.fn("DATE", Sequelize.col('"user"."createdAt"')),
        formattedDate
      ),
    ];
  }

  const logs_ = await paginate({ ...req, query: rest }, logs, {
    where,
    attributes: { exclude: ["password", "updatedAt", "deletedAt"] },
    order: orderList,
  });

  const resBody = {
    message: "Logs fetched successfully!",
    success: true,
    body: logs_,
  };
  return res.json(resBody);
};

const addUser = async (req, res, next) => {
  const body = req.body;

  const { userType, userId, companyId } = req?.user;

  const isCompany = userType === "company";
  const isCompanyUser = userType === "companyUser";

  // Hash the password before saving
  const hashedPassword = await bcrypt.hash(body.password, 10);

  const newUser = await user.create({
    firstname: body.firstname,
    lastname: body.lastname,
    email: body.email,
    phone: body.phone,
    countrycode: body.countrycode,
    roleId: body.roleId,
    userType: isCompany || isCompanyUser ? "companyUser" : "user",
    password: hashedPassword, // Store the hashed password
    vaultIds: body.vaultIds || [],
    companyId: isCompany ? userId : isCompanyUser ? companyId : null,
  });

  if (!newUser) {
    return next(new AppError("Failed to create the user", 400));
  }

  const result = newUser.toJSON();

  delete result.password;
  delete result.deletedAt;

  const resBody = {
    message: "User Created successfully!",
    desc: `${body?.firstname} ${body?.lastname} created successfully`,
    success: true,
    body: result, // Send the created user details without password
  };

  return res.json(resBody);
};

const editUser = async (req, res, next) => {
  const userId = req.body.userId;
  const body = req.body;

  const foundUser = await user.findOne({
    where: { userId },
  });

  // Hash the password before saving
  let hashedPassword;
  if (body.password) {
    hashedPassword = await bcrypt.hash(body.password, 10);
  }

  const updatedUser = await user.update(
    {
      firstname: body.firstname || foundUser.firstname,
      lastname: body.lastname || foundUser.lastname,
      email: body.email || foundUser.email,
      phone: body.phone || foundUser.phone,
      countrycode: body.countrycode || foundUser.countrycode,
      password: hashedPassword || foundUser.password,
      roleId: body.roleId,
      vaultIds: body.vaultIds || foundUser.vaultIds,
    },
    {
      where: {
        userId,
      },
    }
  );

  if (!updatedUser) {
    return next(new AppError("Failed to update the user", 400));
  }

  const resBody = {
    message: "User updated successfully!",
    desc: `${body?.firstname} ${body?.lastname} updated successfully!`,
    success: true,
    body: updatedUser, // Send the created user details without password
  };

  return res.json(resBody);
};

const deleteUser = async (req, res, next) => {
  const { id } = req.query;

  // Check if the whitelist entry exists
  const foundUser = await user.findByPk(id, {
    attributes: ["id", "firstname", "lastname"],
  });

  if (!foundUser) {
    return next(new AppError("User not found", 400));
  }

  let username = foundUser?.firstname + "" + foundUser.lastname;

  // Delete the whitelisted address
  await user.destroy({
    where: { id },
  });

  let resBody = {
    message: "User deleted successfully!",
    desc: `${username} deleted successfully!`,
    success: true,
  };

  return res.json(resBody);
};

const resetUser2FA = async (req, res, next) => {
  const { id } = req.query;

  // Check if the whitelist entry exists
  const foundUser = await user.findByPk(id, {
    attributes: ["id", "firstname", "lastname"],
  });

  if (!foundUser) {
    return next(new AppError("User not found", 400));
  }

  // Delete the whitelisted address
  foundUser.tfaEnabled = false;
  foundUser.authSecret = null;
  foundUser.save();

  let resBody = {
    message: "User's 2FA has been reset successfully!",
    desc: `${foundUser?.firstname} ${foundUser?.lastname}'s 2FA has been reset successfully!`,
    success: true,
  };

  return res.json(resBody);
};

const allClientsWithBalance = async (req, res, next) => {
  const {
    pageSize = 10,
    pageNumber = 1,
    createdAt,
    sort = "DESC",
    field = "createdAt",
  } = req.query;

  let orderList = [];
  if (field && sort) {
    orderList.push([field, sort]);
  }

  const wallets = await paginate(req, wallet, {
    attributes: ["assetId", "balance"],
    include: [
      {
        model: asset,
        as: "asset",
        attributes: ["assetId", "krakenAssetId"],
      },
    ],
  });

  const resBody = {
    message: "Client Wallet fetched successfully!",
    success: true,
    body: wallets,
  };

  return res.json(resBody);
};

const archiveVault = async (req, res, next) => {
  const vaultId = req.params.id;

  const { archived } = req.body; // true = archive, false = unarchive

  const [updatedCount, updatedRows] = await wallet.update(
    {
      archived: archived, // directly set to true or false
    },
    {
      where: { vaultId },
      returning: true,
    }
  );

  if (updatedCount === 0) {
    return next(new AppError("Vault not found or failed to update", 400));
  }

  const updatedVault = updatedRows[0];

  const action = archived ? "archived" : "unarchived";

  const resBody = {
    message: `Vault ${action} successfully!`,
    desc: `Vault ${action} for ${updatedVault.walletName} successfully!`,
    success: true,
    body: updatedVault,
  };

  return res.json(resBody);
};

const archiveAsset = async (req, res, next) => {
  const vaultId = req.params.id;
  const { assetArchive, assetId } = req.body; // true = archive, false = unarchive

  if (assetArchive === undefined || !assetId) {
    return next(
      new AppError("Invalid request: missing archive status or asset ID", 400)
    );
  }

  const [updatedCount, updatedRows] = await wallet.update(
    {
      assetArchive, // directly set to true or false
    },
    {
      where: { vaultId, assetId },
      returning: true,
    }
  );

  if (updatedCount === 0) {
    return next(
      new AppError("Vault or asset not found, or update failed", 400)
    );
  }

  const updatedVault = updatedRows[0];
  const action = assetArchive ? "archived" : "unarchived";

  const resBody = {
    message: `${assetId} ${action} successfully!`,
    desc: `${assetId} ${action} for ${updatedVault.walletName} successfully!`,
    success: true,
    body: updatedVault,
  };

  return res.json(resBody);
};

module.exports = {
  createAdminWallet,
  adminWallets,
  createClientWallet,
  clientWallets,
  createWithdraw,
  fetchPaginatedWhiteListedAddress,
  fetchWhiteListedAddress,
  createWhiteListedAddress,
  allTransactions,
  deleteWhiteListedAddress,
  allAssets,
  addUser,
  editUser,
  allUsers,
  deleteUser,
  resetUser2FA,
  allClients,
  editClient,
  deleteClient,
  deleteClientAsset,
  notifyClientTrx,
  notifyMasterTrx,
  allClientsWithBalance,
  allLogs,
  allClientsVaultIds,
  archiveVault,
  archiveAsset,
};
