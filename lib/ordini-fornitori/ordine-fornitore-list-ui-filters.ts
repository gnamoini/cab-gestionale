import type { OrdineFornitoreRecord, OrdineFornitoreStatus } from "@/lib/ordini-fornitori/types";
import { parseOrdineFornitoreDestinatarioSnapshot } from "@/lib/ordini-fornitori/destinatario-snapshot";
import { readOrdineOggetto } from "@/lib/ordini-fornitori/ordine-fornitore-oggetto";
import { buildSearchDocumentFromParts } from "@/lib/search/build-document";
import { matchSearchString } from "@/lib/search/match";
import type { OrdineFornitoreDestinazioneTipo } from "@/lib/ordini-fornitori/ordine-fornitore-destinazione";

const DESTINAZIONE_TIPO_LIST_LABEL: Record<OrdineFornitoreDestinazioneTipo, string> = {
  magazzino: "Magazzino",
  altro: "Altro",
};

export function ordineFornitoreListOggetto(
  record: Pick<OrdineFornitoreRecord, "oggettoOrdine" | "meta">,
): string {
  return record.oggettoOrdine.trim() || readOrdineOggetto(record.meta).trim();
}

/** Etichetta lista: Magazzino o Altro (da snapshot tipo, con fallback legacy). */
export function ordineFornitoreListDestinazioneTipo(
  record: Pick<OrdineFornitoreRecord, "destinazione" | "destinazioneSnapshot">,
): string {
  const parsed = parseOrdineFornitoreDestinatarioSnapshot(record.destinazioneSnapshot, record.destinazione);
  if (parsed.tipo) return DESTINAZIONE_TIPO_LIST_LABEL[parsed.tipo];
  if (!record.destinazione.trim() && !parsed.indirizzo.trim()) return DESTINAZIONE_TIPO_LIST_LABEL.magazzino;
  return DESTINAZIONE_TIPO_LIST_LABEL.altro;
}

export type OrdiniFornitoriPageFilters = {
  search: string;
  fornitore: string;
  status: OrdineFornitoreStatus | "";
  dateFrom: string;
  dateTo: string;
};

export const ORDINI_FORNITORI_FILTERS_EMPTY: OrdiniFornitoriPageFilters = {
  search: "",
  fornitore: "",
  status: "",
  dateFrom: "",
  dateTo: "",
};

export function ordiniFornitoriFiltersActive(f: OrdiniFornitoriPageFilters): boolean {
  return Boolean(
    f.fornitore.trim() ||
      f.status ||
      f.dateFrom ||
      f.dateTo,
  );
}

function ordineSearchDocument(o: OrdineFornitoreRecord): string {
  return buildSearchDocumentFromParts([
    o.numero,
    o.fornitoreLabel,
    ordineFornitoreListOggetto(o),
    ordineFornitoreListDestinazioneTipo(o),
    o.note,
    ...o.righe.flatMap((r) => [r.codice, r.descrizione]),
  ]);
}

function matchesSearch(o: OrdineFornitoreRecord, q: string): boolean {
  return matchSearchString(q, ordineSearchDocument(o)).matches;
}

export function ordineFornitoreRowMatchesPageFilters(
  o: OrdineFornitoreRecord,
  f: OrdiniFornitoriPageFilters,
): boolean {
  if (!matchesSearch(o, f.search)) return false;
  if (f.fornitore.trim() && o.fornitoreLabel.trim() !== f.fornitore.trim()) return false;
  if (f.status && o.status !== f.status) return false;
  if (f.dateFrom && o.dataOrdine < f.dateFrom) return false;
  if (f.dateTo && o.dataOrdine > f.dateTo) return false;
  return true;
}

export function buildOrdiniFornitoriSearchSuggestions(records: readonly OrdineFornitoreRecord[]): string[] {
  const set = new Set<string>();
  for (const o of records) {
    if (o.numero) set.add(o.numero);
    if (o.fornitoreLabel.trim()) set.add(o.fornitoreLabel.trim());
    for (const r of o.righe) {
      if (r.codice?.trim()) set.add(r.codice.trim());
      if (r.descrizione.trim()) set.add(r.descrizione.trim());
    }
  }
  return [...set].slice(0, 80);
}
