import type { QueryMeta } from "@tanstack/react-query";

/**
 * Meta per query che non devono mostrare overlay globale durante refetch in background (realtime attivo).
 */
export type GestionaleRealtimeQueryMeta = QueryMeta & {
  /** Se true, GlobalLoadingQueryBridge ignora fetch con dati già in cache. */
  suppressGlobalLoadingOnBackgroundRefetch?: boolean;
};

export function gestionaleBackgroundRefetchMeta(): GestionaleRealtimeQueryMeta {
  return { suppressGlobalLoadingOnBackgroundRefetch: true };
}
