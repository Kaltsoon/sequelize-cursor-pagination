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

import LazyPaginationConnection from './LazyPaginationConnection';

import {
  MakePaginateOptions,
  PaginateOptions,
  PaginationConnection,
} from './types';

function getLazyPaginationConnection<ModelType extends Model>(
  modelClass: ModelStatic<ModelType>,
  paginateOptions: PaginateOptions<ModelType>,
  makePaginateOptions?: MakePaginateOptions,
) {
  const primaryKeyField =
    makePaginateOptions?.primaryKeyField ?? getPrimaryKeyFields(modelClass);

  const omitPrimaryKeyFromOrder =
    makePaginateOptions?.omitPrimaryKeyFromOrder ?? false;

  const {
    order: orderOption,
    where,
    after,
    before,
    limit,
    ...restQueryOptions
  } = paginateOptions;

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

  return new LazyPaginationConnection({
    getEdgesPromise: async () => {
      const instances = await modelClass.findAll(paginationQueryOptions);

      if (before) {
        instances.reverse();
      }

      return instances.map((node) => ({
        node,
        cursor: createCursor(node, order),
      }));
    },
    getTotalCountPromise: () => getCount(modelClass, totalCountQueryOptions),
    getCursorCountPromise: () => getCount(modelClass, cursorCountQueryOptions),
    isBefore: Boolean(before),
  });
}

const makePaginate = <ModelType extends Model>(
  model: ModelStatic<ModelType>,
  makePaginateOptions?: MakePaginateOptions,
) => {
  async function paginate(
    this: unknown,
    paginateOptions: PaginateOptions<ModelType>,
  ): Promise<PaginationConnection<ModelType>> {
    const modelClass: ModelStatic<ModelType> = isModelClass(this)
      ? this
      : model;

    const connection = getLazyPaginationConnection(
      modelClass,
      paginateOptions,
      makePaginateOptions,
    );

    const [edges, totalCount, pageInfo] = await Promise.all([
      connection.getEdges(),
      connection.getTotalCount(),
      connection.getPageInfo(),
    ]);

    return {
      totalCount,
      edges,
      pageInfo,
    };
  }

  return paginate;
};

export function makePaginateLazy<ModelType extends Model>(
  model: ModelStatic<ModelType>,
  makePaginateOptions?: MakePaginateOptions,
) {
  function paginateLazy(
    this: unknown,
    paginateOptions: PaginateOptions<ModelType>,
  ) {
    const modelClass: ModelStatic<ModelType> = isModelClass(this)
      ? this
      : model;

    return getLazyPaginationConnection(
      modelClass,
      paginateOptions,
      makePaginateOptions,
    );
  }

  return paginateLazy;
}

export default makePaginate;
