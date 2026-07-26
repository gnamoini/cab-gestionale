"use client";

import type { QueryClient } from "@tanstack/react-query";
import { shouldSuppressRemoteCacheInvalidation } from "@/lib/sync/recent-local-mutation";
import { wasEntityRecentlyInvalidated } from "@/lib/sync/recent-entity-invalidation";
import type { CabSyncEvent } from "@/lib/sync/cab-sync-bus";
import { QK } from "@/src/lib/react-query/query-keys";
import { lavorazioniDomainQueryKeys } from "@/src/services/domain/lavorazioni-domain.queries";

export type ReconcileSource = "realtime" | "cab_sync" | "local_mutation" | "reconnect";

export type ReconcileGestionaleEntityResult = {
  /** Cache già coerente o soppressione attiva — nessun refetch necessario. */
  handled: boolean;
  /** Refetch esplicito consigliato al chiamante (es. hub modal). */
  needsRefetch: boolean;
};

function tableForEvent(event: CabSyncEvent): string | undefined {
  if (event.type === "settings_updated") return undefined;
  return event.table ?? event.entity;
}

export type ReconcileGestionaleEntityOptions = {
  /** Invalidazione globale già eseguita da dispatch — solo segnala refetch component-level. */
  skipInvalidation?: boolean;
};

/**
 * Merge / invalidazione mirata post-evento (non sostituisce optimistic onMutate Step 1).
 */
export function reconcileGestionaleEntity(
  qc: QueryClient,
  event: CabSyncEvent,
  source: ReconcileSource,
  opts?: ReconcileGestionaleEntityOptions,
): ReconcileGestionaleEntityResult {
  if (event.type === "settings_updated") {
    return { handled: true, needsRefetch: false };
  }

  const table = tableForEvent(event);
  if (table && shouldSuppressRemoteCacheInvalidation(table, event.id)) {
    return { handled: true, needsRefetch: false };
  }

  if (source === "local_mutation") {
    return { handled: true, needsRefetch: false };
  }

  if (opts?.skipInvalidation) {
    const table = tableForEvent(event);
    if (table && event.id && wasEntityRecentlyInvalidated(table, event.id)) {
      return { handled: true, needsRefetch: false };
    }
    switch (event.entity) {
      case "scheda_lavorazione":
      case "pdf_artifacts":
      case "document_access_tokens":
      case "lavorazioni":
        return { handled: true, needsRefetch: true };
      default:
        return { handled: true, needsRefetch: false };
    }
  }

  switch (event.entity) {
    case "lavorazioni": {
      void qc.invalidateQueries({ queryKey: lavorazioniDomainQueryKeys.base(event.id), refetchType: "active" });
      return { handled: true, needsRefetch: false };
    }
    case "scheda_lavorazione": {
      void qc.invalidateQueries({ queryKey: QK.schede, refetchType: "active" });
      return { handled: true, needsRefetch: true };
    }
    case "magazzino_ricambi":
      void qc.invalidateQueries({ queryKey: QK.magazzino, refetchType: "active" });
      return { handled: true, needsRefetch: false };
    case "movimenti_ricambi":
      void qc.invalidateQueries({ queryKey: QK.movimenti, refetchType: "active" });
      void qc.invalidateQueries({ queryKey: QK.magazzino, refetchType: "active" });
      return { handled: true, needsRefetch: false };
    case "documenti":
      void qc.invalidateQueries({ queryKey: QK.documenti, refetchType: "active" });
      return { handled: true, needsRefetch: false };
    case "pdf_artifacts":
    case "document_access_tokens":
      void qc.invalidateQueries({ queryKey: QK.lavorazioniQueries, refetchType: "active" });
      return { handled: true, needsRefetch: true };
    default:
      return { handled: false, needsRefetch: true };
  }
}

/** Reconcile batch da dispatch (dopo invalidazione globale). */
export function reconcileGestionaleCabEvents(
  qc: QueryClient,
  events: CabSyncEvent[],
  source: ReconcileSource,
  opts?: ReconcileGestionaleEntityOptions,
): ReconcileGestionaleEntityResult {
  let needsRefetch = false;
  for (const ev of events) {
    const r = reconcileGestionaleEntity(qc, ev, source, opts);
    if (r.needsRefetch) needsRefetch = true;
  }
  return { handled: true, needsRefetch };
}
