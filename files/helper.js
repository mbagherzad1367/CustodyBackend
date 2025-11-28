const { Op, literal } = require("sequelize");
const transaction = require("../db/models/transaction");
const { v4: uuidv4 } = require("uuid");
const { CONTRACT_ADDRESS } = require("./crypto/cryptoConstants");
const { sendEmail } = require("./sendEmail");
const { getAssetBalance } = require("./crypto/balance");
const wallet = require("../db/models/wallet");
const adminWallet = require("../db/models/adminWallet");

exports.extractAddressAndValueandOther = (hexInput) => {
  // Remove the '0x' prefix
  const data = hexInput.slice(2);

  // Define the positions based on the bit structure
  const functionSignatureLength = 8; // Function signature (4 bytes = 8 hex characters)
  const addressOffset = functionSignatureLength + 24; // Skip the function signature + 24 leading zeros (32 hex characters in total)
  const addressLength = 40; // Address length (20 bytes = 40 hex characters)
  const valueOffset = addressOffset + addressLength; // Value starts right after the address
  const valueLength = 64; // Value length (32 bytes = 64 hex characters)

  // Extract the address and value from the hex input
  const address = data.substring(addressOffset, addressOffset + addressLength);
  const value = data.substring(valueOffset, valueOffset + valueLength);

  const valueInDecimal = BigInt("0x" + value);

  const noteHex = "0x" + data.slice(136); // Skip the function selector, toAddress, and amount

  return {
    address: "0x" + address,
    value: valueInDecimal.toString(),
    note: noteHex,
  };
};

const getLimitOffset = (pageNumber, pageSize) => {
  const limit = pageSize ? parseInt(pageSize, 10) : 10;
  const offset = pageNumber && pageNumber > 0 ? (pageNumber - 1) * limit : 0;
  return { limit, offset, page: pageNumber ? parseInt(pageNumber, 10) : 1 };
};

exports.createTransactionOrUpdate = async (
  webhookData,
  incomingClientTrx,
  incomingAdminTrx,
  existingOutgoingTrx,
  sequelizeTrx
) => {
  try {
    const { assetId, amount, txHash, sourceAddress, targetAddress, status } =
      webhookData;

    if (existingOutgoingTrx) {
      existingOutgoingTrx.status = status;
      existingOutgoingTrx.subStatus = status;
      existingOutgoingTrx.txHash = txHash;

      await existingOutgoingTrx.save({
        transaction: sequelizeTrx,
      });
    }

    if (incomingClientTrx || incomingAdminTrx) {
      const userType = incomingAdminTrx ? "MASTER" : "CLIENT";

      let userId = incomingAdminTrx
        ? incomingAdminTrx?.userId
        : incomingClientTrx?.userId;
      let whichUser = incomingAdminTrx ? "user" : incomingClientTrx?.userType;

      const walletname = incomingAdminTrx
        ? "MASTER"
        : incomingClientTrx
        ? incomingClientTrx?.walletName
        : "Unknown";

      const transactionId = uuidv4();

      await transaction.create(
        {
          userId,
          transactionId,
          assetId,
          amount,
          txHash,
          sourceAddress,
          targetAddress,
          status,
          subStatus: status,
          userType,
          transactionType: "INCOMING",
          whichUser: whichUser || "user",
        },
        { transaction: sequelizeTrx }
      );

      const receiver = "commissions@blk-tech.com";
      // const receiver = "keshav@simplileap.com";
      const url =
        process.env.FRONT_END_URL ||
        "https://vault-admin-frontend-dkf0d8amgvhnftdb.northeurope-01.azurewebsites.net/sign-in";
      const isNotificationEnabled = incomingAdminTrx
        ? incomingAdminTrx.notify
        : incomingClientTrx
        ? incomingClientTrx.notify
        : false;

      if (isNotificationEnabled) {
        await sendEmail(
          receiver,
          `New Deposit : ${amount} ${assetId}`,
          `
            <div style="max-width: 600px; margin: 30px auto; padding: 25px; font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; background-color: #f7f9fc; border: 1px solid #dce3ea; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
              
              
          
              <div style="font-size: 16px; color: #555; line-height: 1.6; text-align: center;">
                <p>
                  A new deposit of 
                  <strong style="color: #007bff;">${amount} ${assetId}</strong> 
                  has been received to wallet
                  <strong style="color: #007bff;">${walletname}</strong>. 
                  Please see 
                  <a href=${url} style="color: #007bff; text-decoration: none; font-weight: bold;">
                    Custody Solutions
                  </a> 
                  for more details.
                </p>
              </div>
          
              <p style="font-size: 12px; color: #999; text-align: center; margin-top: 30px;">
                If you didn't request this, you can safely ignore this email.
              </p>
          
            </div>
            `
        );
      }
    }

    if (incomingClientTrx) {
      const balance = await getAssetBalance(
        assetId,
        targetAddress,
        incomingClientTrx?.privateKey
      );

      incomingClientTrx.balance = parseFloat(balance);
      await incomingClientTrx.save({
        transaction: sequelizeTrx,
      });
    }

    if (existingOutgoingTrx) {
      // FOR client wallets
      const outgoingClientWallet = await wallet.findOne({
        where: { address: sourceAddress, assetId },
      });

      if (outgoingClientWallet) {
        const balance = await getAssetBalance(
          assetId,
          sourceAddress,
          outgoingClientWallet?.privateKey
        );

        outgoingClientWallet.balance = parseFloat(balance);
        await outgoingClientWallet.save({
          transaction: sequelizeTrx,
        });
      }

      // for master wallets
      if (!outgoingClientWallet) {
        const foundMasterWallet = await adminWallet.findOne({
          where: { address: sourceAddress, assetId },
        });

        if (foundMasterWallet) {
          const balance = await getAssetBalance(assetId, sourceAddress);

          foundMasterWallet.balance = parseFloat(balance);
          await foundMasterWallet.save({
            transaction: sequelizeTrx,
          });
        }
      }
    }
  } catch (error) {
    throw error;
  }
};

exports.generateRandomString = () => {
  const length = 10; // Adjust the length as needed
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }

  return result;
};

const getFilteredParams = (params) => {
  let filteredParams = {};

  Object.keys(params).forEach((key) => {
    if (params[key] || ["number", "boolean"].includes(typeof params[key])) {
      // Convert to integer if key is 'id'
      if (key === "id" || key === "balance") {
        filteredParams[key] = parseInt(params[key]);
      } else {
        // Otherwise, proceed with the existing logic
        filteredParams[key] = {
          [Op.iLike]: { [Op.any]: [`%${params[key]}%`] },
        };
      }
    }
  });

  return filteredParams;
};

const getPagingData = (result, page, limit) => {
  const { count: totalItems, rows: data } = result;
  const currentPage = page ? page : 1;
  const itemsPerPage = limit > totalItems ? totalItems : limit;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const from = itemsPerPage * (currentPage - 1) + 1 || 1;
  const to = Math.min(from + itemsPerPage - 1, totalItems);

  return {
    data,
    pagination: {
      totalItems,
      totalPages,
      currentPage,
      itemsPerPage: limit,
      from,
      to,
    },
  };
};

exports.paginate = async (req, model, query) => {
  let {
    pageSize,
    pageNumber,
    fromDate,
    toDate,
    assetName,
    clientName,
    debitedAmount,
    creditedAmount,
    clientId,
    sort,
    field,
    operationType,
    currency,
    ...queryParams
  } = req.query;
  pageNumber = parseInt(pageNumber, 10) || 1;
  pageSize = parseInt(pageSize, 10) || 10;

  const filteredParams = getFilteredParams(queryParams);

  if (assetName) {
    const assetNameCondition = {
      [Op.or]: [
        {
          "$Asset.name$": {
            [Op.iLike]: { [Op.any]: [`%${assetName}%`] },
          },
        },
        {
          "$SourceAsset.Asset.name$": {
            [Op.iLike]: { [Op.any]: [`%${assetName}%`] },
          },
        },
        {
          "$DestinationAsset.Asset.name$": {
            [Op.iLike]: { [Op.any]: [`%${assetName}%`] },
          },
        },
      ],
    };

    filteredParams[Op.and] = [
      ...(filteredParams[Op.and] || []),
      assetNameCondition,
    ];
  }

  if (currency) {
    const assetIdCondition = {
      [Op.or]: [
        literal(
          `CONCAT("assetId", '-', "destinationAssetId") ILIKE '%${currency}%'`
        ),
      ],
    };

    filteredParams[Op.and] = [
      ...(filteredParams[Op.and] || []),
      assetIdCondition,
    ];
  }

  if (clientName) {
    const clientNameCondition = {
      [Op.or]: [
        literal(
          `CONCAT("User"."firstname", ' ', "User"."lastname") ILIKE '%${clientName}%'`
        ),
      ],
    };

    filteredParams[Op.and] = [
      ...(filteredParams[Op.and] || []),
      clientNameCondition,
    ];
  }

  if (clientId) {
    const clientIdCondition = {
      [Op.or]: [
        {
          "$User.id$": {
            [Op.eq]: clientId,
          },
        },
      ],
    };

    filteredParams[Op.and] = [
      ...(filteredParams[Op.and] || []),
      clientIdCondition,
    ];
  }

  if (operationType) {
    filteredParams["$OperationType.id$"] = {
      [Op.eq]: operationType,
    };
  }

  if (fromDate && toDate) {
    // Convert fromDate and toDate to the start and end of the day respectively
    const fromDateStartOfDay = new Date(fromDate);

    fromDateStartOfDay.setHours(0, 0, 0, 0);

    const toDateEndOfDay = new Date(toDate);

    toDateEndOfDay.setHours(23, 59, 59, 999);

    filteredParams.createdAt = {
      [Op.between]: [fromDateStartOfDay, toDateEndOfDay],
    };
  } else if (fromDate) {
    const fromDateStartOfDay = new Date(fromDate);
    fromDateStartOfDay.setHours(0, 0, 0, 0);

    filteredParams.createdAt = {
      [Op.gte]: fromDateStartOfDay,
    };
  } else if (toDate) {
    const toDateEndOfDay = new Date(toDate);
    toDateEndOfDay.setHours(23, 59, 59, 999);

    filteredParams.createdAt = {
      [Op.lte]: toDateEndOfDay,
    };
  }

  // console.log(
  //   "filteredParams",
  //   util.inspect(filteredParams, { showHidden: false, depth: null })
  // );

  query.where = { ...filteredParams, ...query.where };

  const { limit, offset, page } = getLimitOffset(pageNumber, pageSize);

  if (sort && field) {
    query.order = [[field, sort]];
  }

  const data = await model.findAndCountAll({
    ...query,
    limit,
    offset,
    distinct: true,
  });

  return getPagingData(data, page, limit);
};

exports.findAssetByContractAddress = (contract_address, assetIds) => {
  console.log("assetIds__: ", assetIds);
  console.log("contract_address: ", contract_address);
  const filtered = {};

  assetIds.forEach((id) => {
    if (CONTRACT_ADDRESS[id]) {
      filtered[id] = CONTRACT_ADDRESS[id];
    }
  });
  console.log("CONTRACT_ADDRESS: ", CONTRACT_ADDRESS);

  const findKeyByAddress = (address) => {
    return Object.keys(filtered).find((key) => filtered[key] === address);
  };

  let foundAsset = findKeyByAddress(contract_address);
  console.log("foundAsset: ", foundAsset);

  return foundAsset;
};
