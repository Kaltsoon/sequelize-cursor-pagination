import { sequelize, Counter } from './models';
import { OrderConfig } from '../types';
import makePaginate, { makePaginateLazy } from '../makePaginate';

const expectCorrectPageInfoCursors = (result: any) => {
  expect(typeof result.pageInfo.startCursor === 'string').toBe(true);
  expect(result.pageInfo.startCursor).toBe(result.edges[0].cursor);

  expect(typeof result.pageInfo.endCursor === 'string').toBe(true);

  expect(result.pageInfo.endCursor).toBe(
    result.edges[result.edges.length - 1].cursor,
  );
};

const expectIdsToEqual = (result: any, ids: any) => {
  expect(result.edges.map((edge: any) => edge.node.id)).toEqual(ids);
};

const generateTestData = () => {
  return Counter.bulkCreate([
    { counter: 4, id: 3, extra: 3 },
    { counter: 4, id: 2, extra: 4 },
    { counter: 1, id: 5, extra: 3 },
    { counter: 3, id: 1, extra: 4 },
    { counter: 2, id: 4, extra: 3 },
  ]);
};

Counter.paginate = makePaginate(Counter);
Counter.paginateLazy = makePaginateLazy(Counter);

describe('makePaginate', () => {
  beforeEach(async () => {
    jest.restoreAllMocks();
    await sequelize.sync({ force: true });
  });

  it('paginates correctly without static method', async () => {
    await generateTestData();

    const paginate = makePaginate(Counter);

    const result = await paginate({ limit: 2 });

    expectIdsToEqual(result, [1, 2]);
  });

  it('paginates correctly with after cursor', async () => {
    await generateTestData();

    let result = await Counter.paginate({ limit: 2 });

    expectIdsToEqual(result, [1, 2]);
    expect(result.pageInfo.hasNextPage).toBe(true);
    expect(result.pageInfo.hasPreviousPage).toBe(false);
    expectCorrectPageInfoCursors(result);
    expect(result.totalCount).toBe(5);

    result = await Counter.paginate({
      limit: 2,
      after: result.pageInfo.endCursor as string,
    });

    expectIdsToEqual(result, [3, 4]);
    expect(result.pageInfo.hasNextPage).toBe(true);
    expect(result.pageInfo.hasPreviousPage).toBe(true);
    expectCorrectPageInfoCursors(result);
    expect(result.totalCount).toBe(5);

    result = await Counter.paginate({
      limit: 2,
      after: result.pageInfo.endCursor as string,
    });

    expectIdsToEqual(result, [5]);
    expect(result.pageInfo.hasNextPage).toBe(false);
    expect(result.pageInfo.hasPreviousPage).toBe(true);
    expectCorrectPageInfoCursors(result);
    expect(result.totalCount).toBe(5);
  });

  it('paginates correctly with before cursor', async () => {
    await generateTestData();

    let result = await Counter.paginate({ limit: 2 });

    expectIdsToEqual(result, [1, 2]);

    result = await Counter.paginate({
      limit: 2,
      after: result.pageInfo.endCursor as string,
    });

    expectIdsToEqual(result, [3, 4]);

    result = await Counter.paginate({
      limit: 2,
      before: result.pageInfo.startCursor as string,
    });

    expectIdsToEqual(result, [1, 2]);
  });

  it('paginates correctly with simple order', async () => {
    await generateTestData();

    const order: OrderConfig = [['counter', 'ASC']];

    let result = await Counter.paginate({ order, limit: 3 });

    expectIdsToEqual(result, [5, 4, 1]);

    result = await Counter.paginate({
      order,
      limit: 3,
      after: result.pageInfo.endCursor as string,
    });

    expectIdsToEqual(result, [2, 3]);

    result = await Counter.paginate({
      order,
      limit: 3,
      before: result.pageInfo.startCursor as string,
    });

    expectIdsToEqual(result, [5, 4, 1]);
  });

  it('paginates correctly with complex order', async () => {
    await generateTestData();

    const order: OrderConfig = [
      ['counter', 'DESC'],
      ['extra', 'ASC'],
    ];

    let result = await Counter.paginate({
      order,
      limit: 3,
    });

    expectIdsToEqual(result, [3, 2, 1]);

    result = await Counter.paginate({
      order,
      limit: 3,
      after: result.pageInfo.endCursor as string,
    });

    expectIdsToEqual(result, [4, 5]);

    result = await Counter.paginate({
      order,
      limit: 3,
      before: result.pageInfo.startCursor as string,
    });

    expectIdsToEqual(result, [3, 2, 1]);
  });

  it('paginates correctly with where', async () => {
    await generateTestData();

    const order: OrderConfig = [['counter', 'ASC']];

    const result = await Counter.paginate({
      order,
      where: { extra: 3 },
      limit: 5,
    });

    expectIdsToEqual(result, [5, 4, 3]);
    expect(result.totalCount).toBe(3);
  });

  it('paginates correctly with different order formats', async () => {
    await generateTestData();

    let result = await Counter.paginate({
      order: [['counter']] as any,
      limit: 5,
    });

    expectIdsToEqual(result, [5, 4, 1, 2, 3]);

    result = await Counter.paginate({ order: [['counter', 'asc']], limit: 5 });

    expectIdsToEqual(result, [5, 4, 1, 2, 3]);

    result = await Counter.paginate({ order: [['counter', 'desc']], limit: 5 });

    expectIdsToEqual(result, [2, 3, 1, 4, 5]);
  });

  it('paginates correctly with a scope', async () => {
    await generateTestData();

    const order: OrderConfig = [['counter', 'ASC']];

    const result = await (
      Counter.scope({ method: ['extra', 3] }) as typeof Counter
    ).paginate({
      order,
      limit: 5,
    });

    expectIdsToEqual(result, [5, 4, 3]);
    expect(result.totalCount).toBe(3);
  });

  it('paginates correctly with group by', async () => {
    await generateTestData();

    const result = await Counter.paginate({ group: 'extra' });

    expectIdsToEqual(result, [1, 3]);
    expect(result.totalCount).toBe(2);
  });

  it('no unnecessary database queries are performed', async () => {
    jest.spyOn(Counter, 'findAll');
    jest.spyOn(Counter, 'count');

    await generateTestData();

    await Counter.paginate({ limit: 2 });

    expect(Counter.findAll).toHaveBeenCalledTimes(1);
    expect(Counter.count).toHaveBeenCalledTimes(2);
  });

  it('paginates correctly with attributes', async () => {
    await generateTestData();

    const paginate = makePaginate(Counter);

    const result = await paginate({ limit: 2, attributes: ['id', 'counter'] });
    const nodes = result.edges.map(({ node }) => node.dataValues);

    expect(nodes).toEqual([
      { id: 1, counter: 3 },
      { id: 2, counter: 4 },
    ]);
  });
});

describe('makeLazyPaginate', () => {
  beforeEach(async () => {
    jest.restoreAllMocks();
    await sequelize.sync({ force: true });
  });

  it('paginates correctly', async () => {
    await generateTestData();

    const connection = Counter.paginateLazy({ limit: 2 });
    const result = await Counter.paginate({ limit: 2 });

    const edges = await connection.getEdges();
    const pageInfo = await connection.getPageInfo();
    const totalCount = await connection.getTotalCount();

    expect(edges).toEqual(result.edges);
    expect(pageInfo).toEqual(result.pageInfo);
    expect(totalCount).toEqual(result.totalCount);
  });

  it('no unnecessary database queries are performed', async () => {
    jest.spyOn(Counter, 'findAll');
    jest.spyOn(Counter, 'count');

    await generateTestData();

    const connection = Counter.paginateLazy({ limit: 2 });

    await connection.getEdges();

    expect(Counter.findAll).toHaveBeenCalledTimes(1);
    expect(Counter.count).not.toHaveBeenCalled();

    await connection.getTotalCount();

    expect(Counter.findAll).toHaveBeenCalledTimes(1);
    expect(Counter.count).toHaveBeenCalledTimes(1);

    await connection.getPageInfo();

    expect(Counter.findAll).toHaveBeenCalledTimes(1);
    expect(Counter.count).toHaveBeenCalledTimes(2);

    await connection.getEdges();

    expect(Counter.findAll).toHaveBeenCalledTimes(1);
  });
});
