const base64 = require('base-64');
const { Op } = require('sequelize');

function decodeCursor(cursor) {
  return cursor ? JSON.parse(base64.decode(cursor)) : null;
}

function encodeCursor(cursor) {
  return base64.encode(JSON.stringify(cursor));
}

function getPaginationQuery(cursor, cursorOrderOperator, paginationField, primaryKeyField) {
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

function withPagination({ methodName = 'paginate', primaryKeyField = 'id' } = {}) {
  return model => {
    const paginate = ({ where = {}, include = [], limit, before, after, desc = false, paginationField = primaryKeyField }) => {
      const decodedBefore = !!before ? decodeCursor(before) : null;
      const decodedAfter = !!after ? decodeCursor(after) : null;
      const cursorOrderIsDesc = before ? !desc : desc;
      const cursorOrderOperator = cursorOrderIsDesc ? Op.lt : Op.gt;
      const paginationFieldIsNonId = paginationField !== primaryKeyField;

      let paginationQuery;

      if (before) {
        paginationQuery = getPaginationQuery(decodedBefore, cursorOrderOperator, paginationField, primaryKeyField);
      } else if(after) {
        paginationQuery = getPaginationQuery(decodedAfter, cursorOrderOperator, paginationField, primaryKeyField);
      }

      const whereQuery = paginationQuery
        ? { [Op.and]: [paginationQuery, where] }
        : where;
  
      return model.findAll({
        where: whereQuery,
        include,
        limit: limit + 1,
        order: [
          cursorOrderIsDesc ? [paginationField, 'DESC'] : paginationField,
          ...(paginationFieldIsNonId ? [primaryKeyField] : []),
        ],
      }).then(results => {
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
            ? encodeCursor([results[0][paginationField], results[0][primaryKeyField]])
            : encodeCursor([results[0][paginationField]]);

          afterCursor = paginationFieldIsNonId
            ? encodeCursor([results[results.length - 1][paginationField], results[results.length - 1][primaryKeyField]])
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
  };
}

module.exports = withPagination;