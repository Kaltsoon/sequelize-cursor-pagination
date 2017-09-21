const test = require('ava');
const path = require('path');
const Sequelize = require('sequelize');
const sequelize = new Sequelize('test', null, null, { dialect: 'sqlite', storage: path.join(__dirname, 'db.sqlite') });

const withPagination = require('../src');

const Test = sequelize.define('test', {
  id: { type:  Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
  counter: Sequelize.INTEGER,
});

withPagination()(Test);

function generateTestData() {
  return Promise.all([
    Test.create({ counter: 4, id: 1 }),
    Test.create({ counter: 4, id: 2 }),
    Test.create({ counter: 1, id: 3 }),
    Test.create({ counter: 3, id: 4 }),
    Test.create({ counter: 2, id: 5 }),
  ]);
}

test.beforeEach(t => sequelize.sync({ force: true }));

test('sets correct default method', t => {
  t.is(typeof Test.paginate === 'function', true);
});

test('paginates correctly when paginationField is primaryKeyField', async t => {
  const data = await generateTestData();

  let pagination = await Test.paginate({ limit: 2 });

  t.is(pagination.results[0].id, 1);
  t.is(pagination.results[1].id, 2);
  t.is(pagination.cursors.hasNext, true);
  t.is(pagination.cursors.hasPrevious, false);

  pagination = await Test.paginate({ limit: 2, after: pagination.cursors.after }); 
  
  t.is(pagination.results[0].id, 3);
  t.is(pagination.results[1].id, 4);
  t.is(pagination.cursors.hasNext, true);
  t.is(pagination.cursors.hasPrevious, true);

  pagination = await Test.paginate({ limit: 2, before: pagination.cursors.before }); 

  t.is(pagination.results[0].id, 1);
  t.is(pagination.results[1].id, 2);
});

test('paginates correctly when sort direction is descending', async t => {
  const data = await generateTestData();

  let pagination = await Test.paginate({ limit: 2, desc: true });
  
    t.is(pagination.results[0].id, 5);
    t.is(pagination.results[1].id, 4);
    t.is(pagination.cursors.hasNext, true);
    t.is(pagination.cursors.hasPrevious, false);
  
    pagination = await Test.paginate({ limit: 2, after: pagination.cursors.after, desc: true }); 
    
    t.is(pagination.results[0].id, 3);
    t.is(pagination.results[1].id, 2);
    t.is(pagination.cursors.hasNext, true);
    t.is(pagination.cursors.hasPrevious, true);
});

test('paginates correctly when paginationField is not the primaryKeyField', async t => {
  const data = await generateTestData();
  
    let pagination = await Test.paginate({ limit: 2, paginationField: 'counter' });
  
    t.is(pagination.results[0].counter, 1);
    t.is(pagination.results[1].counter, 2);
    t.is(pagination.cursors.hasNext, true);
    t.is(pagination.cursors.hasPrevious, false);
  
    pagination = await Test.paginate({ limit: 2, paginationField: 'counter', after: pagination.cursors.after }); 
    
    t.is(pagination.results[0].counter, 3);
    t.is(pagination.results[1].counter, 4);
    t.is(pagination.results[1].id, 1)
    t.is(pagination.cursors.hasNext, true);
    t.is(pagination.cursors.hasPrevious, true);

    pagination = await Test.paginate({ limit: 2, paginationField: 'counter', after: pagination.cursors.after }); 

    t.is(pagination.results[0].counter, 4);
    t.is(pagination.results[0].id, 2)
    t.is(pagination.cursors.hasNext, false);
    t.is(pagination.cursors.hasPrevious, true);    
});