"use client";

import { useRealtimeStatus } from "@/src/context/realtime-status-context";
import { gestionaleBackgroundRefetchMeta } from "@/src/lib/ux/gestionale-realtime-query-meta";

/** Opzioni React Query condivise — invalidazione polling via GestionaleRealtimeBridge. */
export function useGestionaleQueryOpts() {
  const { gestionale } = useRealtimeStatus();
  const realtimeConnected = gestionale === "connected";

  return {
    staleTime: 30_000,
    /** Invalidazione centralizzata in GestionaleRealtimeBridge quando `gestionale === "polling"`. */
    refetchInterval: false,
    refetchOnWindowFocus: !realtimeConnected,
    refetchOnReconnect: true,
    refetchOnMount: realtimeConnected ? false : undefined,
    meta: gestionaleBackgroundRefetchMeta(),
  } as const;
}
