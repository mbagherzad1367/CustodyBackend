const { Op, fn, col, where } = require("sequelize");
const permission = require("../db/models/permission");
const role = require("../db/models/role");
const AppError = require("../utils/appError");
const user = require("../db/models/user");
const whitelistedAddress = require("../db/models/whitelistedAddress");

// Get all roles with permissions
const getAllRoles = async (req, res, next) => {
  const { userType, userId, companyId } = req.user;

  let where = {};

  if (userType === "company" || userType === "companyUser") {
    where = {
      [Op.or]: [{ category: "companyUser" }],
      companyId: { [Op.or]: [userId, companyId] },
    };
  } else {
    where = {
      [Op.or]: [{ category: "company" }, { category: "user" }],
    };
  }

  const foundRoles = await role.findAll({
    where,
    order: [["createdAt", "ASC"]],
  });

  res.json({
    message: "Roles fetched successfully!",
    success: true,
    body: foundRoles,
  });
};

// Get all permissions
const getAllPermissions = async (req, res, next) => {
  const { userType } = req.user;

  // let where = {};

  // if(userType !== 'user'){
  //   where.
  // }

  const foundPermissions = await permission.findAll({
    order: [["createdAt", "ASC"]],
  });

  res.json({
    message: "Permissions fetched successfully!",
    success: true,
    body: foundPermissions,
  });
};

// Add a new role
const addRole = async (req, res, next) => {
  const { userType, userId, companyId } = req.user;
  const { name, permissions, category } = req.body;
  console.log("name: ", name);

  const isCompany = userType === "company";
  const isCompanyUser = userType === "companyUser";

  const existingRole = await role.findOne({
    where: where(fn("LOWER", col("name")), name.toLowerCase()),
  });

  if (existingRole)
    return next(new AppError("Role with same name already exist.", 404));

  const newRole = await role.create({
    name,
    permissions,
    category: isCompany ? "companyUser" : category || "user",
    ...((isCompany || isCompanyUser) && { companyId: companyId || userId }),
  });

  res.json({
    message: "Role created successfully",
    success: true,
    body: newRole,
  });
};

// Update permissions for a role
const updatePermission = async (req, res, next) => {
  const { roleId, permissions } = req.body;

  const foundRole = await role.findByPk(roleId);
  if (!foundRole) {
    return next(new AppError("Role not found", 404));
  }

  foundRole.permissions = permissions;
  await foundRole.save();

  res.json({
    message: "Permissions updated successfully",
    success: true,
    body: {},
  });
};

// Delete a role
const deleteRole = async (req, res, next) => {
  const { id } = req.query;

  // Remove roleId from users
  await user.update({ roleId: null }, { where: { roleId: id } });

  // Fetch whitelist entries containing this roleId
  const foundWhitelistWithThisRole = await whitelistedAddress.findAll({
    where: {
      roleIds: {
        [Op.contains]: [id], // finds rows that include this roleId
      },
    },
  });

  for (const whitelist of foundWhitelistWithThisRole) {
    // remove that roleId from array
    const updatedRoleIds = whitelist.roleIds.filter(
      (roleId) => roleId !== parseInt(id) // make sure type matches
    );
    // update the record
    await whitelist.update({ roleIds: updatedRoleIds });
  }

  const deleted = await role.destroy({ where: { id } });

  if (!deleted) {
    return next(new AppError("Role not found", 404));
  }

  res.json({
    message: "role deleted successfully",
    success: true,
  });
};

module.exports = {
  getAllPermissions,
  getAllRoles,
  addRole,
  updatePermission,
  deleteRole,
};
