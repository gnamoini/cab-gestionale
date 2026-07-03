import type { InfiniteData, UseInfiniteQueryResult } from "@tanstack/react-query";
import type { Page } from "@/lib/domain/list-types";

/** Observability-only — never UI render path (PR-2). */
export type InfiniteListMetaDiagnostic = Readonly<{
  pagesCount: number;
  rowCount: number;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  dataUpdatedAt: number;
  status: string;
}>;

export function getInfiniteListMeta<T>(
  query: Pick<
    UseInfiniteQueryResult<InfiniteData<Page<T>>, Error>,
    "data" | "hasNextPage" | "isFetchingNextPage" | "dataUpdatedAt" | "status"
  >,
): InfiniteListMetaDiagnostic {
  const pages = query.data?.pages ?? [];
  const rowCount = pages.reduce((acc, p) => acc + p.rows.length, 0);
  return {
    pagesCount: pages.length,
    rowCount,
    hasNextPage: query.hasNextPage ?? false,
    isFetchingNextPage: query.isFetchingNextPage,
    dataUpdatedAt: query.dataUpdatedAt,
    status: query.status,
  };
}
