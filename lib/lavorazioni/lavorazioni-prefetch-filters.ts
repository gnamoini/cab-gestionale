import type { LavorazioneFilters } from "@/src/services/lavorazioni.service";

/** Shared SSR prefetch filter presets — client-safe for query key alignment. */
export const LAVORAZIONI_ATTIVE_LIGHT_FILTERS: LavorazioneFilters = {
  includeMezzo: true,
  fetchMode: "light",
  includeProfiles: false,
  archived: false,
};

export const LAVORAZIONI_REPORT_FILTERS: LavorazioneFilters = {
  includeMezzo: false,
  fetchMode: "report",
};
