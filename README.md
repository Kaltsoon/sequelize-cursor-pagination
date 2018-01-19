# Sequelize Cursor Paginate

Sequelize model decorator which provides cursor based pagination queries. [Some motivation and background](https://dev-blog.apollodata.com/understanding-pagination-rest-graphql-and-relay-b10f835549e7).

Forked from [here](https://github.com/Kaltsoon/sequelize-cursor-pagination), improves attributes usage to allow for `include` and `exclude`.

## Install

```
npm install sequelize-cursor-paginate
```

## How to use

Define a sequelize model:

```javascript
// ...
const withPagination = require('sequelize-cursor-pagination');

const Counter = sequelize.define('counter', {
  id: { type:  Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
  value: Sequelize.INTEGER,
});

const options = {
  methodName: 'paginate',
  primaryKey: 'id',
};

withPagination(options)(Counter);
```

The ``withPagination`` function has the following options:

* **methodName**, the name of the pagination method. The default value is `paginate`.
* **primaryKey**, the primary key field of the model. The default value is `id`.

Call the `paginate` (default method name) method:

```javascript
// ...
Counter.paginate({ 
  where: { value: { $gt: 2 } },
  limit: 10,
});
```

The ``paginate`` method returns an object with following properties:

* **results**, the results of the query
* **cursors**, object containing the cursors' related data
  * **cursors.before**, the first record in the result serialized
  * **cursors.after**, the last record in the result serialized
  * **cursors.hasNext**, `true` or `false` depending on whether there are records after the `after` cursor
  * **cursors.hasPrevious**, `true` or `false` depending on whether there are records before the `before` cursor

The ``paginate`` method has the following options:

* **where**, the query applied to [findAll](http://docs.sequelizejs.com/manual/tutorial/models-usage.html#-findall-search-for-multiple-elements-in-the-database) call
* **include**, applied to ``findAll`` for [eager loading](http://docs.sequelizejs.com/manual/tutorial/models-usage.html#eager-loading)
* **attributes**, applied to ``findAll`` for [filtering returned fields](http://docs.sequelizejs.com/manual/tutorial/querying.html#attributes) or adding additional fields
* **limit**, limit the number of records returned
* **desc**, whether to sort in descending order. The default value is ``false``.
* **before**, the before cursor
* **after**, the after curosr
* **paginationField**, the field to be used for the pagination. The default value is the `primaryKeyField` option value.  

## Run tests

```
yarn test
```
