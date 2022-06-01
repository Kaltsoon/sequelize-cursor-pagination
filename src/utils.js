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
        const directionValueIndex = o.length - 1;
        o[directionValueIndex] = o[directionValueIndex] || 'ASC';

        return o;
      }

      return o;
    });
  }

  return omitPrimaryKeyFromOrder
    ? normalized
    : ensurePrimaryKeyFieldInOrder(normalized, normalizedPrimaryKeyField);
};

const reverseOrder = (order) => {
  return order.map((orderItem) => {
    orderItem[orderItem.length - 1] =
      orderItem[orderItem.length - 1].toLowerCase() === 'desc' ? 'ASC' : 'DESC';
    return orderItem;
  });
};

const serializeCursor = (payload) => {
  return Buffer.from(JSON.stringify(payload)).toString('base64');
};

const createCursor = (instance, order) => {
  // order
  // const fields
  const payload = order.map((orderItem) => {
    let field;
    if (typeof orderItem[0] == 'object') {
      return instance[orderItem[0]['as']][orderItem[1]];
    } else {
      field = orderItem[0];
    }

    return instance[field];
  });

  return serializeCursor(payload);
};

const isValidCursor = (cursor, order) => {
  return cursor.length === order.length;
};

const recursivelyGetPaginationQuery = (order, cursor) => {
  const directionValueIndex = order[0].length - 1;
  const currentOp =
    order[0][directionValueIndex].toLowerCase() === 'desc' ? Op.lt : Op.gt;

  // supporting only below format
  // [
  //   { model: Task, as: 'Task' },
  //   { model: Project, as: 'Project' },
  //   'createdAt',
  //   'DESC',
  // ];

  const _generateColunName = (order) => {
    // check if we have json object

    if (typeof order[0][0] === 'object') {
      const name = `${order[0][0]['as']}.${order[0][1]}`;
      return '$' + name + `$`;
    } else {
      return order[0][0];
    }
  };

  if (order.length === 1) {
    const key = _generateColunName(order);

    return {
      [key]: {
        [currentOp]: cursor[0],
      },
    };
  } else {
    const key = _generateColunName(order);

    return {
      [Op.or]: [
        {
          [key]: {
            [currentOp]: cursor[0],
          },
        },
        {
          [key]: cursor[0],
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
