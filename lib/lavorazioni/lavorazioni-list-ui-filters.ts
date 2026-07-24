import { labelLavorazioneStatoDb } from "@/lib/mezzi/interventi-from-lavorazioni-db";
import { normalizeYmdRangeBounds } from "@/lib/lavorazioni/date-day-only";
import {
  lavRowMatchesAdvancedFilters,
  type LavorazioniAdvancedFilters,
  type LavorazioniListFilterVariant,
} from "@/lib/lavorazioni/lavorazioni-advanced-filters";
import { buildSearchDocumentLavorazione } from "@/lib/search/builders/build-search-document-lavorazione";
import { matchSearchString } from "@/lib/search/match";
import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneSchedeStore } from "@/types/schede";

/** @deprecated Usare `LavorazioniAdvancedFilters` + `search` separato. */
export type LavPageFilters = LavorazioniAdvancedFilters & {
  search: string;
};

/** Testo indicizzato per ricerca globale (DB + schede ingresso/lavorazioni). */
export function lavRowSearchHaystack(row: LavorazioneListRow, schedeStore?: LavorazioneSchedeStore): string {
  return buildSearchDocumentLavorazione(row, schedeStore);
}

export function lavRowMatchesGlobalSearch(
  row: LavorazioneListRow,
  query: string,
  schedeStore?: LavorazioneSchedeStore,
): boolean {
  return matchSearchString(query, lavRowSearchHaystack(row, schedeStore)).matches;
}

function dayStartMs(ymd: string): number {
  const t = ymd.trim();
  if (!t) return NaN;
  const d = new Date(t.length <= 10 ? `${t}T00:00:00` : t);
  return d.getTime();
}

function dayEndMs(ymd: string): number {
  const t = ymd.trim();
  if (!t) return NaN;
  const d = new Date(t.length <= 10 ? `${t}T23:59:59.999` : t);
  return d.getTime();
}

function ingressoTimestamp(raw: string | null | undefined): number {
  const t = raw?.trim();
  if (!t) return NaN;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return dayStartMs(t);
  return new Date(t).getTime();
}

/** Filtro client su data ingresso (ISO o yyyy-mm-dd). */
export function lavRowIngressoInRange(row: LavorazioneListRow, daYmd: string, aYmd: string): boolean {
  const { da, a } = normalizeYmdRangeBounds(daYmd, aYmd);
  if (!da && !a) return true;
  const t = ingressoTimestamp(row.data_ingresso?.trim() || row.created_at);
  if (!Number.isFinite(t)) return false;
  if (da) {
    const d0 = dayStartMs(da);
    if (Number.isFinite(d0) && t < d0) return false;
  }
  if (a) {
    const d1 = dayEndMs(a);
    if (Number.isFinite(d1) && t > d1) return false;
  }
  return true;
}

/** Ricerca libera + filtri avanzati — passare `variant` per applicare il filtro completamento solo in archivio. */
export function lavRowMatchesPageFilters(
  row: LavorazioneListRow,
  filters: LavPageFilters,
  schedeStore: LavorazioneSchedeStore | undefined,
  variant: LavorazioniListFilterVariant,
  addettiRecords?: readonly AddettoRecord[],
): boolean {
  if (!lavRowMatchesGlobalSearch(row, filters.search, schedeStore)) return false;
  const { search: _s, ...advanced } = filters;
  return lavRowMatchesAdvancedFilters(row, advanced, schedeStore, variant, undefined, addettiRecords);
}
