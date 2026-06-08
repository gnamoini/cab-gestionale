/**
 * Metriche long-session per script CI/Node — senza import client-only (gestionale-sync-dispatch).
 */
import { getCabSyncListenerCount } from "@/lib/sync/cab-sync-bus";
import { getRicambioStockSnapshotRegistrySize } from "@/lib/magazzino/ricambio-stock-snapshot-registry";
import { getScortaSyncQueueSize } from "@/lib/magazzino/scorta-adjust-sync";
import { getRuntimeHealthSnapshot } from "@/lib/observability/runtime-health";
import { getGestionaleRealtimeRuntimeMode } from "@/lib/realtime/gestionale-realtime-runtime";
import type { LongSessionMetricsSnapshot } from "@/lib/observability/long-session-metrics";

/** Snapshot modulo per soak gate Node (no heap/RQ browser). */
export function collectLongSessionMetricsNode(): LongSessionMetricsSnapshot {
  return {
    at: new Date().toISOString(),
    cabSyncListeners: getCabSyncListenerCount(),
    ricambioSnapshotRegistrySize: getRicambioStockSnapshotRegistrySize(),
    scortaSyncQueueSize: getScortaSyncQueueSize(),
    runtimeHealth: getRuntimeHealthSnapshot(),
    gestionaleRealtimeMode: getGestionaleRealtimeRuntimeMode(),
    gestionaleDispatchAppliedTotal: 0,
  };
}
