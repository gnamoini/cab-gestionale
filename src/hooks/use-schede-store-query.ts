"use client";

import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSchedeBundlesFromDb } from "@/lib/schede/schede-sync-adapter";
import { GESTIONALE_REALTIME_POLL_MS } from "@/lib/realtime/gestionale-realtime-config";
import { useRealtimeStatus } from "@/src/context/realtime-status-context";
import { QK, SCHEde_BUNDLES_QUERY_KEY } from "@/src/lib/react-query/query-keys";
import type { LavorazioneSchedeStore } from "@/types/schede";

export { SCHEde_BUNDLES_QUERY_KEY, SCHEDE_STORE_QUERY_KEY } from "@/src/lib/react-query/query-keys";

const BUNDLE_OPTS = {
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
} as const;

/** Bundle schede per lavorazione — React Query unica source UI (DB). */
export function useSchedeBundlesQuery(enabled = true) {
  const qc = useQueryClient();
  const { gestionale } = useRealtimeStatus();
  const pollingFallback = gestionale === "polling";
  const realtimeConnected = gestionale === "connected";

  const q = useQuery({
    queryKey: SCHEde_BUNDLES_QUERY_KEY,
    queryFn: fetchSchedeBundlesFromDb,
    enabled,
    staleTime: realtimeConnected ? 30_000 : 5_000,
    refetchInterval: pollingFallback ? GESTIONALE_REALTIME_POLL_MS : false,
    refetchOnMount: realtimeConnected ? false : undefined,
    ...BUNDLE_OPTS,
  });

  const store: LavorazioneSchedeStore = q.data ?? {};

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: QK.schede, refetchType: "active" });
  }, [qc]);

  return { store, isLoading: q.isLoading, invalidate, refetch: q.refetch };
}

/** @deprecated Usare `useSchedeBundlesQuery`. */
export function useSchedeStoreQuery(enabled = true) {
  return useSchedeBundlesQuery(enabled);
}

/** Bundle schede per singola lavorazione — selector su cache React Query. */
export function useSchedeBundle(lavorazioneId: string | undefined) {
  const { store, isLoading, invalidate, refetch } = useSchedeBundlesQuery(Boolean(lavorazioneId));
  const bundle = useMemo(
    () => (lavorazioneId ? store[lavorazioneId] : undefined),
    [store, lavorazioneId],
  );
  return { bundle, store, isLoading, invalidate, refetch };
}
