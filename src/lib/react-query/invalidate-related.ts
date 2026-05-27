"use client";

import { bumpReportDataRefresh } from "@/lib/report/report-broadcast";
import type { CabSyncEvent } from "@/lib/sync/cab-sync-bus";
import {
  cabSyncEventForEntity,
  dispatchGestionaleAction,
} from "@/lib/sync/gestionale-sync-dispatch";
import type { QueryClient } from "@tanstack/react-query";

export { QK, SCHEDE_STORE_QUERY_KEY } from "@/src/lib/react-query/query-keys";
export {
  collectQueryKeysForGestionaleTables,
  executeInvalidateGestionaleTables,
} from "@/src/lib/react-query/invalidate-targets";
export {
  enqueueInvalidateGestionaleTables,
  enqueueInvalidateQueryKeys,
  invalidateGestionaleTablesTargeted,
} from "@/src/lib/react-query/invalidate-batch";
export {
  dispatchGestionaleAction,
  dispatchGestionaleLocalMutation,
  cabSyncEventForEntity,
} from "@/lib/sync/gestionale-sync-dispatch";

export async function invalidateAfterMezzoMutations(qc: QueryClient) {
  dispatchGestionaleAction(qc, ["mezzi", "lavorazioni", "preventivi", "documenti", "log_modifiche"], {
    source: "local_mutation",
  });
}

export async function invalidateAfterLavorazioneMutations(qc: QueryClient, cabSyncEvents?: CabSyncEvent[]) {
  dispatchGestionaleAction(qc, ["lavorazioni", "scheda_lavorazione", "documenti", "movimenti_ricambi", "preventivi"], {
    source: "local_mutation",
    cabSyncEvents,
  });
  bumpReportDataRefresh();
}

export async function invalidateAfterMagazzinoOrMovimenti(qc: QueryClient, cabSyncEvents?: CabSyncEvent[]) {
  dispatchGestionaleAction(qc, ["magazzino_ricambi", "movimenti_ricambi", "lavorazioni", "log_modifiche"], {
    source: "local_mutation",
    cabSyncEvents,
  });
}

export function invalidateAfterPreventiviMutations(
  qc: QueryClient,
  id?: string,
  type: "entity_created" | "entity_updated" | "entity_deleted" = "entity_updated",
): void {
  const events = id ? [cabSyncEventForEntity("preventivi", id, type, "preventivi")] : undefined;
  dispatchGestionaleAction(qc, ["preventivi"], { source: "local_mutation", cabSyncEvents: events });
}
