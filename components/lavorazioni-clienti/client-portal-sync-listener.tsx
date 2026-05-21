"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CLIENT_PORTAL_REFRESH_EVENT } from "@/lib/lavorazioni/client-portal-sync";
import { LAVORAZIONI_SCHEDE_STORE_CHANGED } from "@/src/hooks/use-lavorazione-schede-store-sync";
import { QK } from "@/src/lib/react-query/invalidate-related";

/**
 * Ascolta invalidazioni portale clienti e forza refresh media/schede collegati.
 * Complementa React Query invalidation per componenti non legati a query attive.
 */
export function ClientPortalSyncListener() {
  const qc = useQueryClient();

  useEffect(() => {
    const onRefresh = () => {
      void Promise.all([
        qc.invalidateQueries({ queryKey: QK.clientLavorazioneDocuments, refetchType: "active" }),
        qc.invalidateQueries({ queryKey: QK.clientLavorazionePhotos, refetchType: "active" }),
        qc.invalidateQueries({ queryKey: QK.schede, refetchType: "active" }),
        qc.invalidateQueries({ queryKey: QK.lavorazioniQueries, refetchType: "active" }),
      ]);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(LAVORAZIONI_SCHEDE_STORE_CHANGED));
      }
    };

    window.addEventListener(CLIENT_PORTAL_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(CLIENT_PORTAL_REFRESH_EVENT, onRefresh);
  }, [qc]);

  return null;
}
