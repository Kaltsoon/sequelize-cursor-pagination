![npm](https://img.shields.io/npm/v/sequelize-cursor-pagination) ![Build status](https://github.com/Kaltsoon/sequelize-cursor-pagination/workflows/CI/badge.svg)

# Sequelize Cursor Pagination

Sequelize model decorator which provides cursor-based pagination queries. [Some motivation and background](https://dev-blog.apollodata.com/understanding-pagination-rest-graphql-and-relay-b10f835549e7).

## Install

With npm:

```bash
npm install sequelize-cursor-pagination
```

Or with Yarn:

```bash
yarn add sequelize-cursor-pagination
```

## How to use?

Define a Sequelize model and decorate it with the `withPagination` decorator:

```javascript
// ...

const withPagination = require('sequelize-cursor-pagination');

const Counter = sequelize.define('counter', {
  id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
  value: Sequelize.INTEGER,
});

const options = {
  methodName: 'paginate',
  primaryKeyField: 'id',
};

withPagination(options)(Counter);
```

The `withPagination` function has the following options:

- `methodName`: The name of the pagination method. The default value is `paginate`.
- `primaryKeyField`: The primary key field of the model. The default value is `id`.

Call the `paginate` (the default method name) method:

```javascript
const result = await Counter.paginate({
  where: { value: { [Op.gt]: 2 } },
  limit: 10,
});
```

The `paginate` method returns a promise, which resolves an object with the following properties:

- `edges`: An array containing the results of the query. Each item in the array contains an object with the following properties:
  - `node`: The model instance
  - `cursor`: Cursor for the model instance
- `totalCount`: The total numbers rows matching the query
- `pageInfo`: An object containing the pagination related data with the following properties:
  - `startCursor`: The cursor for the first node in the result edges
  - `endCursor`: The cursor for the last node in the result edges
  - `hasNextPage`: A boolean that indicates whether there are edges _after_ the `endCursor` (`false` indicates that there are no more edges after the `endCursor`)
  - `hasPreviousPage`: A boolean that indicates whether there are edges _before_ the `startCursor` (`false` indicates that there are no more edges before the `startCursor`)

The `paginate` method has the following options:

- `after`: The cursor that indicates _after_ which edge the next set of edges should be fetched
- `before`: The cursor that indicates _before_ which edge next set of edges should be fetched
- `limit`: The maximum number of edges returned

Other options passed to the `paginate` method will be directly passed to the model's `findAll` method.

**⚠️ NB:** The `order` option format only supports the `['field']` and `['field', 'DESC']` variations (field name and the optional order direction). For example, ordering by an associated model's field won't work.

## Examples

The examples use the `Counter` model defined above.

Fetch the first `20` edges ordered by the `id` field (the `primaryKeyField` field) in ascending order:

```javascript
const result = await Counter.paginate({
  limit: 20,
});
```

First, fetch the first `10` edges ordered by the `value` field in a descending order. Second, fetch the first `10` edges after the `endCursor`. Third, fetch the last `10` edges before `startCursor`:

```javascript
const firstResult = await Counter.paginate({
  order: [['value', 'DESC']],
  limit: 10,
});

const secondResult = await Counter.paginate({
  order: [['value', 'DESC']],
  limit: 10,
  after: firstResult.pageInfo.endCursor,
});

const thirdResult = await Counter.paginate({
  order: [['value', 'DESC']],
  limit: 10,
  before: secondResult.pageInfo.startCursor,
});
```

## Running tests

```
npm run test
```
