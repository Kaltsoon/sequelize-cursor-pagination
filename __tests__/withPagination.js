const path = require('path');
const Sequelize = require('sequelize');

const withPagination = require('../src');

const sequelize = new Sequelize('test', null, null, {
  dialect: 'sqlite',
  storage: path.join(__dirname, 'db.sqlite'),
  logging: false,
});

let Test;

const generateTestData = () => {
  return Promise.all([
    Test.create({ counter: 4, id: 3, extra: 3 }),
    Test.create({ counter: 4, id: 2, extra: 4 }),
    Test.create({ counter: 1, id: 5, extra: 3 }),
    Test.create({ counter: 3, id: 1, extra: 4 }),
    Test.create({ counter: 2, id: 4, extra: 3 }),
  ]);
};

beforeEach(async () => {
  Test = sequelize.define('test', {
    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    counter: Sequelize.INTEGER,
    extra: Sequelize.INTEGER,
  });

  withPagination()(Test);

  await sequelize.sync({ force: true });
});

const expectCorrectPageInfoCursors = (result) => {
  expect(typeof result.pageInfo.startCursor === 'string').toBe(true);
  expect(result.pageInfo.startCursor).toBe(result.edges[0].cursor);

  expect(typeof result.pageInfo.endCursor === 'string').toBe(true);

  expect(result.pageInfo.endCursor).toBe(
    result.edges[result.edges.length - 1].cursor,
  );
};

const expectIdsToEqual = (result, ids) => {
  expect(result.edges.map(({ node }) => node.id)).toEqual(ids);
};

test('sets correct default method', () => {
  expect(typeof Test.paginate === 'function').toBe(true);
});

test('sets correct method when methodName is provided', () => {
  withPagination({ methodName: 'myPaginate' })(Test);

  expect(typeof Test.myPaginate === 'function').toBe(true);
});

test('paginates correctly with cursor', async () => {
  await generateTestData();

  let result = await Test.paginate({ limit: 2 });

  expectIdsToEqual(result, [1, 2]);
  expect(result.pageInfo.hasNextPage).toBe(true);
  expectCorrectPageInfoCursors(result);

  result = await Test.paginate({
    limit: 2,
    after: result.pageInfo.endCursor,
  });

  expectIdsToEqual(result, [3, 4]);
  expect(result.pageInfo.hasNextPage).toBe(true);
  expectCorrectPageInfoCursors(result);

  result = await Test.paginate({
    limit: 2,
    after: result.pageInfo.endCursor,
  });

  expectIdsToEqual(result, [5]);
  expect(result.pageInfo.hasNextPage).toBe(false);
  expectCorrectPageInfoCursors(result);
});

test('paginates correctly with simple order', async () => {
  await generateTestData();

  const order = [['counter', 'asc']];

  let result = await Test.paginate({ order, limit: 3 });

  expectIdsToEqual(result, [5, 4, 1]);

  result = await Test.paginate({
    order,
    limit: 3,
    after: result.pageInfo.endCursor,
  });

  expectIdsToEqual(result, [2, 3]);
});

test('paginates correctly with complex order', async () => {
  await generateTestData();

  const order = [
    ['counter', 'desc'],
    ['extra', 'asc'],
  ];

  let result = await Test.paginate({
    order,
    limit: 3,
  });

  expectIdsToEqual(result, [3, 2, 1]);

  result = await Test.paginate({
    order,
    limit: 3,
    after: result.pageInfo.endCursor,
  });

  expectIdsToEqual(result, [4, 5]);
});

test('paginates correctly with where', async () => {
  await generateTestData();

  const order = [['counter', 'asc']];

  let result = await Test.paginate({ order, where: { extra: 3 }, limit: 5 });

  expectIdsToEqual(result, [5, 4, 3]);
});

test('paginates correctly with different order formats', async () => {
  await generateTestData();

  let result = await Test.paginate({ order: [['counter']], limit: 5 });

  expectIdsToEqual(result, [5, 4, 1, 2, 3]);

  result = await Test.paginate({ order: [['counter', 'asc']], limit: 5 });

  expectIdsToEqual(result, [5, 4, 1, 2, 3]);

  result = await Test.paginate({ order: [['counter', 'desc']], limit: 5 });

  expectIdsToEqual(result, [2, 3, 1, 4, 5]);
});
