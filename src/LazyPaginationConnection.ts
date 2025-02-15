import { PaginationEdge } from './types';

interface LazyPaginationConnectionOptions<Node = any> {
  getEdgesPromise: () => Promise<PaginationEdge<Node>[]>;
  getCursorCountPromise: () => Promise<number>;
  getTotalCountPromise: () => Promise<number>;
  isBefore: boolean;
}

class CachedPromise<T> {
  #promiseGetter: () => Promise<T>;
  #cachedPromise: Promise<T> | undefined;

  constructor(promiseGetter: () => Promise<T>) {
    this.#promiseGetter = promiseGetter;
  }

  public get(): Promise<T> {
    if (this.#cachedPromise) {
      return this.#cachedPromise;
    }

    this.#cachedPromise = this.#promiseGetter();

    return this.#cachedPromise;
  }
}

export default class LazyPaginationConnection<Node = any> {
  #edgesCachedPromise: CachedPromise<PaginationEdge<Node>[]>;
  #cursorCountCachedPromise: CachedPromise<number>;
  #totalCountCachedPromise: CachedPromise<number>;
  #isBefore: boolean;

  constructor(options: LazyPaginationConnectionOptions<Node>) {
    this.#edgesCachedPromise = new CachedPromise(options.getEdgesPromise);
    this.#cursorCountCachedPromise = new CachedPromise(
      options.getCursorCountPromise,
    );
    this.#totalCountCachedPromise = new CachedPromise(
      options.getTotalCountPromise,
    );
    this.#isBefore = options.isBefore;
  }

  async getEdges(): Promise<PaginationEdge<Node>[]> {
    return this.#edgesCachedPromise.get();
  }

  async getTotalCount(): Promise<number> {
    return this.#totalCountCachedPromise.get();
  }

  async getPageInfo() {
    const [edges, totalCount, cursorCount] = await Promise.all([
      this.getEdges(),
      this.getTotalCount(),
      this.#getCursorCount(),
    ]);

    const remaining = cursorCount - edges.length;

    const hasNextPage =
      (!this.#isBefore && remaining > 0) ||
      (this.#isBefore && totalCount - cursorCount > 0);

    const hasPreviousPage =
      (this.#isBefore && remaining > 0) ||
      (!this.#isBefore && totalCount - cursorCount > 0);

    return {
      hasNextPage,
      hasPreviousPage,
      startCursor: edges.length > 0 ? edges[0].cursor : null,
      endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
    };
  }

  async #getCursorCount(): Promise<number> {
    return this.#cursorCountCachedPromise.get();
  }
}
