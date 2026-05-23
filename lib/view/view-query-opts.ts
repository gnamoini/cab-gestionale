"use client";

import type { UseQueryOptions } from "@tanstack/react-query";
import { GESTIONALE_REALTIME_POLL_MS } from "@/lib/realtime/gestionale-realtime-config";
import { useRealtimeStatus } from "@/src/context/realtime-status-context";

export type ViewQueryOptsOverrides = {
  staleTime?: number;
  gcTime?: number;
  retry?: number | boolean;
};

/** Default VIEW layer: cache-heavy, no focus refetch, stale-only remount. */
export const VIEW_QUERY_DEFAULTS = {
  staleTime: 60_000,
  gcTime: 600_000,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
  refetchOnMount: true,
  retry: 1,
} as const;

/**
 * Opzioni React Query per VIEW layer (dashboard, report, bunder, supporto, security).
 * Condivide queryKey con CORE ma riduce refetch aggressivi quando la view è l'unico subscriber.
 */
export function useViewQueryOpts(overrides?: ViewQueryOptsOverrides) {
  const { gestionale } = useRealtimeStatus();
  const pollingFallback = gestionale === "polling";

  return {
    staleTime: overrides?.staleTime ?? VIEW_QUERY_DEFAULTS.staleTime,
    gcTime: overrides?.gcTime ?? VIEW_QUERY_DEFAULTS.gcTime,
    refetchOnWindowFocus: VIEW_QUERY_DEFAULTS.refetchOnWindowFocus,
    refetchOnReconnect: VIEW_QUERY_DEFAULTS.refetchOnReconnect,
    refetchOnMount: VIEW_QUERY_DEFAULTS.refetchOnMount,
    retry: overrides?.retry ?? VIEW_QUERY_DEFAULTS.retry,
    refetchInterval: pollingFallback ? GESTIONALE_REALTIME_POLL_MS : false,
  } as const satisfies Pick<
    UseQueryOptions<unknown, Error>,
    "staleTime" | "gcTime" | "refetchOnWindowFocus" | "refetchOnReconnect" | "refetchOnMount" | "retry" | "refetchInterval"
  >;
}

/** Security / audit: cache più lunga, zero polling interval. */
export function useSecurityViewQueryOpts(overrides?: ViewQueryOptsOverrides) {
  return {
    staleTime: overrides?.staleTime ?? 120_000,
    gcTime: overrides?.gcTime ?? 900_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: true,
    retry: overrides?.retry ?? 1,
    refetchInterval: false as const,
  };
}
