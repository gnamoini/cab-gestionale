import {
  magazzinoAdvancedFiltersActive,
  magazzinoRowMatchesAdvancedFilters,
  type MagazzinoAdvancedFilters,
} from "@/lib/magazzino/magazzino-advanced-filters";
import { readCompatLabelsForUi } from "@/lib/magazzino/compat/compat-read-guard";
import { buildSearchDocumentMagazzino } from "@/lib/search/builders/build-search-document-magazzino";
import { matchSearchString, scoreSearchDocument } from "@/lib/search/match";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { ricambioCodiceForUi } from "@/lib/magazzino/ricambio-codice";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { filterListSelectSuggestions } from "@/lib/ui/list-select-utils";

export type MagazzinoPageFilters = MagazzinoAdvancedFilters & {
  search: string;
  soloSottoScorta: boolean;
  nascondiScortaZero: boolean;
};

export function magazzinoRowSearchHaystack(row: RicambioMagazzino, listePrefs?: MezziListePrefs): string {
  return buildSearchDocumentMagazzino(row, listePrefs);
}

export function magazzinoRowMatchesGlobalSearch(
  row: RicambioMagazzino,
  query: string,
  listePrefs?: MezziListePrefs,
): boolean {
  return matchSearchString(query, magazzinoRowSearchHaystack(row, listePrefs)).matches;
}

export function magazzinoRowSearchScore(
  row: RicambioMagazzino,
  query: string,
  listePrefs?: MezziListePrefs,
): number {
  return scoreSearchDocument(query, magazzinoRowSearchHaystack(row, listePrefs)).score;
}

export function magazzinoRowMatchesPageFilters(
  row: RicambioMagazzino,
  filters: MagazzinoPageFilters,
  listePrefs?: MezziListePrefs,
): boolean {
  if (filters.soloSottoScorta && !(row.scorta < row.scortaMinima)) return false;
  if (filters.nascondiScortaZero && row.scorta <= 0) return false;
  if (!magazzinoRowMatchesGlobalSearch(row, filters.search, listePrefs)) return false;
  const { ...advanced } = filters;
  return magazzinoRowMatchesAdvancedFilters(row, advanced, listePrefs);
}

/** Query effettiva da voce suggerimento `codice · descrizione` — filtra per codice. */
export function magazzinoSearchQueryFromSuggestion(label: string): string {
  const t = label.trim();
  const sep = " · ";
  const idx = t.indexOf(sep);
  if (idx > 0) return t.slice(0, idx).trim();
  return t;
}

export function buildMagazzinoSearchSuggestions(
  prodotti: readonly RicambioMagazzino[],
  query: string,
  limit = 8,
  listePrefs?: MezziListePrefs,
): string[] {
  if (!query.trim()) return [];

  const labels: string[] = [];
  const seen = new Set<string>();
  const tokens = new Set<string>();
  const codiciWithRicambio = new Set<string>();

  const markCodiceLinked = (codice: string) => {
    const t = codice.trim();
    if (!t) return;
    codiciWithRicambio.add(t.toLowerCase());
  };

  const push = (label: string) => {
    const t = label.trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    labels.push(t);
  };

  for (const p of prodotti) {
    if (!magazzinoRowMatchesGlobalSearch(p, query, listePrefs)) continue;
    const codiceUi = ricambioCodiceForUi(p.codiceFornitoreOriginale);
    const descPart = (p.descrizione || p.marca).trim();
    const codiceLinked = Boolean(codiceUi && descPart);

    if (codiceLinked) {
      push(`${codiceUi} · ${descPart}`);
      markCodiceLinked(codiceUi);
      markCodiceLinked(p.codiceFornitoreOriginale);
    } else if (codiceUi) {
      push(codiceUi);
    } else if (descPart) {
      push(descPart);
    }

    if (p.marca.trim() && p.marca.trim() !== descPart) push(p.marca);
    for (const part of [
      p.marca,
      codiceLinked ? "" : codiceUi,
      p.codiceFornitoreOriginaleSecondario,
      p.descrizione,
      p.categoria,
      ...readCompatLabelsForUi(p, listePrefs, "magazzino-list-ui-filters.suggestions"),
    ]) {
      const t = part.trim();
      if (t.length >= 2) tokens.add(t);
    }
    if (labels.length >= limit * 2) break;
  }

  for (const s of filterListSelectSuggestions(query, [...tokens], limit)) {
    if (codiciWithRicambio.has(s.trim().toLowerCase())) continue;
    push(s);
  }

  return labels.slice(0, limit);
}

export { magazzinoAdvancedFiltersActive };
