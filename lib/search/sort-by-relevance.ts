/** Ordinamento per rilevanza ricerca — tie-break opzionale. */

export function compareSearchRelevance<T>(
  a: T,
  b: T,
  query: string,
  scoreRow: (row: T, query: string) => number,
): number {
  const q = query.trim();
  if (!q) return 0;
  const sa = scoreRow(a, q);
  const sb = scoreRow(b, q);
  if (sa !== sb) return sb - sa;
  return 0;
}

export function sortRowsBySearchRelevance<T>(
  rows: readonly T[],
  query: string,
  scoreRow: (row: T, query: string) => number,
  tieBreak?: (a: T, b: T) => number,
): T[] {
  const q = query.trim();
  if (!q) return [...rows];
  return [...rows].sort((a, b) => {
    const primary = compareSearchRelevance(a, b, q, scoreRow);
    if (primary !== 0) return primary;
    return tieBreak?.(a, b) ?? 0;
  });
}

export function isSearchRelevanceSortActive(searchApplied: string, sortColumn: unknown): boolean {
  return searchApplied.trim().length > 0 && (sortColumn === null || sortColumn === undefined);
}
