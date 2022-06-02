import { Model, FindOptions, Attributes } from 'sequelize';

export type OrderDirection = 'DESC' | 'ASC';

export type FieldOrderConfig = [string, OrderDirection];

export type OrderConfig = FieldOrderConfig[];

export type CursorPayload = any[];

export interface PaginationEdge<Node = any> {
  cursor: string;
  node: Node;
}

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}

export interface PaginationConnection<Node = any> {
  totalCount: number;
  edges: PaginationEdge<Node>[];
  pageInfo: PageInfo;
}

export interface MakePaginateOptions {
  primaryKeyField?: string | string[];
  omitPrimaryKeyFromOrder?: boolean;
}

export interface PaginateOptions<ModelType extends Model>
  extends FindOptions<Attributes<ModelType>> {
  after?: string;
  before?: string;
}
