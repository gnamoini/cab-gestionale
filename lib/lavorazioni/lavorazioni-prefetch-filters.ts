import { isServerListPaginationEnabled } from "@/lib/performance/list-pagination-rollout";
import type { LavorazioneFilters } from "@/src/services/lavorazioni.service";

/** Shared SSR prefetch filter presets — client-safe for query key alignment. */
export const LAVORAZIONI_ATTIVE_LIGHT_FILTERS: LavorazioneFilters = {
  includeMezzo: true,
  fetchMode: "light",
  includeProfiles: false,
  archived: false,
};

/** Staff lista attive senza embed mezzo — abilita RPC + enrich client da `mezzi.list`. */
export const LAVORAZIONI_ATTIVE_RPC_FILTERS: LavorazioneFilters = {
  includeMezzo: false,
  fetchMode: "light",
  includeProfiles: false,
  archived: false,
};

export function lavorazioniAttiveListFilters(): LavorazioneFilters {
  return isServerListPaginationEnabled() ? LAVORAZIONI_ATTIVE_RPC_FILTERS : LAVORAZIONI_ATTIVE_LIGHT_FILTERS;
}

export const LAVORAZIONI_REPORT_FILTERS: LavorazioneFilters = {
  includeMezzo: false,
  fetchMode: "report",
};

/** Staff — conteggio archivio head (titolo sezione collassata). */
export const LAVORAZIONI_CHIUSE_COUNT_FILTERS: LavorazioneFilters = {
  includeMezzo: true,
  fetchMode: "light",
  includeProfiles: false,
  archived: true,
};

/** Dashboard SSR — allineato a `useLavorazioniReportSlice` (hydration idempotente). */
export const LAVORAZIONI_DASHBOARD_REPORT_FILTERS: LavorazioneFilters = {
  includeMezzo: false,
  fetchMode: "report",
};

/** @deprecated Dashboard usa `LAVORAZIONI_DASHBOARD_REPORT_FILTERS`. */
export const LAVORAZIONI_DASHBOARD_STATS_FILTERS: LavorazioneFilters = {
  includeMezzo: false,
  fetchMode: "light",
  includeProfiles: false,
  archived: false,
};
