"use client";

import type { QueryClient } from "@tanstack/react-query";
import { CLIENT_PORTAL_SYNC_TABLES } from "@/lib/lavorazioni/client-portal-sync-tables";
import { broadcastGestionaleInvalidate } from "@/lib/sync/cab-realtime-broadcast";
import { QK } from "@/src/lib/react-query/query-keys";

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
