import type { PreventivoRecord, PreventivoStato } from "@/lib/preventivi/types";
import {
  preventiviAdvancedFiltersActive,
  preventiviRowMatchesAdvancedFilters,

  type PreventiviAdvancedFilters,
} from "@/lib/preventivi/preventivi-advanced-filters";
import { preventivoTipoDocumentoLabel } from "@/lib/preventivi/preventivi-tipo-documento";
import { buildSearchDocumentPreventivo } from "@/lib/search/builders/build-search-document-preventivo";
import { matchSearchString, scoreSearchDocument } from "@/lib/search/match";
import { filterListSelectSuggestions } from "@/lib/ui/list-select-utils";

export type PreventiviPageFilters = PreventiviAdvancedFilters & {
  search: string;
};

/** Testo indicizzato per ricerca globale preventivi. */
export function preventivoRowSearchHaystack(row: PreventivoRecord): string {
  return buildSearchDocumentPreventivo(row);
}

export function preventivoRowMatchesGlobalSearch(row: PreventivoRecord, query: string): boolean {
  return matchSearchString(query, preventivoRowSearchHaystack(row)).matches;
}

export function preventivoRowSearchScore(row: PreventivoRecord, query: string): number {
  return scoreSearchDocument(query, preventivoRowSearchHaystack(row)).score;
}

/** Query effettiva da voce suggerimento `numero · tipo · cliente` — filtra per numero. */
export function preventivoSearchQueryFromSuggestion(label: string): string {
  const t = label.trim();
  const sep = " · ";
  const idx = t.indexOf(sep);
  if (idx > 0) return t.slice(0, idx).trim();
  return t;
}

export function preventivoRowMatchesPageFilters(
  row: PreventivoRecord,
  filters: PreventiviPageFilters,
  options?: { skipSearchFilter?: boolean },
): boolean {
  if (!options?.skipSearchFilter && !preventivoRowMatchesGlobalSearch(row, filters.search)) return false;
  const { ...advanced } = filters;
  return preventiviRowMatchesAdvancedFilters(row, advanced);
}

/** Suggerimenti live per la barra ricerca (etichette leggibili). */
export function buildPreventiviSearchSuggestions(
  rows: readonly PreventivoRecord[],
  query: string,
  limit = 8,
): string[] {
  const labels: string[] = [];
  const seen = new Set<string>();

  const push = (label: string) => {
    const t = label.trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    labels.push(t);
  };

  for (const r of rows) {
    if (query.trim() && !preventivoRowMatchesGlobalSearch(r, query)) continue;
    push(`${r.numero} · ${preventivoTipoDocumentoLabel(r.tipoDocumento, "short")} · ${r.cliente || "—"}`);
    if (r.macchinaRiassunto.trim()) push(`${r.numero} · ${r.macchinaRiassunto.trim()}`);
    if (labels.length >= limit * 2) break;
  }

  const tokens = new Set<string>();
  for (const r of rows) {
    for (const part of [
      r.numero,
      r.cliente,
      r.cantiere,
      r.utilizzatore,
      r.macchinaRiassunto,
      r.marcaAttrezzatura,
      r.modelloAttrezzatura,
      r.targa,
      r.matricola,
    ]) {
      const t = part.trim();
      if (t.length >= 2) tokens.add(t);
    }
  }

  for (const s of filterListSelectSuggestions(query, [...tokens], limit)) {
    push(s);
  }

  return labels.slice(0, limit);
}

export { preventiviAdvancedFiltersActive, type PreventivoStato };
