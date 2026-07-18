"use client";

import type { QueryClient } from "@tanstack/react-query";
import { invalidateGestionaleTables } from "@/lib/realtime/gestionale-realtime-config";
import {
  clearGestionaleDirty,
  getDirtyForActiveScopes,
  markGestionaleDirty,
  type DirtyEntry,
} from "@/lib/sync/gestionale-dirty-state";
import { incrementSyncMetric } from "@/lib/sync/gestionale-sync-metrics";
import {
  getActiveSyncContexts,
  type GestionaleSyncDomain,
} from "@/lib/sync/gestionale-sync-scope";
import { isDirtySyncEnabledForDomain } from "@/lib/feature-flags/gestionale-dirty-sync-flag";

export type GestionaleFlushReason =
  | "user_requested"
  | "reconnect_catchup"
  | "polling_fallback"
  | "form_saved"
  | "navigation";

export type FlushGestionaleDirtyOptions = {
  reason: GestionaleFlushReason;
  domains?: GestionaleSyncDomain[];
  entityIds?: Array<{ table: string; entityId: string }>;
};

function collectFlushPayload(
  domains: GestionaleSyncDomain[] | undefined,
  entityOverride?: Array<{ table: string; entityId: string }>,
): { tables: string[]; entityIdByTable: Map<string, string>; entries: DirtyEntry[] } {
  const scopes = getActiveSyncContexts();
  const relevantScopes = domains?.length
    ? scopes.filter((s) => domains.includes(s.domain))
    : scopes;
  const entries = getDirtyForActiveScopes(relevantScopes);
  const tables = new Set<string>();
  const entityIdByTable = new Map<string, string>();

  for (const e of entries) {
    tables.add(e.table);
    if (e.entityId) entityIdByTable.set(e.table, e.entityId);
  }
  if (entityOverride?.length) {
    for (const { table, entityId } of entityOverride) {
      tables.add(table);
      entityIdByTable.set(table, entityId);
    }
  }

  return { tables: [...tables], entityIdByTable, entries };
}

/**
 * Applica refresh manuale per dirty pendenti — unico entry point flush.
 */
export async function flushGestionaleDirty(
  qc: QueryClient,
  options: FlushGestionaleDirtyOptions,
): Promise<void> {
  const { tables, entityIdByTable, entries } = collectFlushPayload(
    options.domains,
    options.entityIds,
  );

  if (tables.length > 0) {
    invalidateGestionaleTables(qc, tables, {
      entityIdByTable,
      immediate: true,
    });
  }

  const domainsToClear =
    options.domains ??
    [...new Set(entries.map((e) => e.domain))];

  if (domainsToClear.length > 0) {
    for (const domain of domainsToClear) {
      clearGestionaleDirty({ domain });
    }
  } else {
    clearGestionaleDirty();
  }

  incrementSyncMetric("gestionale_dirty_flushed", 1, { reason: options.reason });
}

/** Segnala dirty su scope attivi quando il polling fallback rileva drift (tab visibile). */
export function markPollingFallbackDirty(): void {
  if (typeof document !== "undefined" && document.visibilityState !== "visible") return;

  const scopes = getActiveSyncContexts();
  const now = Date.now();

  for (const scope of scopes) {
    if (!isDirtySyncEnabledForDomain(scope.domain)) continue;
    for (const table of scope.tables) {
      markGestionaleDirty({
        domain: scope.domain,
        table,
        entityId: null,
        type: "update",
        timestamp: now,
        source: "realtime",
      });
    }
    incrementSyncMetric("gestionale_dirty_marked", 1, {
      reason: "polling_fallback",
      domain: scope.domain,
    });
  }
}
