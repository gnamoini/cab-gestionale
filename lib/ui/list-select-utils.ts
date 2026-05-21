/** Normalizza stringhe per confronto fuzzy (case/accent insensitive). */
export function normListSelectValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function uniqueSortedOptions(options: readonly string[]): string[] {
  return [...new Set(options.map((x) => x.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "it"));
}

export function scoreListSelectOption(query: string, option: string): number {
  const q = normListSelectValue(query);
  const o = normListSelectValue(option);
  if (!q) return 1;
  if (o === q) return 100;
  if (o.startsWith(q)) return 80 - Math.abs(o.length - q.length) / 10;
  if (o.includes(q)) return 55 - o.indexOf(q);
  let qi = 0;
  for (const ch of o) {
    if (ch === q[qi]) qi += 1;
    if (qi >= q.length) return 30 - Math.abs(o.length - q.length) / 10;
  }
  return 0;
}

const BROWSE_ALL_CAP = 200;

export function filterListSelectSuggestions(
  query: string,
  options: readonly string[],
  limit?: number,
): string[] {
  const unique = uniqueSortedOptions(options);
  const q = query.trim();
  if (!q) {
    const cap = limit ?? BROWSE_ALL_CAP;
    return unique.slice(0, cap);
  }
  const ranked = unique
    .map((option) => ({ option, score: scoreListSelectOption(query, option) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.option.localeCompare(b.option, "it"));
  const cap = limit ?? ranked.length;
  return ranked.slice(0, cap).map((x) => x.option);
}

/** Miglior corrispondenza fuzzy quando il filtro live non restituisce risultati. */
export function findBestFuzzyListOption(query: string, options: readonly string[]): string | null {
  const q = query.trim();
  if (!q) return null;
  const unique = uniqueSortedOptions(options);
  let best: { option: string; score: number } | null = null;
  for (const option of unique) {
    const score = scoreListSelectOption(q, option);
    if (score <= 0) continue;
    if (!best || score > best.score) best = { option, score };
  }
  return best?.option ?? null;
}

export function findExactListOption(value: string, options: readonly string[]): string | null {
  const v = normListSelectValue(value);
  if (!v) return null;
  for (const option of options) {
    if (normListSelectValue(option) === v) return option.trim();
  }
  return null;
}

export function isValueInListOptions(value: string, options: readonly string[]): boolean {
  if (!value.trim()) return false;
  return findExactListOption(value, options) !== null;
}

export function resolveListSelectValue(value: string, options: readonly string[]): string | null {
  return findExactListOption(value, options);
}
