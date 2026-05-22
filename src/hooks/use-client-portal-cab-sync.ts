"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  CLIENT_PORTAL_SYNC_TABLES,
  invalidateClientPortalQueries,
} from "@/lib/lavorazioni/client-portal-invalidate";
import type { CabSyncEntity } from "@/lib/sync/cab-sync-bus";
import { useCabSyncListener } from "@/src/hooks/use-cab-sync-listener";

const PORTAL_CAB_ENTITIES = [...CLIENT_PORTAL_SYNC_TABLES] as CabSyncEntity[];

/** Ascolta eventi Realtime/cab-sync e invalida cache portale clienti. */
export function useClientPortalCabSync(enabled = true): void {
  const qc = useQueryClient();

  const onSync = useCallback(() => {
    if (!enabled) return;
    void invalidateClientPortalQueries(qc);
  }, [enabled, qc]);

  useCabSyncListener(PORTAL_CAB_ENTITIES, onSync);
}
