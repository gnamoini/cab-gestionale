import { magazzinoRowMatchesAdvancedFilters } from "@/lib/magazzino/magazzino-advanced-filters";
import {
  magazzinoRowMatchesGlobalSearch,
  magazzinoRowSearchHaystack,
  type MagazzinoPageFilters,
} from "@/lib/magazzino/magazzino-list-ui-filters";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { normalizeEntityString, scoreEntityMatch } from "@/lib/validation/global-entity-validation";

function matchesHaystack(query: string, hay: string): boolean {
  const q = normalizeEntityString(query);
  if (!q) return true;
  if (hay.includes(q)) return true;
  return q.split(/\s+/).filter(Boolean).every((w) => hay.includes(w) || scoreEntityMatch(w, hay) > 0);
}

/** Precomputed haystack per riga — evita resolveCompatibilitaRicambio ripetuto per keystroke. */
export function buildMagazzinoHaystackIndex(
  prodotti: readonly RicambioMagazzino[],
  listePrefs?: MezziListePrefs,
): Map<string, string> {
  const index = new Map<string, string>();
  for (const row of prodotti) {
    index.set(row.id, magazzinoRowSearchHaystack(row, listePrefs));
  }
  return index;
}

export function magazzinoRowMatchesPageFiltersIndexed(
  row: RicambioMagazzino,
  filters: MagazzinoPageFilters,
  haystackById: Map<string, string>,
  listePrefs?: MezziListePrefs,
): boolean {
  if (filters.soloSottoScorta && !(row.scorta < row.scortaMinima)) return false;
  if (filters.nascondiScortaZero && row.scorta <= 0) return false;
  const hay = haystackById.get(row.id) ?? magazzinoRowSearchHaystack(row, listePrefs);
  if (!matchesHaystack(filters.search, hay)) return false;
  const { search: _s, soloSottoScorta: _sc, nascondiScortaZero: _sz, ...advanced } = filters;
  return magazzinoRowMatchesAdvancedFilters(row, advanced, listePrefs);
}

/** Fallback non indicizzato — stesso comportamento di magazzinoRowMatchesPageFilters. */
export { magazzinoRowMatchesGlobalSearch };
