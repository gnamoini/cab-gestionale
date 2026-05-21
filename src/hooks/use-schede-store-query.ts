"use client";

import { useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { invalidateClientPortalQueries } from "@/lib/lavorazioni/client-portal-invalidate";
import { fetchSchedeStoreMerged } from "@/lib/schede/schede-sync-adapter";
import { LAVORAZIONI_SCHEDE_STORAGE_KEY } from "@/lib/schede/lavorazioni-schede-storage";
import { QK } from "@/src/lib/react-query/invalidate-related";
import { useCabSyncListener } from "@/src/hooks/use-cab-sync-listener";
import type { LavorazioneSchedeStore } from "@/types/schede";

export const SCHEDE_STORE_QUERY_KEY = [...QK.schede, "store"] as const;

const STORE_OPTS = {
  staleTime: 5_000,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
} as const;

/** Store schede: merge DB + localStorage (dual-write). */
export function useSchedeStoreQuery(enabled = true) {
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: SCHEDE_STORE_QUERY_KEY,
    queryFn: fetchSchedeStoreMerged,
    enabled,
    ...STORE_OPTS,
  });

  useCabSyncListener("scheda_lavorazione", () => {
    void qc.invalidateQueries({ queryKey: SCHEDE_STORE_QUERY_KEY });
  });

  useEffect(() => {
    const reload = () => void qc.invalidateQueries({ queryKey: SCHEDE_STORE_QUERY_KEY });
    const onStorage = (e: StorageEvent) => {
      if (e.key === LAVORAZIONI_SCHEDE_STORAGE_KEY) reload();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("gestionale-schede-store-changed", reload);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("gestionale-schede-store-changed", reload);
    };
  }, [qc]);

  const store: LavorazioneSchedeStore = q.data ?? {};

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: SCHEDE_STORE_QUERY_KEY });
    void invalidateClientPortalQueries(qc);
  }, [qc]);

  return { store, isLoading: q.isLoading, invalidate, refetch: q.refetch };
}
