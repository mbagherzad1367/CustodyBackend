const { Op, literal, sequelize } = require("sequelize");

const getLimitOffset = (pageNumber, pageSize) => {
  const limit = pageSize ? parseInt(pageSize, 10) : 10;
  const offset = pageNumber && pageNumber > 0 ? (pageNumber - 1) * limit : 0;
  return { limit, offset, page: pageNumber ? parseInt(pageNumber, 10) : 1 };
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

const paginate = async (req, model, query) => {
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

  if (fromDate && toDate) {
    // Convert fromDate and toDate to Date objects in UTC, including the time
    const fromDateUTC = new Date(fromDate).toISOString(); // Convert to UTC
    const toDateUTC = new Date(toDate).toISOString(); // Convert to UTC

    const fromDateUTCObj = new Date(fromDateUTC);
    const toDateUTCObj = new Date(toDateUTC);

    filteredParams.createdAt = {
      [Op.between]: [fromDateUTCObj, toDateUTCObj], // Filter between the two dates in UTC with time included
    };
  } else if (fromDate) {
    const fromDateUTC = new Date(fromDate).toISOString();
    filteredParams.createdAt = {
      [Op.gte]: fromDateUTC, // Greater than or equal to fromDate in UTC
    };
  } else if (toDate) {
    const toDateUTC = new Date(toDate).toISOString();
    filteredParams.createdAt = {
      [Op.lte]: toDateUTC, // Less than or equal to toDate in UTC
    };
  }

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

module.exports = paginate;
