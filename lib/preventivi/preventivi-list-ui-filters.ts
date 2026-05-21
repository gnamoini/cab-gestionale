import type { PreventivoRecord, PreventivoStato } from "@/lib/preventivi/types";
import {
  preventiviAdvancedFiltersActive,
  preventiviRowMatchesAdvancedFilters,
  preventivoStatoLabel,
  type PreventiviAdvancedFilters,
} from "@/lib/preventivi/preventivi-advanced-filters";
import { filterListSelectSuggestions } from "@/lib/ui/list-select-utils";

export type PreventiviPageFilters = PreventiviAdvancedFilters & {
  search: string;
};

/** Testo indicizzato per ricerca globale preventivi. */
export function preventivoRowSearchHaystack(row: PreventivoRecord): string {
  return [
    row.numero,
    row.cliente,
    row.cantiere,
    row.utilizzatore,
    row.macchinaRiassunto,
    row.targa,
    row.matricola,
    row.nScuderia,
    row.marcaAttrezzatura,
    row.modelloAttrezzatura,
    row.lavorazioneId,
    row.stato,
    preventivoStatoLabel(row.stato),
    row.descrizioneLavorazioniCliente,
  ]
    .filter((s) => typeof s === "string" && s.trim().length > 0)
    .join(" ")
    .toLowerCase();
}

export function preventivoRowMatchesGlobalSearch(row: PreventivoRecord, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return preventivoRowSearchHaystack(row).includes(q);
}

export function preventivoRowMatchesPageFilters(row: PreventivoRecord, filters: PreventiviPageFilters): boolean {
  if (!preventivoRowMatchesGlobalSearch(row, filters.search)) return false;
  const { search: _s, ...advanced } = filters;
  return preventiviRowMatchesAdvancedFilters(row, advanced);
}

/** Suggerimenti live per la barra ricerca (etichette leggibili). */
export function buildPreventiviSearchSuggestions(
  rows: readonly PreventivoRecord[],
  query: string,
  limit = 8,
): string[] {
  const q = query.trim().toLowerCase();
  const labels: string[] = [];
  const seen = new Set<string>();

  const push = (label: string) => {
    const t = label.trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    labels.push(t);
  };

  for (const r of rows) {
    if (q && !preventivoRowSearchHaystack(r).includes(q)) continue;
    push(`${r.numero} · ${r.cliente || "—"}`);
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
