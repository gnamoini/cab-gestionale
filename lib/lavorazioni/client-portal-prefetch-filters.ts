import type { LavorazioneFilters } from "@/src/services/lavorazioni.service";

/** Portale — in corso (allineato a `useClientLavorazioniInCorsoQuery`). */
export const CLIENT_PORTAL_INCORSO_FILTERS: LavorazioneFilters = {
  archived: false,
  includeMezzo: true,
  fetchMode: "light",
  includeProfiles: true,
};

/** Portale — archivio (allineato a `useClientLavorazioniArchivioQuery`). */
export const CLIENT_PORTAL_ARCHIVIO_FILTERS: LavorazioneFilters = {
  archived: true,
  includeMezzo: true,
  fetchMode: "light",
  includeProfiles: true,
};

/** Portale — conteggio archivio head (titolo sezione collassata). */
export const CLIENT_PORTAL_ARCHIVIO_COUNT_FILTERS: LavorazioneFilters = {
  ...CLIENT_PORTAL_ARCHIVIO_FILTERS,
  includeProfiles: false,
};
