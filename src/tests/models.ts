import {
  Sequelize,
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from 'sequelize';

import { PaginateOptions, PaginationConnection } from '../types';

export const sequelize = new Sequelize('sqlite::memory:');

export class Counter extends Model<
  InferAttributes<Counter>,
  InferCreationAttributes<Counter>
> {
  declare id: CreationOptional<number>;
  declare counter: number;
  declare extra: number;

  declare static paginate: (
    options: PaginateOptions<Counter>,
  ) => Promise<PaginationConnection<Counter>>;
}

Counter.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    counter: { type: DataTypes.INTEGER },
    extra: { type: DataTypes.INTEGER },
  },
  { tableName: 'counters', sequelize },
);
