const { Op, fn, col, where, Sequelize } = require("sequelize");
const AppError = require("../utils/appError");
const { paginate } = require("../files/helper");
const bcrypt = require("bcrypt");
const transaction = require("../db/models/transaction");
const user = require("../db/models/user");
const role = require("../db/models/role");

// Get all roles with permissions
const allCompanies = async (req, res, nextt) => {
  const {
    client,
    createdAt,
    sort = "DESC",
    field = "createdAt",
    ...rest
  } = req.query;

  let where = {
    userType: "company",
  };

  if (createdAt) {
    const formattedDate = new Date(createdAt).toISOString().split("T")[0]; // Ensures format is YYYY-MM-DD

    where[Op.and] = [
      Sequelize.where(
        Sequelize.fn("DATE", Sequelize.col('"user"."createdAt"')),
        formattedDate
      ),
    ];
  }

  let orderList = [];
  if (field && sort) {
    orderList.push([field, sort]);
  }

  const companies = await paginate({ ...req, query: rest }, user, {
    where,
    attributes: { exclude: ["password", "deletedAt"] },
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
    message: "Companies fetched successfully!",
    success: true,
    body: companies,
  };
  return res.json(resBody);
};

const addCompany = async (req, res, next) => {
  const body = req.body;

  // Hash the password before saving
  const hashedPassword = await bcrypt.hash(body.password, 10);

  const newUser = await user.create({
    firstname: body.firstname,
    lastname: body.lastname,
    email: body.email,
    phone: body.phone,
    countrycode: body.countrycode,
    roleId: body.roleId,
    userType: "company",
    password: hashedPassword, // Store the hashed password
    // vaultIds: body.vaultIds || [],
  });

  if (!newUser) {
    return next(new AppError("Failed to create the company", 400));
  }

  const result = newUser.toJSON();

  delete result.password;
  delete result.deletedAt;

  const resBody = {
    message: "Company Created successfully!",
    desc: `${body?.firstname} ${body?.lastname} created successfully`,
    success: true,
    body: result, // Send the created user details without password
  };

  return res.json(resBody);
};

const editCompany = async (req, res, next) => {
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
      // vaultIds: body.vaultIds || foundUser.vaultIds,
    },
    {
      where: {
        userId,
      },
    }
  );

  if (!updatedUser) {
    return next(new AppError("Failed to update the company", 400));
  }

  const resBody = {
    message: "Company updated successfully!",
    desc: `${body?.firstname} ${body?.lastname} updated successfully!`,
    success: true,
    body: updatedUser, // Send the created user details without password
  };

  return res.json(resBody);
};

const deleteCompany = async (req, res, next) => {
  const { id } = req.query;

  // Check if the whitelist entry exists
  const foundUser = await user.findByPk(id, {
    attributes: ["id", "firstname", "lastname"],
  });

  if (!foundUser) {
    return next(new AppError("Company not found", 400));
  }

  let username = foundUser?.firstname + "" + foundUser.lastname;

  // Delete the whitelisted address
  await user.destroy({
    where: { id },
  });

  let resBody = {
    message: "Company deleted successfully!",
    desc: `${username} deleted successfully!`,
    success: true,
  };

  return res.json(resBody);
};

// company user
const companyUsersById = async (req, res, next) => {
  const { id } = req.params;

  const foundCompany = await user.findOne({
    where: { userId: id, userType: "company" },
    attributes: ["userId"],
    include: [
      {
        model: user,
        as: "companyUsers",
        where: { userType: "companyUser" },
        required: false,
        attributes: [
          "userId",
          "firstname",
          "lastname",
          "email",
          "phone",
          "userType",
          "companyId",
        ],
      },
    ],
  });

  const plainCompany = foundCompany.toJSON();
  const companyUsers = plainCompany.companyUsers || [];

  if (companyUsers.length > 0) {
    const userIds = companyUsers.map((u) => u.userId);

    const transactions = await transaction.findAll({
      where: {
        userId: { [Op.in]: userIds },
        transactionType: { [Op.in]: ["INCOMING", "OUTGOING"] },
      },
      attributes: ["userId", "transactionType"],
    });

    const txnCountMap = {};
    for (const txn of transactions) {
      const { userId, transactionType } = txn;
      if (!txnCountMap[userId]) {
        txnCountMap[userId] = { incomingtxns: 0, outgoingtxns: 0 };
      }
      if (transactionType === "INCOMING") txnCountMap[userId].incomingtxns++;
      if (transactionType === "OUTGOING") txnCountMap[userId].outgoingtxns++;
    }

    plainCompany.companyUsers = companyUsers.map((user) => ({
      ...user,
      incomingtxns: txnCountMap[user.userId]?.incomingtxns || 0,
      outgoingtxns: txnCountMap[user.userId]?.outgoingtxns || 0,
    }));
  }

  const resBody = {
    message: "User by company Id fetched successfully!",
    success: true,
    body: plainCompany,
  };

  return res.json(resBody);
};

module.exports = {
  allCompanies,
  editCompany,
  companyUsersById,
  addCompany,
  deleteCompany,
};
