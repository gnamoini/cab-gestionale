"use client";

import type { QueryClient } from "@tanstack/react-query";
import { RuntimeEvents, trackRuntimeEvent } from "@/lib/observability/events";
import { bumpReportDataRefresh } from "@/lib/report/report-broadcast";
import { invalidateReportUniverse } from "@/lib/report/invalidate-report-universe";
import type { CabSyncEvent } from "@/lib/sync/cab-sync-bus";
import { dispatchGestionaleAction } from "@/lib/sync/gestionale-sync-dispatch";
import { QK } from "@/src/lib/react-query/query-keys";

export type OperationalTruthDomain = "documenti" | "lavorazioni" | "mezzi" | "magazzino" | "report";

const REPORT_LOG_ENTITA = new Set(["magazzino_ricambi", "movimenti_ricambi"]);

/** @deprecated Preferire invalidateReportUniverse — mantenuto per compat log feed legacy. */
async function invalidateReportLogQueries(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({
    predicate: (query) => {
      if (query.queryKey[0] !== QK.log[0]) return false;
      const filters = query.queryKey[1] as { entita?: string } | null | undefined;
      const entita = filters?.entita;
      return typeof entita === "string" && REPORT_LOG_ENTITA.has(entita);
    },
    refetchType: "active",
  });
}

export type InvalidateOperationalTruthOptions = {
  queryClient: QueryClient;
  domain: OperationalTruthDomain;
  cabSyncEvents?: CabSyncEvent[];
  /** Evita `bumpReportDataRefresh` (refresh interno report / coalesce). */
  skipReportBroadcast?: boolean;
};

/** Invalidazione cache operativa post-CRUD (mediata dal truth layer). */
export async function invalidateOperationalTruth(opts: InvalidateOperationalTruthOptions): Promise<void> {
  const { queryClient, domain, cabSyncEvents, skipReportBroadcast } = opts;
  trackRuntimeEvent(RuntimeEvents.cacheInvalidateOperational, { domain, skipReportBroadcast: !!skipReportBroadcast });

  switch (domain) {
    case "documenti":
      dispatchGestionaleAction(queryClient, ["documenti"], { source: "local_mutation", cabSyncEvents });
      break;
    case "lavorazioni":
      dispatchGestionaleAction(
        queryClient,
        ["lavorazioni", "scheda_lavorazione", "documenti", "movimenti_ricambi", "preventivi"],
        { source: "local_mutation", cabSyncEvents },
      );
      if (!skipReportBroadcast) bumpReportDataRefresh();
      break;
    case "mezzi":
      dispatchGestionaleAction(queryClient, ["mezzi", "lavorazioni", "preventivi", "documenti", "log_modifiche"], {
        source: "local_mutation",
        cabSyncEvents,
      });
      break;
    case "magazzino":
      dispatchGestionaleAction(queryClient, ["magazzino_ricambi", "movimenti_ricambi", "lavorazioni", "log_modifiche"], {
        source: "local_mutation",
        cabSyncEvents,
      });
      if (!skipReportBroadcast) bumpReportDataRefresh();
      break;
    case "report":
      await invalidateReportUniverse(queryClient, {
        skipReportBroadcast: skipReportBroadcast ?? true,
      });
      await invalidateReportLogQueries(queryClient);
      break;
    default:
      break;
  }
}
