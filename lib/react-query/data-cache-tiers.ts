/**
 * SSOT classificazione cache dati: STATIC / SEMI-DYNAMIC / DYNAMIC.
 * Complementa i layer CORE/VIEW/REPORT in query-layer-policies.ts.
 */

import {
  GESTIONALE_CORE_STALE_MS,
  GESTIONALE_REPORT_GC_MS,
  GESTIONALE_REPORT_STALE_MS,
} from "@/lib/react-query/query-layer-policies";

export type DataCacheTier = "static" | "semi" | "dynamic";

/** Dati raramente mutabili — invalidazione esplicita su mutation/realtime. */
export const GESTIONALE_STATIC_STALE_MS = Number.POSITIVE_INFINITY;
export const GESTIONALE_STATIC_GC_MS = 86_400_000;

/** Anagrafiche e liste catalogo — refresh su mutation dominio. */
export const GESTIONALE_SEMI_STALE_MS = 15 * 60_000;
export const GESTIONALE_SEMI_GC_MS = 3_600_000;

/** Nomi profilo lazy (batch mobile). */
export const GESTIONALE_PROFILE_NAMES_STALE_MS = 120_000;

export const GESTIONALE_STATIC_QUERY_POLICY = {
  staleTime: GESTIONALE_STATIC_STALE_MS,
  gcTime: GESTIONALE_STATIC_GC_MS,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
  refetchOnMount: false,
  retry: 1,
} as const;

export const GESTIONALE_SEMI_QUERY_POLICY = {
  staleTime: GESTIONALE_SEMI_STALE_MS,
  gcTime: GESTIONALE_SEMI_GC_MS,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
  refetchOnMount: false,
  retry: 1,
} as const;

export function staticQueryOpts() {
  return { ...GESTIONALE_STATIC_QUERY_POLICY };
}

export function semiDynamicQueryOpts() {
  return { ...GESTIONALE_SEMI_QUERY_POLICY };
}

/** Layer CORE dinamico (lavorazioni attive, movimenti) — realtime-aware via useGestionaleQueryOpts. */
export function dynamicCoreQueryOpts() {
  return {
    staleTime: GESTIONALE_CORE_STALE_MS,
    refetchOnMount: true as const,
    retry: 1 as const,
  };
}

/** Report live / aggregati derivati. */
export function dynamicReportQueryOpts() {
  return {
    staleTime: GESTIONALE_REPORT_STALE_MS,
    gcTime: GESTIONALE_REPORT_GC_MS,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: true,
    retry: 1,
  };
}
