import {
  magazzinoAdvancedFiltersActive,
  magazzinoRowMatchesAdvancedFilters,
  type MagazzinoAdvancedFilters,
} from "@/lib/magazzino/magazzino-advanced-filters";
import { readCompatLabelsForUi } from "@/lib/magazzino/compat/compat-read-guard";
import { normalizedSearchIndex } from "@/lib/magazzino/compat/compat-search-index";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { normalizeEntityString, scoreEntityMatch } from "@/lib/validation/global-entity-validation";
import { filterListSelectSuggestions } from "@/lib/ui/list-select-utils";

export type MagazzinoPageFilters = MagazzinoAdvancedFilters & {
  search: string;
  soloSottoScorta: boolean;
  nascondiScortaZero: boolean;
};

export function magazzinoRowSearchHaystack(row: RicambioMagazzino, listePrefs?: MezziListePrefs): string {
  return normalizedSearchIndex(row, listePrefs);
}

export function magazzinoRowMatchesGlobalSearch(
  row: RicambioMagazzino,
  query: string,
  listePrefs?: MezziListePrefs,
): boolean {
  const q = normalizeEntityString(query);
  if (!q) return true;
  const hay = magazzinoRowSearchHaystack(row, listePrefs);
  if (hay.includes(q)) return true;
  return q.split(/\s+/).filter(Boolean).every((w) => hay.includes(w) || scoreEntityMatch(w, hay) > 0);
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
  const q = query.trim().toLowerCase();
  const labels: string[] = [];
  const seen = new Set<string>();

  const push = (label: string) => {
    const t = label.trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    labels.push(t);
  };

  for (const p of prodotti) {
    if (q && !magazzinoRowSearchHaystack(p, listePrefs).includes(q)) continue;
    push(`${p.codiceFornitoreOriginale} · ${p.descrizione || p.marca}`);
    if (p.marca.trim()) push(p.marca);
    if (labels.length >= limit * 2) break;
  }

  const tokens = new Set<string>();
  for (const p of prodotti) {
    for (const part of [
      p.marca,
      p.codiceFornitoreOriginale,
      p.codiceFornitoreOriginaleSecondario,
      p.descrizione,
      p.categoria,
      ...readCompatLabelsForUi(p, listePrefs, "magazzino-list-ui-filters.suggestions"),
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

export { magazzinoAdvancedFiltersActive };
