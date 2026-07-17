"use client";

import { useMemo } from "react";
import { GESTIONALE_CORE_STALE_MS } from "@/lib/react-query/query-layer-policies";
import { useRealtimeConnected } from "@/src/context/realtime-status-context";
import { gestionaleBackgroundRefetchMeta } from "@/src/lib/ux/gestionale-realtime-query-meta";

/** Opzioni React Query condivise — invalidazione polling via GestionaleRealtimeBridge. */
export function useGestionaleQueryOpts() {
  const realtimeConnected = useRealtimeConnected();

  return useMemo(
    () =>
      ({
        staleTime: GESTIONALE_CORE_STALE_MS,
        /** Invalidazione centralizzata in GestionaleRealtimeBridge quando `gestionale === "polling"`. */
        refetchInterval: false,
        refetchOnWindowFocus: !realtimeConnected,
        refetchOnReconnect: true,
        refetchOnMount: realtimeConnected ? false : undefined,
        meta: gestionaleBackgroundRefetchMeta(),
      }) as const,
    [realtimeConnected],
  );
}
