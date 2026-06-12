import {
  lavorazioniListQueryKey,
  stableLavorazioniFiltersKey,
} from "@/lib/lavorazioni/lavorazioni-list-query-keys";
import type { LavorazioneFilters } from "@/src/services/lavorazioni.service";
import { QK } from "@/src/lib/react-query/query-keys";
import type { DocumentiFilters } from "@/src/services/documenti.service";
import type { MagazzinoFilters } from "@/src/services/magazzino.service";
import type { MezzoFilters } from "@/src/services/mezzi.service";
import type { MovimentiFilters } from "@/src/services/movimenti.service";

export type MezziListVariant = "list" | "report";
export type MagazzinoListVariant = "list" | "report";

export { lavorazioniListQueryKey, stableLavorazioniFiltersKey };

export function mezziListQueryKey(variant: MezziListVariant, filters: MezzoFilters | null | undefined) {
  return [...QK.mezzi, variant, filters ?? null] as const;
}

export function magazzinoListQueryKey(
  variant: MagazzinoListVariant,
  filters: MagazzinoFilters | null | undefined,
) {
  return [...QK.magazzino, variant, filters ?? null] as const;
}

export function movimentiListQueryKey(filters: MovimentiFilters | null | undefined) {
  return [...QK.movimenti, filters ?? null] as const;
}

export function documentiListQueryKey(filters: DocumentiFilters | null | undefined) {
  return [...QK.documenti, filters ?? null] as const;
}

export function preventiviRecordsQueryKey() {
  return [...QK.preventivi, null] as const;
}

export function settingsPayloadQueryKey() {
  return [...QK.settings, "payload"] as const;
}

export function reportManualEntriesQueryKey() {
  return QK.reportManualEntries;
}

export function lavorazioniListQueryKeyFromFilters(
  filters: LavorazioneFilters | undefined,
  clientPortal = false,
) {
  return lavorazioniListQueryKey(filters, clientPortal);
}
