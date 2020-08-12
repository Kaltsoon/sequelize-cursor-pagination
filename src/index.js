'use strict';

let { Op } = require('sequelize');

if (!Op) {
  // Support older versions of sequelize
  Op = {
    and: '$and',
    or: '$or',
    lt: '$lt',
    gt: '$gt',
  };
}

function encodeCursor(cursor) {
  return cursor ? Buffer.from(JSON.stringify(cursor)).toString('base64') : null;
}

function decodeCursor(cursor) {
  return cursor
    ? JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'))
    : null;
}

function getPaginationQuery(
  cursor,
  cursorOrderOperator,
  paginationField,
  primaryKeyField,
) {
  if (paginationField !== primaryKeyField) {
    return {
      [Op.or]: [
        {
          [paginationField]: {
            [cursorOrderOperator]: cursor[0],
          },
        },
        {
          [paginationField]: cursor[0],
          [primaryKeyField]: {
            [cursorOrderOperator]: cursor[1],
          },
        },
      ],
    };
  } else {
    return {
      [paginationField]: {
        [cursorOrderOperator]: cursor[0],
      },
    };
  }
}

function withPagination({
  methodName = 'paginate',
  primaryKeyField = 'id',
} = {}) {
  return model => {
    const paginate = ({
      order: extraOrder,
      where = {},
      attributes = [],
      include = [],
      limit,
      before,
      after,
      desc = false,
      // [model, field, direction]
      // [ 'order', 'order_number', 'DESC' ]
      associatedModelPagination = [],
      paginationField = primaryKeyField,
      raw = false,
      paranoid = true,
      nest = false,
      mapToModel = false,
      subQuery,
      ...queryArgs
    } = {}) => {
      const decodedBefore = !!before ? decodeCursor(before) : null;
      const decodedAfter = !!after ? decodeCursor(after) : null;
      const cursorOrderIsDesc = before ? !desc : desc;
      const cursorOrderOperator = cursorOrderIsDesc ? Op.lt : Op.gt;
      const paginationFieldIsNonId = paginationField !== primaryKeyField;
      const sortDirection = desc ? 'DESC' : 'ASC';

      let paginationQuery;

      if (before) {
        paginationQuery = getPaginationQuery(
          decodedBefore,
          cursorOrderOperator,
          paginationField,
          primaryKeyField,
        );
      } else if (after) {
        paginationQuery = getPaginationQuery(
          decodedAfter,
          cursorOrderOperator,
          paginationField,
          primaryKeyField,
        );
      }

      const whereQuery = paginationQuery
        ? { [Op.and]: [paginationQuery, where] }
        : where;

      let order = [
        cursorOrderIsDesc
          ? [paginationField, sortDirection]
          : [paginationField],
      ];
      if (associatedModelPagination.length) {
        order = [[...associatedModelPagination]];
      }

      if (extraOrder) {
        order.push([extraOrder]);
      }

      if (paginationFieldIsNonId) {
        order.push([primaryKeyField, sortDirection]);
      }

      console.log('order', order);

      return model
        .findAll({
          where: whereQuery,
          include,
          ...(limit && { limit: limit + 1 }),
          order,
          ...(Array.isArray(attributes) && attributes.length
            ? { attributes }
            : {}),
          raw,
          paranoid,
          nest,
          mapToModel,
          ...(typeof subQuery === 'boolean' && { subQuery }),
          ...queryArgs,
        })
        .then(results => {
          const hasMore = results.length > limit;

          if (hasMore) {
            results.pop();
          }

          if (before) {
            results.reverse();
          }

          const hasNext = !!before || hasMore;
          const hasPrevious = !!after || (!!before && hasMore);

          let beforeCursor = null;
          let afterCursor = null;

          if (results.length > 0) {
            beforeCursor = paginationFieldIsNonId
              ? encodeCursor([
                  results[0][paginationField],
                  results[0][primaryKeyField],
                ])
              : encodeCursor([results[0][paginationField]]);

            afterCursor = paginationFieldIsNonId
              ? encodeCursor([
                  results[results.length - 1][paginationField],
                  results[results.length - 1][primaryKeyField],
                ])
              : encodeCursor([results[results.length - 1][paginationField]]);
          }

          return {
            results,
            cursors: {
              hasNext,
              hasPrevious,
              before: beforeCursor,
              after: afterCursor,
            },
          };
        });
    };

    model[methodName] = paginate;
    return model;
  };
}

module.exports = withPagination;
