import { Counter } from './models';
import { getPrimaryKeyFields, normalizeOrder } from '../utils';

describe('utils', () => {
  describe('normalizeOrder', () => {
    it('returns correct order with missing order', () => {
      expect(normalizeOrder(undefined, 'pk', false)).toMatchSnapshot();
    });

    it('returns correct order when primary key is omitted', () => {
      expect(
        normalizeOrder([['createdAt', 'DESC']], 'pk', true),
      ).toMatchSnapshot();
    });

    it('returns correct order with primary key in order', () => {
      expect(normalizeOrder([['pk', 'DESC']], 'pk', false)).toMatchSnapshot();
    });

    it('returns correct order with composite primary key', () => {
      expect(
        normalizeOrder([['a', 'DESC']], ['pk1', 'pk2'], false),
      ).toMatchSnapshot();
    });

    it('returns correct order with different orders', () => {
      expect(normalizeOrder(['a'], 'pk', false)).toMatchSnapshot();

      expect(
        normalizeOrder(
          [
            ['a', 'DESC'],
            ['b', 'ASC'],
          ],
          'pk',
          false,
        ),
      ).toMatchSnapshot();
    });

    it('returns correct order with different orders with nulls first', () => {
      expect(normalizeOrder(['a'], 'pk', false)).toMatchSnapshot();

      expect(
        normalizeOrder(
          [
            ['a', 'DESC NULLS FIRST'],
            ['b', 'ASC'],
          ],
          'pk',
          false,
        ),
      ).toMatchSnapshot();
    });
  });

  describe('getPrimaryKeyFields', () => {
    test('returns correct primary key fields', () => {
      expect(getPrimaryKeyFields(Counter)).toEqual(['id']);
    });
  });
});
