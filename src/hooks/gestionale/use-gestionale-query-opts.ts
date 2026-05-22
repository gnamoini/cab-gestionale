"use client";

import { GESTIONALE_REALTIME_POLL_MS } from "@/lib/realtime/gestionale-realtime-config";
import { useRealtimeStatus } from "@/src/context/realtime-status-context";

/** Opzioni React Query condivise — refetch aggressivo quando Realtime è in polling fallback. */
export function useGestionaleQueryOpts() {
  const { gestionale } = useRealtimeStatus();
  const pollingFallback = gestionale === "polling";

  return {
    staleTime: 30_000,
    refetchInterval: pollingFallback ? GESTIONALE_REALTIME_POLL_MS : false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  } as const;
}
