const base64 = require('base-64');

function decodeCursor(cursor) {
  return cursor ? JSON.parse(base64.decode(cursor)) : null;
}

function encodeCursor(cursor) {
  return base64.encode(JSON.stringify(cursor));
}

function getPaginationQuery(cursor, cursorOrderOperator, paginationField, primaryKeyField) {
  if (paginationField !== primaryKeyField) {
    return {
      $or: [
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
      const cursorOrderOperator = cursorOrderIsDesc ? '$lt' : '$gt';
      const paginationFieldIsNonId = paginationField !== primaryKeyField;

      let paginationQuery;

      if (before) {
        paginationQuery = getPaginationQuery(decodedBefore, cursorOrderOperator, paginationField, primaryKeyField);
      } else if(after) {
        paginationQuery = getPaginationQuery(decodedAfter, cursorOrderOperator, paginationField, primaryKeyField);
      }

      const whereQuery = paginationQuery
        ? { $and: [paginationQuery, where] }
        : where;
  
      return model.findAll({
        where: whereQuery,
        include,
        limit: limit + 1,
        order: [
          cursorOrderIsDesc ? [paginationField, 'DESC'] : paginationField,
          ...(paginationFieldIsNonId ? [primaryKeyField] : []),
        ],
      }).then(result => {
        const hasMore = result.length > limit;
  
        if (hasMore) {
          result.pop();
        }

        if (before) {
          result.reverse();
        }
  
        const hasNext = !!before || hasMore;
        const hasPrevious = !!after || (!!before && hasMore);

        let beforeCursor = null;
        let afterCursor = null;

        if (result.length > 0) {
          beforeCursor = paginationFieldIsNonId 
            ? encodeCursor([result[0][paginationField], result[0][primaryKeyField]])
            : encodeCursor([result[0][paginationField]]);

          afterCursor = paginationFieldIsNonId
            ? encodeCursor([result[result.length - 1][paginationField], result[result.length - 1][primaryKeyField]])
            : encodeCursor([result[result.length - 1][paginationField]]);
        }

        return {
          result,
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