import { getCabSyncListenerCount } from "@/lib/sync/cab-sync-bus";
import { getGestionaleDispatchAppliedTotal } from "@/lib/sync/gestionale-sync-dispatch";
import { getGestionaleRealtimeRuntimeMode } from "@/lib/realtime/gestionale-realtime-runtime";
import { getRicambioStockSnapshotRegistrySize } from "@/lib/magazzino/ricambio-stock-snapshot-registry";
import { getScortaSyncQueueSize } from "@/lib/magazzino/scorta-adjust-sync";
import { getRuntimeHealthSnapshot } from "@/lib/observability/runtime-health";

export type LongSessionMetricsSnapshot = {
  at: string;
  cabSyncListeners: number;
  ricambioSnapshotRegistrySize: number;
  scortaSyncQueueSize: number;
  runtimeHealth: ReturnType<typeof getRuntimeHealthSnapshot>;
  gestionaleRealtimeMode: ReturnType<typeof getGestionaleRealtimeRuntimeMode>;
  gestionaleDispatchAppliedTotal: number;
  reactQueryCacheCount?: number;
  heapUsedMb?: number;
  heapTotalMb?: number;
};

/** Snapshot metriche long-session (dev/ops). */
export function collectLongSessionMetrics(queryCacheCount?: number): LongSessionMetricsSnapshot {
  const perfMem =
    typeof performance !== "undefined" &&
    "memory" in performance &&
    performance.memory &&
    typeof (performance.memory as { usedJSHeapSize?: number }).usedJSHeapSize === "number"
      ? (performance.memory as { usedJSHeapSize: number; totalJSHeapSize: number })
      : null;

  return {
    at: new Date().toISOString(),
    cabSyncListeners: getCabSyncListenerCount(),
    ricambioSnapshotRegistrySize: getRicambioStockSnapshotRegistrySize(),
    scortaSyncQueueSize: getScortaSyncQueueSize(),
    runtimeHealth: getRuntimeHealthSnapshot(),
    gestionaleRealtimeMode: getGestionaleRealtimeRuntimeMode(),
    gestionaleDispatchAppliedTotal: getGestionaleDispatchAppliedTotal(),
    reactQueryCacheCount: queryCacheCount,
    heapUsedMb: perfMem ? Math.round(perfMem.usedJSHeapSize / 1048576) : undefined,
    heapTotalMb: perfMem ? Math.round(perfMem.totalJSHeapSize / 1048576) : undefined,
  };
}
