# Sequelize Cursor Pagination

[![Build Status](https://travis-ci.org/Kaltsoon/sequelize-cursor-pagination.svg?branch=master)](https://travis-ci.org/Kaltsoon/sequelize-cursor-pagination)

Sequelize model decorator which provides cursor based pagination queries. [Some motivation and background](https://dev-blog.apollodata.com/understanding-pagination-rest-graphql-and-relay-b10f835549e7).

## Install

```
yarn add sequelize-cursor-pagination
```

## How to use

Define a sequelize model:

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

- **methodName**, the name of the pagination method. The default value is `paginate`.
- **primaryKeyField**, the primary key field of the model. The default value is `id`.

Call the `paginate` (default method name) method:

```javascript
// ...
Counter.paginate({
  where: { value: { $gt: 2 } },
  limit: 10,
});
```

The `paginate` method returns an object with following properties:

- **results**, the results of the query
- **cursors**, object containing the cursors' related data
  - **cursors.before**, the first record in the result serialized
  - **cursors.after**, the last record in the result serialized
  - **cursors.hasNext**, `true` or `false` depending on whether there are records after the `after` cursor
  - **cursors.hasPrevious**, `true` or `false` depending on whether there are records before the `before` cursor

The `paginate` method has the following options:

- **where**, the query applied to [findAll](http://docs.sequelizejs.com/manual/tutorial/models-usage.html#-findall-search-for-multiple-elements-in-the-database) call
- **attributes**, the query applied to [findAll](http://docs.sequelizejs.com/manual/tutorial/models-usage.html#-findall-search-for-multiple-elements-in-the-database) and select only some [attributes](http://docs.sequelizejs.com/manual/tutorial/querying.html#attributes)
- **include**, applied to `findAll` for [eager loading](http://docs.sequelizejs.com/manual/tutorial/models-usage.html#eager-loading)
- **limit**, limit the number of records returned
- **order**, Custom ordering attributes,
- **desc**, whether to sort in descending order. The default value is `false`.
- **before**, the before cursor
- **after**, the after cursor
- **paginationField**, the field to be used for the pagination. The default value is the `primaryKeyField` option value.
- **raw**, whether the query will return Sequelize Models or raw data. The default is `false`.
- **paranoid**, whether the query will return deleted models if the model is set to `paranoid: true`. The default is `true`.

Other options passed to the `paginate` method will be directly passed to the model's `findAll` method. Use them at your own risk.

## Run tests

```
yarn test
```
