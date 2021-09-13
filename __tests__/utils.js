const { normalizeOrder } = require('../src/utils');

describe('normalizeOrder', () => {
  test('returns correct order with missing order', () => {
    expect(normalizeOrder(undefined, 'pk')).toMatchSnapshot();
  });

  test('returns correct order with primary key in order', () => {
    expect(normalizeOrder([['pk', 'DESC']], 'pk')).toMatchSnapshot();
  });

  test('returns correct order with composite primary key', () => {
    expect(normalizeOrder([['a', 'DESC']], ['pk1', 'pk2'])).toMatchSnapshot();
  });

  test('returns correct order with different orders', () => {
    expect(normalizeOrder(['a'], 'pk')).toMatchSnapshot();

    expect(
      normalizeOrder(
        [
          ['a', 'DESC'],
          ['b', 'ASC'],
        ],
        'pk',
      ),
    ).toMatchSnapshot();
  });
});
