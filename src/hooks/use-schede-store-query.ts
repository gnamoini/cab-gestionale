"use client";

import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ensureSchedeBundlesInCache,
  schedeEnsureQueryKey,
} from "@/lib/schede/schede-sync-adapter";
import { useViewQueryOpts } from "@/lib/view/view-query-opts";
import { useRealtimeStatus } from "@/src/context/realtime-status-context";
import { QK, SCHEde_BUNDLES_QUERY_KEY } from "@/src/lib/react-query/query-keys";
import type { LavorazioneSchedeStore } from "@/types/schede";

export { SCHEde_BUNDLES_QUERY_KEY, SCHEDE_STORE_QUERY_KEY } from "@/src/lib/react-query/query-keys";

const BUNDLE_OPTS = {
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
} as const;

export type SchedeBundlesQueryOptions = {
  /** VIEW layer (portale clienti): refetch stale al mount. Default CORE gestionale. */
  viewLayer?: boolean;
  /** Portale clienti: gate `ensureClientLavorazioniAccess` invece di `lavorazioni.read`. */
  clientPortal?: boolean;
  /** Lazy load: fetch solo bundle per questi id (no monolith getAll). */
  lavorazioneIds?: readonly string[];
};

/** Bundle schede per lavorazione — React Query unica source UI (DB lazy per id). */
export function useSchedeBundlesQuery(enabled = true, options?: SchedeBundlesQueryOptions) {
  const qc = useQueryClient();
  const { gestionale } = useRealtimeStatus();
  const viewOpts = useViewQueryOpts();
  const realtimeConnected = gestionale === "connected";
  const viewLayer = options?.viewLayer === true;
  const clientPortal = options?.clientPortal === true;
  const lavorazioneIds = options?.lavorazioneIds ?? [];
  const ensureKey = useMemo(
    () => schedeEnsureQueryKey(lavorazioneIds, clientPortal),
    [lavorazioneIds, clientPortal],
  );
  const hasIds = lavorazioneIds.length > 0;

  const ensureQ = useQuery({
    queryKey: ensureKey,
    queryFn: () => ensureSchedeBundlesInCache(qc, lavorazioneIds, { clientPortal }),
    enabled: enabled && hasIds,
    staleTime: viewLayer ? viewOpts.staleTime : realtimeConnected ? 30_000 : 5_000,
    refetchInterval: false,
    refetchOnMount: viewLayer ? viewOpts.refetchOnMount : realtimeConnected ? false : undefined,
    ...BUNDLE_OPTS,
  });

  const storeQ = useQuery({
    queryKey: SCHEde_BUNDLES_QUERY_KEY,
    queryFn: () => qc.getQueryData<LavorazioneSchedeStore>(SCHEde_BUNDLES_QUERY_KEY) ?? {},
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    initialData: () => qc.getQueryData<LavorazioneSchedeStore>(SCHEde_BUNDLES_QUERY_KEY) ?? {},
  });

  const store: LavorazioneSchedeStore = storeQ.data ?? {};

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: QK.schede, refetchType: "active" });
  }, [qc]);

  return {
    store,
    isLoading: enabled && hasIds ? ensureQ.isLoading : false,
    isFetching: ensureQ.isFetching,
    invalidate,
    refetch: ensureQ.refetch,
  };
}

/** Slice bundle per singola riga — evita di passare l'intero `store` ai componenti memo. */
export function useSchedeBundleForRow(lavorazioneId: string | undefined) {
  const { bundle } = useSchedeBundle(lavorazioneId);
  return bundle;
}

/** Bundle schede per singola lavorazione — lazy fetch on demand. */
export function useSchedeBundle(lavorazioneId: string | undefined) {
  const ids = useMemo(() => (lavorazioneId ? [lavorazioneId] : []), [lavorazioneId]);
  const { store, isLoading, invalidate, refetch } = useSchedeBundlesQuery(Boolean(lavorazioneId), {
    lavorazioneIds: ids,
  });
  const bundle = useMemo(
    () => (lavorazioneId ? store[lavorazioneId] : undefined),
    [store, lavorazioneId],
  );
  return { bundle, store, isLoading, invalidate, refetch };
}
