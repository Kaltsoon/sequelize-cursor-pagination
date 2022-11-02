import { Op, ModelStatic, Model, WhereOptions } from 'sequelize';

import {
  parseCursor,
  createCursor,
  normalizeOrder,
  getPaginationQuery,
  reverseOrder,
  getPrimaryKeyFields,
  isModelClass,
  getCount,
} from './utils';

import {
  MakePaginateOptions,
  PaginateOptions,
  PaginationConnection,
} from './types';

const makePaginate = <ModelType extends Model>(
  model: ModelStatic<ModelType>,
  options?: MakePaginateOptions,
) => {
  const primaryKeyField =
    options?.primaryKeyField ?? getPrimaryKeyFields(model);

  const omitPrimaryKeyFromOrder = options?.omitPrimaryKeyFromOrder ?? false;

  async function paginate(
    this: unknown,
    queryOptions: PaginateOptions<ModelType>,
  ): Promise<PaginationConnection<ModelType>> {
    const modelClass: ModelStatic<ModelType> = isModelClass(this)
      ? this
      : model;

    const {
      order: orderOption,
      where,
      after,
      before,
      limit,
      ...restQueryOptions
    } = queryOptions;

    const normalizedOrder = normalizeOrder(
      orderOption,
      primaryKeyField,
      omitPrimaryKeyFromOrder,
    );

    const order = before ? reverseOrder(normalizedOrder) : normalizedOrder;

    const cursor = after
      ? parseCursor(after)
      : before
      ? parseCursor(before)
      : null;

    const paginationQuery = cursor ? getPaginationQuery(order, cursor) : null;

    const paginationWhere: WhereOptions | undefined = paginationQuery
      ? { [Op.and]: [paginationQuery, where] }
      : where;

    const paginationQueryOptions = {
      where: paginationWhere,
      limit,
      order,
      ...restQueryOptions,
    };

    const totalCountQueryOptions = {
      where,
      ...restQueryOptions,
    };

    const cursorCountQueryOptions = {
      where: paginationWhere,
      ...restQueryOptions,
    };

    const [instances, totalCount, cursorCount] = await Promise.all([
      modelClass.findAll(paginationQueryOptions),
      getCount(modelClass, totalCountQueryOptions),
      getCount(modelClass, cursorCountQueryOptions),
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
  }

  return paginate;
};

export default makePaginate;
