import {
  magazzinoAdvancedFiltersActive,
  magazzinoRowMatchesAdvancedFilters,
  type MagazzinoAdvancedFilters,
} from "@/lib/magazzino/magazzino-advanced-filters";
import { readCompatLabelsForUi } from "@/lib/magazzino/compat/compat-read-guard";
import { buildSearchDocumentMagazzino } from "@/lib/search/builders/build-search-document-magazzino";
import { matchSearchString } from "@/lib/search/match";
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

export function magazzinoRowMatchesPageFilters(
  row: RicambioMagazzino,
  filters: MagazzinoPageFilters,
  listePrefs?: MezziListePrefs,
): boolean {
  if (filters.soloSottoScorta && !(row.scorta < row.scortaMinima)) return false;
  if (filters.nascondiScortaZero && row.scorta <= 0) return false;
  if (!magazzinoRowMatchesGlobalSearch(row, filters.search, listePrefs)) return false;
  const { search: _s, soloSottoScorta: _sc, nascondiScortaZero: _sz, ...advanced } = filters;
  return magazzinoRowMatchesAdvancedFilters(row, advanced, listePrefs);
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

  const push = (label: string) => {
    const t = label.trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    labels.push(t);
  };

  for (const p of prodotti) {
    if (!magazzinoRowMatchesGlobalSearch(p, query, listePrefs)) continue;
    const codiceUi = ricambioCodiceForUi(p.codiceFornitoreOriginale);
    push(codiceUi ? `${codiceUi} · ${p.descrizione || p.marca}` : `${p.descrizione || p.marca}`);
    if (p.marca.trim()) push(p.marca);
    for (const part of [
      p.marca,
      codiceUi,
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
    push(s);
  }

  return labels.slice(0, limit);
}

export { magazzinoAdvancedFiltersActive };
