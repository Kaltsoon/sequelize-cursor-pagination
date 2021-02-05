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
    ...queryArgs
  } = {}) => {
    const normalizedOrder = normalizeOrder(order, primaryKeyField);

    const parsedAfter = after ? parseCursor(after, normalizedOrder) : null;

    const paginationQuery = parsedAfter
      ? getPaginationQuery(normalizedOrder, parsedAfter)
      : null;

    const whereQuery = paginationQuery
      ? { [Op.and]: [paginationQuery, where] }
      : where;

    const results = await Model.findAll({
      where: whereQuery,
      ...(limit && { limit: limit + 1 }),
      order: normalizedOrder,
      ...queryArgs,
    });

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
