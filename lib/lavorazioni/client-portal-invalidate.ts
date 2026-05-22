"use client";

import type { QueryClient } from "@tanstack/react-query";
import { CLIENT_PORTAL_SYNC_TABLES } from "@/lib/lavorazioni/client-portal-sync-tables";
import { broadcastGestionaleInvalidate } from "@/lib/sync/cab-realtime-broadcast";
import { dispatchGestionaleLocalMutation } from "@/lib/sync/gestionale-sync-dispatch";
import { QK } from "@/src/lib/react-query/invalidate-related";

export { CLIENT_PORTAL_SYNC_TABLES, isClientPortalSyncTable } from "@/lib/lavorazioni/client-portal-sync-tables";
export type { ClientPortalSyncTable } from "@/lib/lavorazioni/client-portal-sync-tables";

/** Invalida cache React Query del portale clienti + media collegati (senza broadcast). */
export async function invalidateClientPortalQueries(qc: QueryClient): Promise<void> {
  await Promise.all([
    qc.invalidateQueries({ queryKey: QK.lavorazioniQueries, refetchType: "active" }),
    qc.invalidateQueries({ queryKey: QK.clientLavorazioniDetail, refetchType: "active" }),
    qc.invalidateQueries({ queryKey: QK.clientLavorazioneDocuments, refetchType: "active" }),
    qc.invalidateQueries({ queryKey: QK.clientLavorazionePhotos, refetchType: "active" }),
    qc.invalidateQueries({ queryKey: QK.schede, refetchType: "active" }),
    qc.invalidateQueries({ queryKey: QK.log, refetchType: "active" }),
  ]);
}

/** Propaga sync ad altre schede/tab del browser (stesso origin). */
export function broadcastClientPortalSync(): void {
  broadcastGestionaleInvalidate([...CLIENT_PORTAL_SYNC_TABLES]);
}

/**
 * Dopo mutazioni gestionale: invalida portale clienti in questa tab e notifica le altre.
 */
export async function syncClientPortalAfterGestionaleChange(qc: QueryClient): Promise<void> {
  dispatchGestionaleLocalMutation(qc, [...CLIENT_PORTAL_SYNC_TABLES]);
}
