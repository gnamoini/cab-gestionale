"use client";

import type { QueryClient } from "@tanstack/react-query";
import { dispatchClientPortalRefresh } from "@/lib/lavorazioni/client-portal-sync";
import { broadcastGestionaleInvalidate } from "@/lib/sync/cab-realtime-broadcast";
import { QK } from "@/src/lib/react-query/invalidate-related";

/** Tabelle il cui cambio impatta il portale clienti (allineate a Realtime + broadcast). */
export const CLIENT_PORTAL_SYNC_TABLES = [
  "lavorazioni",
  "lavorazione_documents",
  "scheda_lavorazione",
  "preventivi",
  "mezzi",
  "log_modifiche",
] as const;

export type ClientPortalSyncTable = (typeof CLIENT_PORTAL_SYNC_TABLES)[number];

export function isClientPortalSyncTable(table: string): table is ClientPortalSyncTable {
  return (CLIENT_PORTAL_SYNC_TABLES as readonly string[]).includes(table);
}

/** Invalida cache React Query del portale clienti + media collegati. */
export async function invalidateClientPortalQueries(qc: QueryClient): Promise<void> {
  await Promise.all([
    qc.invalidateQueries({ queryKey: QK.lavorazioniQueries, refetchType: "active" }),
    qc.invalidateQueries({ queryKey: QK.clientLavorazioniDetail, refetchType: "active" }),
    qc.invalidateQueries({ queryKey: QK.clientLavorazioneDocuments, refetchType: "active" }),
    qc.invalidateQueries({ queryKey: QK.clientLavorazionePhotos, refetchType: "active" }),
    qc.invalidateQueries({ queryKey: QK.schede, refetchType: "active" }),
    qc.invalidateQueries({ queryKey: QK.log, refetchType: "active" }),
  ]);
  dispatchClientPortalRefresh();
}

/** Propaga sync ad altre schede/tab del browser (stesso origin). */
export function broadcastClientPortalSync(): void {
  broadcastGestionaleInvalidate([...CLIENT_PORTAL_SYNC_TABLES]);
}

/**
 * Dopo mutazioni gestionale: invalida portale clienti in questa tab e notifica le altre.
 */
export async function syncClientPortalAfterGestionaleChange(qc: QueryClient): Promise<void> {
  await invalidateClientPortalQueries(qc);
  broadcastClientPortalSync();
}
