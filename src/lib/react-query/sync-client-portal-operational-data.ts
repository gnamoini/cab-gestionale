"use client";

import type { QueryClient } from "@tanstack/react-query";
import { invalidateGestionaleTables } from "@/lib/realtime/gestionale-realtime-config";
import { CLIENT_PORTAL_SYNC_TABLES } from "@/lib/lavorazioni/client-portal-sync-tables";
import { clearGestionaleDirty } from "@/lib/sync/gestionale-dirty-state";
import { acknowledgeOperationalTableVersions } from "@/lib/sync/operational-data-version";
import { incrementSyncMetric } from "@/lib/sync/gestionale-sync-metrics";
import { QK } from "@/src/lib/react-query/query-keys";
import {
  refetchActiveClientPortalMedia,
  refetchActiveSchedeBundles,
  runLavorazioniToolbarRefresh,
} from "./refetch-lavorazioni-operational-data";

const PORTAL_SYNC_TABLES = [...CLIENT_PORTAL_SYNC_TABLES];

export function refetchActiveClientPortalListQueries(qc: QueryClient): Promise<void> {
  return qc.refetchQueries({
    predicate: (query) => {
      const key = query.queryKey;
      return key[0] === QK.lavorazioniQueries[0] && key.at(-1) === "portal";
    },
    type: "active",
  });
}

/** Baseline ack dopo fetch iniziale portale riuscito — no invalidate/refetch. */
export function acknowledgeClientPortalSyncSuccess(): void {
  acknowledgeOperationalTableVersions(PORTAL_SYNC_TABLES);
  clearGestionaleDirty({ domain: "portale" });
}

export type SyncClientPortalOperationalDataOptions = {
  /** Refetch aggiuntivi (es. query lista montate nell'orchestrator). */
  refetchTasks?: Promise<unknown>[];
  reason?: "user_requested" | "navigation";
};

/**
 * Sync atomico portale: invalidate → refetch await → ack version → clear dirty.
 * Il banner sparisce solo dopo refetch completato.
 */
export async function syncClientPortalOperationalData(
  qc: QueryClient,
  options?: SyncClientPortalOperationalDataOptions,
): Promise<void> {
  invalidateGestionaleTables(qc, PORTAL_SYNC_TABLES, { immediate: true });

  const refetchTasks = [
    ...(options?.refetchTasks ?? []),
    refetchActiveClientPortalListQueries(qc),
    refetchActiveSchedeBundles(qc),
    refetchActiveClientPortalMedia(qc),
  ];

  await runLavorazioniToolbarRefresh(refetchTasks);

  acknowledgeOperationalTableVersions(PORTAL_SYNC_TABLES);
  clearGestionaleDirty({ domain: "portale" });

  incrementSyncMetric("gestionale_dirty_flushed", 1, {
    reason: options?.reason ?? "user_requested",
    domain: "portale",
  });
}
