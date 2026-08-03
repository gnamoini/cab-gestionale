"use client";

import { invalidateGestionaleTables } from "@/lib/realtime/gestionale-realtime-config";
import {
  markGestionaleDirty,
} from "@/lib/sync/gestionale-dirty-state";
import { incrementSyncMetric } from "@/lib/sync/gestionale-sync-metrics";
import {
  getActiveSyncContexts,
} from "@/lib/sync/gestionale-sync-scope";
import { isDirtySyncEnabledForDomain } from "@/lib/feature-flags/gestionale-dirty-sync-flag";
import { shouldSkipOperationalDirtyMark } from "@/lib/sync/operational-dirty-mark-gate";

/** Segnala dirty solo per tabelle operative con drift verificato (scope attivi). */
export function markDirtyForOperationalTables(tables: readonly string[]): void {
  if (tables.length === 0) return;
  if (typeof document !== "undefined" && document.visibilityState !== "visible") return;

  const tableSet = new Set(tables);
  const scopes = getActiveSyncContexts();
  const now = Date.now();

  for (const scope of scopes) {
    if (!isDirtySyncEnabledForDomain(scope.domain)) continue;
    let marked = false;
    for (const table of scope.tables) {
      if (!tableSet.has(table)) continue;
      if (shouldSkipOperationalDirtyMark(table)) continue;
      markGestionaleDirty({
        domain: scope.domain,
        table,
        entityId: null,
        type: "update",
        timestamp: now,
        source: "realtime",
      });
      marked = true;
    }
    if (marked) {
      incrementSyncMetric("gestionale_dirty_marked", 1, {
        reason: "polling_fallback",
        domain: scope.domain,
      });
    }
  }
}

/** @deprecated Usare markDirtyForOperationalTables con tabelle driftate. */
export function markPollingFallbackDirty(): void {
  const scopes = getActiveSyncContexts();
  const tables = scopes.flatMap((scope) => [...scope.tables]);
  markDirtyForOperationalTables(tables);
}
