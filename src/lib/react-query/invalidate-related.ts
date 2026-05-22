"use client";

import { CLIENT_PORTAL_SYNC_TABLES } from "@/lib/lavorazioni/client-portal-sync-tables";
import { bumpReportDataRefresh } from "@/lib/report/report-broadcast";
import { dispatchGestionaleLocalMutation } from "@/lib/sync/gestionale-sync-dispatch";
import type { QueryClient } from "@tanstack/react-query";
import { QK } from "@/src/lib/react-query/query-keys";

export { QK, SCHEDE_STORE_QUERY_KEY } from "@/src/lib/react-query/query-keys";

export async function invalidateAfterMezzoMutations(qc: QueryClient) {
  dispatchGestionaleLocalMutation(qc, ["mezzi", "lavorazioni", "preventivi", "documenti", "log_modifiche"]);
}

export async function invalidateAfterLavorazioneMutations(qc: QueryClient) {
  await qc.invalidateQueries({ queryKey: QK.mezzoQueries, refetchType: "active" });
  dispatchGestionaleLocalMutation(qc, [
    "lavorazioni",
    "scheda_lavorazione",
    "documenti",
    "movimenti_ricambi",
    "preventivi",
  ]);
  bumpReportDataRefresh();
}

export async function invalidateAfterMagazzinoOrMovimenti(qc: QueryClient) {
  dispatchGestionaleLocalMutation(qc, ["magazzino_ricambi", "movimenti_ricambi", "lavorazioni"]);
}

/** Dopo mutazioni gestionale: invalida portale clienti in questa tab e notifica le altre. */
export async function syncClientPortalAfterGestionaleChange(qc: QueryClient): Promise<void> {
  dispatchGestionaleLocalMutation(qc, [...CLIENT_PORTAL_SYNC_TABLES]);
}
