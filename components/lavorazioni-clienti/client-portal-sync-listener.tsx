"use client";

import { useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CLIENT_PORTAL_REFRESH_EVENT } from "@/lib/lavorazioni/client-portal-sync";
import { invalidateClientPortalQueries } from "@/lib/lavorazioni/client-portal-invalidate";
import { LAVORAZIONI_SCHEDE_STORE_CHANGED } from "@/src/hooks/use-lavorazione-schede-store-sync";
import { useClientPortalCabSync } from "@/src/hooks/use-client-portal-cab-sync";

/**
 * Bridge sync portale clienti: Realtime/cab-sync + evento cross-tab.
 * Montato nel layout `/lavorazioni-clienti`.
 */
export function ClientPortalSyncListener() {
  const qc = useQueryClient();
  useClientPortalCabSync(true);

  const onCrossTabRefresh = useCallback(() => {
    void invalidateClientPortalQueries(qc);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(LAVORAZIONI_SCHEDE_STORE_CHANGED));
    }
  }, [qc]);

  useEffect(() => {
    window.addEventListener(CLIENT_PORTAL_REFRESH_EVENT, onCrossTabRefresh);
    return () => window.removeEventListener(CLIENT_PORTAL_REFRESH_EVENT, onCrossTabRefresh);
  }, [onCrossTabRefresh]);

  return null;
}
