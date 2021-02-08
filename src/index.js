const {
  Op,
  parseCursor,
  createCursor,
  normalizeOrder,
  getPaginationQuery,
  reverseOrder,
} = require('./utils');

const withPagination = (options = {}) => (Model) => {
  const { methodName = 'paginate', primaryKeyField = 'id' } = options;

  const paginate = async ({
    order: orderOption,
    where,
    after,
    before,
    limit,
    ...queryArgs
  } = {}) => {
    let order = normalizeOrder(orderOption, primaryKeyField);

    order = before ? reverseOrder(order) : order;

    const cursor = after
      ? parseCursor(after)
      : before
      ? parseCursor(before)
      : null;

    const paginationQuery = cursor ? getPaginationQuery(order, cursor) : null;

    const paginationWhere = paginationQuery
      ? { [Op.and]: [paginationQuery, where] }
      : where;

    const paginationQueryOptions = {
      where: paginationWhere,
      limit,
      order,
      ...queryArgs,
    };

    const totalCountQueryOptions = {
      where,
    };

    const cursorCountQueryOptions = {
      where: paginationWhere,
    };

    const [instances, totalCount, cursorCount] = await Promise.all([
      Model.findAll(paginationQueryOptions),
      Model.count(totalCountQueryOptions),
      Model.count(cursorCountQueryOptions),
    ]);

    if (before) {
      instances.reverse();
    }

    const remaining = cursorCount - instances.length;

    const hasNextPage =
      (!before && remaining > 0) ||
      (Boolean(before) && totalCount - cursorCount > 0);

    const hasPreviousPage =
      (Boolean(before) && remaining > 0) ||
      (!before && totalCount - cursorCount > 0);

    const edges = instances.map((node) => ({
      node,
      cursor: createCursor(node, order),
    }));

    const pageInfo = {
      hasNextPage,
      hasPreviousPage,
      startCursor: edges.length > 0 ? edges[0].cursor : null,
      endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
    };

    return {
      totalCount,
      edges,
      pageInfo,
    };
  };

  Model[methodName] = paginate;

  return Model;
};

module.exports = withPagination;
