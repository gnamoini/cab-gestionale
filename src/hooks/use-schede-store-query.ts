"use client";

import { useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { invalidateClientPortalQueries } from "@/lib/lavorazioni/client-portal-invalidate";
import { fetchSchedeStoreMerged } from "@/lib/schede/schede-sync-adapter";
import { LAVORAZIONI_SCHEDE_STORAGE_KEY } from "@/lib/schede/lavorazioni-schede-storage";
import { SCHEDE_STORE_QUERY_KEY } from "@/src/lib/react-query/query-keys";
import { useCabSyncListener } from "@/src/hooks/use-cab-sync-listener";
import type { LavorazioneSchedeStore } from "@/types/schede";

export { SCHEDE_STORE_QUERY_KEY } from "@/src/lib/react-query/query-keys";

const STORE_OPTS = {
  staleTime: 5_000,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
} as const;

/** Store schede: Supabase primary, localStorage come cache offline. */
export function useSchedeStoreQuery(enabled = true) {
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: SCHEDE_STORE_QUERY_KEY,
    queryFn: fetchSchedeStoreMerged,
    enabled,
    ...STORE_OPTS,
  });

  useCabSyncListener(["scheda_lavorazione", "lavorazione_documents"], () => {
    void qc.invalidateQueries({ queryKey: SCHEDE_STORE_QUERY_KEY, refetchType: "active" });
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
    void qc.invalidateQueries({ queryKey: SCHEDE_STORE_QUERY_KEY, refetchType: "active" });
    void invalidateClientPortalQueries(qc);
  }, [qc]);

  return { store, isLoading: q.isLoading, invalidate, refetch: q.refetch };
}
