const {
  Op,
  parseCursor,
  serializeCursor,
  normalizeOrder,
  getPaginationQuery,
} = require('./utils');

const withPagination = (options = {}) => (Model) => {
  const { methodName = 'paginate', primaryKeyField = 'id' } = options;

  const paginate = async ({
    order = [],
    where = {},
    after,
    limit,
    afterCursor,
    ...queryArgs
  } = {}) => {
    const normalizedOrder = normalizeOrder(order, primaryKeyField);

    const parsedAfter = Boolean(after)
      ? parseCursor(after, normalizedOrder)
      : null;

    const paginationQuery = parsedAfter
      ? getPaginationQuery(normalizedOrder, parsedAfter)
      : null;

    const whereQuery = paginationQuery
      ? { [Op.and]: [paginationQuery, where] }
      : where;

    const [results, totalCount] = await Promise.all([
      Model.findAll({
        where: whereQuery,
        ...(limit && { limit: limit + 1 }),
        order: normalizedOrder,
        ...queryArgs,
      }),
      Model.count({
        where,
      }),
    ]);

    const hasNextPage = results.length > limit;

    if (hasNextPage) {
      results.pop();
    }

    const edges = results.map((node) => ({
      node,
      cursor: serializeCursor(node, normalizedOrder),
    }));

    const pageInfo = {
      hasNextPage,
      startCursor: edges.length > 0 ? edges[0].cursor : null,
      endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
      totalCount,
    };

    return {
      edges,
      pageInfo,
    };
  };

  Model[methodName] = paginate;

  return Model;
};

module.exports = withPagination;
