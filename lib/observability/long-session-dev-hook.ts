import type { QueryClient } from "@tanstack/react-query";
import {
  collectLongSessionMetrics,
  type LongSessionMetricsSnapshot,
} from "@/lib/observability/long-session-metrics";
import { getInfiniteListMeta } from "@/lib/lavorazioni/get-infinite-list-meta";
import type { InfiniteData, UseInfiniteQueryResult } from "@tanstack/react-query";
import type { Page } from "@/lib/domain/list-types";

declare global {
  interface Window {
    __cabLongSessionMetrics?: () => LongSessionMetricsSnapshot;
    /** PR-2 observability — never UI render path. */
    __cabInfiniteListMeta?: <T>(
      query: Pick<
        UseInfiniteQueryResult<InfiniteData<Page<T>>, Error>,
        "data" | "hasNextPage" | "isFetchingNextPage" | "dataUpdatedAt" | "status"
      >,
    ) => ReturnType<typeof getInfiniteListMeta<T>>;
  }
}

/** Espone metriche long-session in console dev (`window.__cabLongSessionMetrics()`). */
export function installLongSessionDevHook(queryClient: QueryClient): void {
  if (typeof window === "undefined") return;
  window.__cabLongSessionMetrics = () =>
    collectLongSessionMetrics(queryClient.getQueryCache().getAll().length);
  window.__cabInfiniteListMeta = getInfiniteListMeta;
}
