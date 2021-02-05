let { Op } = require('sequelize');

if (!Op) {
  // Support older versions of sequelize
  Op = {
    and: '$and',
    or: '$or',
    lt: '$lt',
    lte: '$lte',
    gt: '$gt',
    gte: '$gte',
  };
}

const parseCursor = (cursor) => {
  if (!cursor) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
  } catch (e) {
    return null;
  }
};

const normalizeOrder = (order, primaryKeyField) => {
  const normalized = order.map((o) => {
    return typeof o === 'string' ? [o, 'ASC'] : o;
  });

  const primaryKeyOrder = normalized.find(
    ([field]) => field === primaryKeyField,
  );

  return primaryKeyOrder
    ? normalized
    : [...normalized, [primaryKeyField, 'ASC']];
};

const serializeCursor = (instance, order) => {
  const cursorObject = order.map(([field]) => instance[field]);

  return Buffer.from(JSON.stringify(cursorObject)).toString('base64');
};

const isValidCursor = (cursor, order) => {
  return cursor.length === order.length;
};

const recursivelyGetPaginationQuery = (order, cursor) => {
  const currentOp = order[0][1].toLowerCase() === 'desc' ? Op.lt : Op.gt;

  if (order.length === 1) {
    return {
      [order[0][0]]: {
        [currentOp]: cursor[0],
      },
    };
  } else {
    return {
      [Op.or]: [
        {
          [order[0][0]]: {
            [currentOp]: cursor[0],
          },
        },
        {
          [order[0][0]]: cursor[0],
          ...getPaginationQuery(order.slice(1), cursor.slice(1)),
        },
      ],
    };
  }
};

const getPaginationQuery = (order, cursor) => {
  if (!isValidCursor(cursor, order)) {
    return null;
  }

  return recursivelyGetPaginationQuery(order, cursor);
};

module.exports = {
  Op,
  parseCursor,
  serializeCursor,
  normalizeOrder,
  isValidCursor,
  getPaginationQuery,
};
