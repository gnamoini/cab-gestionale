/**
 * Dev-only: conta invocazioni fetchFn React Query per queryKey (network fetch eseguito).
 * I dedup hit (in-flight sharing) non incrementano questo contatore.
 */

const enabled =
  typeof process !== "undefined" &&
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_CACHE_AUDIT !== "0";

const counts = new Map<string, number>();
let dedupHitSkips = 0;

function stableKey(queryKey: readonly unknown[]): string {
  try {
    return JSON.stringify(queryKey);
  } catch {
    return String(queryKey);
  }
}

export function recordQueryFetch(queryKey: readonly unknown[]): void {
  if (enabled) {
    const key = stableKey(queryKey);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  if (typeof window !== "undefined") {
    void import("@/lib/render/hydration-consistency-audit").then((m) =>
      m.recordHydrationQueryFetch(queryKey),
    );
  }
}

export function getQueryFetchCounts(): ReadonlyMap<string, number> {
  return counts;
}

export function recordDedupFetchSkip(): void {
  if (enabled) dedupHitSkips += 1;
}

export function getDedupFetchSkips(): number {
  return dedupHitSkips;
}

export function resetQueryFetchCounts(): void {
  counts.clear();
  dedupHitSkips = 0;
}

export function dumpQueryFetchCounts(): { queryKey: string; fetches: number }[] {
  return [...counts.entries()]
    .map(([queryKey, fetches]) => ({ queryKey, fetches }))
    .sort((a, b) => b.fetches - a.fetches);
}

if (typeof window !== "undefined" && enabled) {
  (window as Window & { __cabQueryFetchAudit?: typeof dumpQueryFetchCounts }).__cabQueryFetchAudit =
    dumpQueryFetchCounts;
}
