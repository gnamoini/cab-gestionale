"use client";

import type { UseQueryOptions } from "@tanstack/react-query";
import {
  GESTIONALE_REPORT_GC_MS,
  GESTIONALE_REPORT_QUERY_POLICY,
  GESTIONALE_REPORT_STALE_MS,
  GESTIONALE_VIEW_GC_MS,
  GESTIONALE_VIEW_QUERY_POLICY,
  GESTIONALE_VIEW_STALE_MS,
} from "@/lib/react-query/query-layer-policies";

export type ViewQueryOptsOverrides = {
  staleTime?: number;
  gcTime?: number;
  retry?: number | boolean;
  refetchOnMount?: boolean;
};

/** Default VIEW layer: cache-heavy, no focus refetch, stale-only remount. */
export const VIEW_QUERY_DEFAULTS = {
  staleTime: GESTIONALE_VIEW_STALE_MS,
  gcTime: GESTIONALE_VIEW_GC_MS,
  refetchOnWindowFocus: GESTIONALE_VIEW_QUERY_POLICY.refetchOnWindowFocus,
  refetchOnReconnect: GESTIONALE_VIEW_QUERY_POLICY.refetchOnReconnect,
  refetchOnMount: GESTIONALE_VIEW_QUERY_POLICY.refetchOnMount,
  retry: GESTIONALE_VIEW_QUERY_POLICY.retry,
} as const;

/**
 * Opzioni React Query per VIEW layer (dashboard, report, bunder, supporto, security).
 * Condivide queryKey con CORE ma riduce refetch aggressivi quando la view è l'unico subscriber.
 */
export function useViewQueryOpts(overrides?: ViewQueryOptsOverrides) {
  return {
    staleTime: overrides?.staleTime ?? VIEW_QUERY_DEFAULTS.staleTime,
    gcTime: overrides?.gcTime ?? VIEW_QUERY_DEFAULTS.gcTime,
    refetchOnWindowFocus: VIEW_QUERY_DEFAULTS.refetchOnWindowFocus,
    refetchOnReconnect: VIEW_QUERY_DEFAULTS.refetchOnReconnect,
    refetchOnMount: overrides?.refetchOnMount ?? VIEW_QUERY_DEFAULTS.refetchOnMount,
    retry: overrides?.retry ?? VIEW_QUERY_DEFAULTS.retry,
    refetchInterval: false,
  } as const satisfies Pick<
    UseQueryOptions<unknown, Error>,
    "staleTime" | "gcTime" | "refetchOnWindowFocus" | "refetchOnReconnect" | "refetchOnMount" | "retry" | "refetchInterval"
  >;
}

/** Report / manual entries — cache più lunga (120s). */
export function useReportViewQueryOpts(overrides?: ViewQueryOptsOverrides) {
  return {
    staleTime: overrides?.staleTime ?? GESTIONALE_REPORT_STALE_MS,
    gcTime: overrides?.gcTime ?? GESTIONALE_REPORT_GC_MS,
    refetchOnWindowFocus: GESTIONALE_REPORT_QUERY_POLICY.refetchOnWindowFocus,
    refetchOnReconnect: GESTIONALE_REPORT_QUERY_POLICY.refetchOnReconnect,
    refetchOnMount: overrides?.refetchOnMount ?? GESTIONALE_REPORT_QUERY_POLICY.refetchOnMount,
    retry: overrides?.retry ?? GESTIONALE_REPORT_QUERY_POLICY.retry,
    refetchInterval: false,
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
    refetchOnMount: overrides?.refetchOnMount ?? true,
    retry: overrides?.retry ?? 1,
    refetchInterval: false as const,
  };
}
