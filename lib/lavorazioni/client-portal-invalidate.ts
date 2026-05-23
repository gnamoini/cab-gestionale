"use client";

import type { QueryClient } from "@tanstack/react-query";
import { CLIENT_PORTAL_SYNC_TABLES } from "@/lib/lavorazioni/client-portal-sync-tables";
import { broadcastGestionaleInvalidate } from "@/lib/sync/cab-realtime-broadcast";
import { collectQueryKeysForGestionaleTables } from "@/src/lib/react-query/invalidate-targets";

export { CLIENT_PORTAL_SYNC_TABLES, isClientPortalSyncTable } from "@/lib/lavorazioni/client-portal-sync-tables";
export type { ClientPortalSyncTable } from "@/lib/lavorazioni/client-portal-sync-tables";

/** Invalida cache React Query del portale clienti + media collegati (senza broadcast). */
export async function invalidateClientPortalQueries(qc: QueryClient): Promise<void> {
  const keys = collectQueryKeysForGestionaleTables([...CLIENT_PORTAL_SYNC_TABLES], { includePortal: true });
  await Promise.all(keys.map((queryKey) => qc.invalidateQueries({ queryKey, refetchType: "active" })));
}

/** Propaga sync ad altre schede/tab del browser (stesso origin). */
export function broadcastClientPortalSync(): void {
  broadcastGestionaleInvalidate([...CLIENT_PORTAL_SYNC_TABLES]);
}
