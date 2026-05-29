/**
 * Policy React Query per layer gestionale — costanti condivise (non alterano default QueryClient).
 */

export const GESTIONALE_CORE_STALE_MS = 30_000;

export const GESTIONALE_VIEW_STALE_MS = 60_000;
export const GESTIONALE_VIEW_GC_MS = 600_000;

/** Report / manual entries: aggregati, refresh via broadcast + realtime. */
export const GESTIONALE_REPORT_STALE_MS = 120_000;
export const GESTIONALE_REPORT_GC_MS = 600_000;

/** Unico limit server per feed log magazzino/movimenti (cache condivisa dashboard ↔ report). */
export const GESTIONALE_LOG_FEED_LIMIT = 200;

export const GESTIONALE_VIEW_QUERY_POLICY = {
  staleTime: GESTIONALE_VIEW_STALE_MS,
  gcTime: GESTIONALE_VIEW_GC_MS,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
  refetchOnMount: true,
  retry: 1,
  refetchInterval: false as const,
} as const;

export const GESTIONALE_REPORT_QUERY_POLICY = {
  staleTime: GESTIONALE_REPORT_STALE_MS,
  gcTime: GESTIONALE_REPORT_GC_MS,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
  refetchOnMount: true,
  retry: 1,
  refetchInterval: false as const,
} as const;

export const GESTIONALE_CORE_QUERY_POLICY = {
  staleTime: GESTIONALE_CORE_STALE_MS,
  refetchOnWindowFocus: undefined as boolean | undefined,
  refetchOnMount: true,
  retry: 1,
  refetchInterval: false as const,
} as const;
