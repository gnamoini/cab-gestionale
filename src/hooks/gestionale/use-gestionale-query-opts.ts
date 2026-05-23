"use client";

import { GESTIONALE_REALTIME_POLL_MS } from "@/lib/realtime/gestionale-realtime-config";
import { useRealtimeStatus } from "@/src/context/realtime-status-context";

/** Opzioni React Query condivise — refetch aggressivo solo in polling fallback Realtime. */
export function useGestionaleQueryOpts() {
  const { gestionale } = useRealtimeStatus();
  const pollingFallback = gestionale === "polling";
  const realtimeConnected = gestionale === "connected";

  return {
    staleTime: 30_000,
    refetchInterval: pollingFallback ? GESTIONALE_REALTIME_POLL_MS : false,
    refetchOnWindowFocus: !realtimeConnected,
    refetchOnReconnect: true,
    refetchOnMount: realtimeConnected ? false : undefined,
  } as const;
}
