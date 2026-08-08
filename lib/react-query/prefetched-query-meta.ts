/** SSOT meta per query seed SSR — discriminante refetchOnMount, non presenza generica di cache. */

export type PrefetchedQueryMeta = {
  prefetched: true;
  prefetchedAt: number;
};

export function markPrefetchedQueryMeta(prefetchedAt = Date.now()): PrefetchedQueryMeta {
  return { prefetched: true, prefetchedAt };
}

export function isPrefetchedQueryMeta(meta: unknown): meta is PrefetchedQueryMeta {
  return (
    typeof meta === "object" &&
    meta != null &&
    (meta as PrefetchedQueryMeta).prefetched === true &&
    typeof (meta as PrefetchedQueryMeta).prefetchedAt === "number"
  );
}

/**
 * Skip mount refetch solo per dati SSR prefetched/hydrated nella stessa navigazione.
 * Cache stale da sessione precedente → false (policy RQ esistente).
 */
export function shouldSkipMountRefetchForPrefetchedQuery(
  meta: unknown,
  dataUpdatedAt: number | undefined,
  staleTimeMs: number,
  navigationStartMs?: number,
): boolean {
  if (!isPrefetchedQueryMeta(meta)) return false;
  if (dataUpdatedAt == null || dataUpdatedAt <= 0) return false;
  if (navigationStartMs != null && dataUpdatedAt < navigationStartMs - 100) return false;
  if (staleTimeMs !== Number.POSITIVE_INFINITY && Date.now() - dataUpdatedAt > staleTimeMs) {
    return false;
  }
  return true;
}
