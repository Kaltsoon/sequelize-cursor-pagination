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

const normalizePrimaryKeyField = (primaryKeyField) => {
  return Array.isArray(primaryKeyField) ? primaryKeyField : [primaryKeyField];
};

const ensurePrimaryKeyFieldInOrder = (order, primaryKeyField) => {
  const missingPrimaryKeyFields = primaryKeyField.filter(
    (pkField) => !order.find(([field]) => field === pkField),
  );

  return [...order, ...missingPrimaryKeyFields.map((field) => [field, 'ASC'])];
};

const normalizeOrder = (order, primaryKeyField, omitPrimaryKeyFromOrder) => {
  const normalizedPrimaryKeyField = normalizePrimaryKeyField(primaryKeyField);

  let normalized = [];

  if (Array.isArray(order)) {
    normalized = order.map((o) => {
      if (typeof o === 'string') {
        return [o, 'ASC'];
      }

      if (Array.isArray(o)) {
        const [field, direction] = o;

        return [field, direction || 'ASC'];
      }

      return o;
    });
  }

  return omitPrimaryKeyFromOrder
    ? normalized
    : ensurePrimaryKeyFieldInOrder(normalized, normalizedPrimaryKeyField);
};

const reverseOrder = (order) => {
  return order.map(([field, direction]) => [
    field,
    direction.toLowerCase() === 'desc' ? 'ASC' : 'DESC',
  ]);
};

const serializeCursor = (payload) => {
  return Buffer.from(JSON.stringify(payload)).toString('base64');
};

const createCursor = (instance, order) => {
  const payload = order.map(([field]) => instance[field]);

  return serializeCursor(payload);
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
          ...recursivelyGetPaginationQuery(order.slice(1), cursor.slice(1)),
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
  createCursor,
  reverseOrder,
};
