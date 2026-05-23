import type { QueryClient } from "@tanstack/react-query";
import {
  allGestionaleOperationalTables,
  type InvalidateGestionaleTablesOptions,
} from "@/src/lib/react-query/invalidate-targets";
import { invalidateGestionaleTablesTargeted } from "@/src/lib/react-query/invalidate-batch";

/** Intervallo polling di fallback quando Realtime non è connesso (ms). */
export const GESTIONALE_REALTIME_POLL_MS = 20_000;

/** Debounce invalidazioni cache dopo burst di eventi (ms). */
export const GESTIONALE_REALTIME_DEBOUNCE_MS = 100;

/** Tentativi riconnessione subscription. */
export const GESTIONALE_REALTIME_RETRY_ATTEMPTS = 3;

export type GestionaleRealtimeTableSpec = {
  table: string;
};

/** Tabelle sottoscritte a Realtime (chiavi cache in invalidate-targets). */
export const GESTIONALE_REALTIME_TABLES: GestionaleRealtimeTableSpec[] = allGestionaleOperationalTables().map(
  (table) => ({ table }),
);

export type InvalidateGestionaleTablesParams = InvalidateGestionaleTablesOptions & {
  entityIdByTable?: ReadonlyMap<string, string>;
  cabSyncEvents?: import("@/lib/sync/cab-sync-bus").CabSyncEvent[];
};

export function invalidateAllGestionaleOperationalQueries(qc: QueryClient): void {
  invalidateGestionaleTablesTargeted(qc, allGestionaleOperationalTables(), { immediate: true });
}

export function invalidateGestionaleTables(
  qc: QueryClient,
  tables: string[],
  options?: InvalidateGestionaleTablesParams,
): void {
  invalidateGestionaleTablesTargeted(qc, tables, options);
}
