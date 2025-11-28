const { Op, Sequelize } = require("sequelize");
const snapshot = require("../db/models/snapshot");
const wallet = require("../db/models/wallet");
const { getAssetBalance } = require("../files/crypto/balance");
const { paginate } = require("../files/helper");
const asset = require("../db/models/asset");
const user = require("../db/models/user");

const BATCH_SIZE = 10; // Adjust batch size as needed

const processBatch = async (batch) => {
  return await Promise.all(
    batch.map(async (item) => {
      const jsonItem = item.toJSON();
      try {
        let balance = await getAssetBalance(
          jsonItem.assetId,
          jsonItem.address,
          jsonItem.privateKey
        );
        return {
          address: jsonItem.address,
          walletName: jsonItem.walletName,
          assetId: jsonItem.assetId,
          userId: jsonItem.userId,
          vaultId: jsonItem.vaultId,
          balance: balance || 0,
        };
      } catch (error) {
        console.error("Error fetching balance:", error);
        return {
          address: jsonItem.address,
          walletName: jsonItem.walletName,
          assetId: jsonItem.assetId,
          userId: jsonItem.userId,
          vaultId: jsonItem.vaultId,
          balance: 0, // Default balance on failure
        };
      }
    })
  );
};

const snapshotApi = async (req, res, next) => {
  try {
    const wallets = await wallet.findAll({
      attributes: [
        "address",
        "privateKey",
        "assetId",
        "userId",
        "vaultId",
        "walletName",
      ],
    });

    if (!wallets.length) {
      return res.status(200).json({ message: "No wallets found" });
    }

    let allSnapshots = [];
    for (let i = 0; i < wallets.length; i += BATCH_SIZE) {
      const batch = wallets.slice(i, i + BATCH_SIZE);
      const processedBatch = await processBatch(batch);
      allSnapshots.push(...processedBatch);
    }

    await snapshot.bulkCreate(allSnapshots);
    return res.status(200).json({ message: "Snapshots created successfully" });
  } catch (error) {
    console.error("Error in snapshotApi:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const allsnapShots = async (req, res, next) => {
  const {
    client,
    createdAt,
    sort = "DESC",
    field = "createdAt",
    ...rest
  } = req.query;

  let where = {};

  const { userType, userId } = req.user;

  if (userType === "companyUser") {
    // fetch only company user wallets

    const allVaults = await wallet.findAll({
      where: { userId },
    });

    const allVaultIds = allVaults?.map((item) => item.vaultId);
    where[Op.or] = [{ vaultId: { [Op.in]: allVaultIds } }];
  } else if (userType === "company") {
    const foundCompanyLinkedUsers = await user.findAll({
      where: { companyId: userId },
      attributes: ["userId"],
    });

    const allUserIds = foundCompanyLinkedUsers?.map((item) => item.userId);
    const totalUserIds = [...allUserIds, userId];

    const allVaults = await wallet.findAll({
      where: { userId: { [Op.in]: totalUserIds } },
    });

    const allVaultIds = allVaults?.map((item) => item.vaultId);

    // fetch only company & company user wallets
    where[Op.or] = [{ vaultId: { [Op.in]: allVaultIds } }];
  }

  if (createdAt) {
    const formattedDate = new Date(createdAt).toISOString().split("T")[0]; // Ensures format is YYYY-MM-DD

    where[Op.and] = [
      Sequelize.where(
        Sequelize.fn("DATE", Sequelize.col('"snapshot"."createdAt"')),
        formattedDate
      ),
    ];
  }

  let orderList = [];
  if (field && sort) {
    orderList.push([field, sort]);
  }

  const snapshots = await paginate({ ...req, query: rest }, snapshot, {
    where,
    order: orderList,
    include: [
      {
        model: asset,
        as: "asset",
        attributes: ["icon", "name", "krakenAssetId"],
      },
    ],
  });

  const resBody = {
    message: "Snapshot fetched successfully!",
    success: true,
    body: snapshots,
  };
  return res.json(resBody);
};

module.exports = {
  snapshotApi,
  allsnapShots,
};
