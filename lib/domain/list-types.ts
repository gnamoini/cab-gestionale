/** Opaque cursor transport — concrete shape owned by mapper/RPC (PR-1). */
export type ListCursor = Readonly<Record<string, unknown>>;

/** Cache page unit — immutable, serializable. */
export type Page<T> = Readonly<{
  rows: readonly T[];
  pageInfo: Readonly<{
    hasNextPage: boolean;
    nextCursor: ListCursor | null;
    totalEstimate: number | null;
    meta?: Readonly<Record<string, unknown>>;
  }>;
}>;

/** Flat row array — hook-owned via flattenPages(); exposed as ListQueryResult.data */
export type List<T> = readonly T[];

/** Observability-only — NOT authoritative for UI control (R-13b). */
export type ListQueryMeta = Readonly<{
  pagesCount: number;
}>;

/** RQ control surface — effects only. */
export type ListQueryControls = Readonly<{
  fetchNextPage: () => void;
}>;

/** Light derived projection — NOT SSOT, NOT store. */
export type ListQueryResult<T> = Readonly<{
  data: List<T>;
  meta: ListQueryMeta;
  controls: ListQueryControls;
  /** RQ passthrough — authoritative for UI pagination (R-13c). */
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  /** RQ lifecycle passthrough — same layer as isLoading, not meta. */
  isLoading: boolean;
  isPending: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  dataUpdatedAt: number;
  refetch: () => Promise<unknown>;
}>;
