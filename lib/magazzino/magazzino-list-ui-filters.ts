import {
  magazzinoAdvancedFiltersActive,
  magazzinoRowMatchesAdvancedFilters,
  type MagazzinoAdvancedFilters,
} from "@/lib/magazzino/magazzino-advanced-filters";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { filterListSelectSuggestions } from "@/lib/ui/list-select-utils";

export type MagazzinoPageFilters = MagazzinoAdvancedFilters & {
  search: string;
  soloSottoScorta: boolean;
};

export function magazzinoRowSearchHaystack(row: RicambioMagazzino): string {
  return [
    row.marca,
    row.codiceFornitoreOriginale,
    row.codiceFornitoreNonOriginale,
    row.descrizione,
    row.note,
    row.categoria,
    row.fornitoreNonOriginale,
    ...row.compatibilitaMezzi,
  ]
    .filter((s) => typeof s === "string" && s.trim().length > 0)
    .join(" ")
    .toLowerCase();
}

export function magazzinoRowMatchesGlobalSearch(row: RicambioMagazzino, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return magazzinoRowSearchHaystack(row).includes(q);
}

export function magazzinoRowMatchesPageFilters(row: RicambioMagazzino, filters: MagazzinoPageFilters): boolean {
  if (filters.soloSottoScorta && !(row.scorta < row.scortaMinima)) return false;
  if (!magazzinoRowMatchesGlobalSearch(row, filters.search)) return false;
  const { search: _s, soloSottoScorta: _sc, ...advanced } = filters;
  return magazzinoRowMatchesAdvancedFilters(row, advanced);
}

export function buildMagazzinoSearchSuggestions(
  prodotti: readonly RicambioMagazzino[],
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

  for (const p of prodotti) {
    if (q && !magazzinoRowSearchHaystack(p).includes(q)) continue;
    push(`${p.codiceFornitoreOriginale} · ${p.descrizione || p.marca}`);
    if (p.marca.trim()) push(p.marca);
    if (labels.length >= limit * 2) break;
  }

  const tokens = new Set<string>();
  for (const p of prodotti) {
    for (const part of [
      p.marca,
      p.codiceFornitoreOriginale,
      p.descrizione,
      p.categoria,
      ...p.compatibilitaMezzi,
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
