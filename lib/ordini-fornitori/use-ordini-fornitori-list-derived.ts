"use client";

import { useMemo } from "react";
import {
  ordineFornitoreListDestinazioneTipo,
  ordineFornitoreListOggetto,
  type OrdiniFornitoriPageFilters,
} from "@/lib/ordini-fornitori/ordine-fornitore-list-ui-filters";
import type { OrdineFornitoreRecord } from "@/lib/ordini-fornitori/types";

export type OrdiniFornitoriListDerived = {
  searchHaystackById: Map<string, string>;
  fornitoriFromRows: string[];
  searchSuggestionPool: string[];
};

function buildSearchHaystack(o: OrdineFornitoreRecord): string {
  return [
    o.numero,
    o.fornitoreLabel,
    ordineFornitoreListOggetto(o),
    ordineFornitoreListDestinazioneTipo(o),
    o.note,
    ...o.righe.map((r) => `${r.codice} ${r.descrizione}`),
  ]
    .join(" ")
    .toLowerCase();
}

/** Single-pass scan su `records` — haystack ricerca, fornitori, suggestion pool. */
export function useOrdiniFornitoriListDerived(records: readonly OrdineFornitoreRecord[]): OrdiniFornitoriListDerived {
  return useMemo(() => {
    const searchHaystackById = new Map<string, string>();
    const fornitoriSet = new Set<string>();
    const suggestionSet = new Set<string>();

    for (const o of records) {
      searchHaystackById.set(o.id, buildSearchHaystack(o));
      const fornitore = o.fornitoreLabel.trim();
      if (fornitore) fornitoriSet.add(fornitore);
      if (o.numero) suggestionSet.add(o.numero);
      if (fornitore) suggestionSet.add(fornitore);
      for (const r of o.righe) {
        if (r.codice?.trim()) suggestionSet.add(r.codice.trim());
        if (r.descrizione.trim()) suggestionSet.add(r.descrizione.trim());
      }
    }

    return {
      searchHaystackById,
      fornitoriFromRows: [...fornitoriSet].sort((a, b) => a.localeCompare(b, "it")),
      searchSuggestionPool: [...suggestionSet].slice(0, 80),
    };
  }, [records]);
}

export function ordineFornitoreRowMatchesPageFiltersDerived(
  o: OrdineFornitoreRecord,
  f: OrdiniFornitoriPageFilters,
  searchHaystack: string,
): boolean {
  const needle = f.search.trim().toLowerCase();
  if (needle && !searchHaystack.includes(needle)) return false;
  if (f.fornitore.trim() && o.fornitoreLabel.trim() !== f.fornitore.trim()) return false;
  if (f.status && o.status !== f.status) return false;
  if (f.dateFrom && o.dataOrdine < f.dateFrom) return false;
  if (f.dateTo && o.dataOrdine > f.dateTo) return false;
  return true;
}
