import {
  entityAutocompleteKey,
  normalizeEntityString,
  scoreEntityMatch,
} from "@/lib/validation/global-entity-validation";

/** Normalizza stringhe per confronto fuzzy (case/accent insensitive). */
export function normListSelectValue(value: string): string {
  return normalizeEntityString(value);
}

/** Chiave alfanumerica per matching permissivo (ignora punteggiatura, spazi, trattini). */
export function normAutocompleteKey(value: string): string {
  return entityAutocompleteKey(value);
}

export function uniqueSortedOptions(options: readonly string[]): string[] {
  return [...new Set(options.map((x) => x.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "it"));
}

export function scoreListSelectOption(query: string, option: string): number {
  return scoreEntityMatch(query, option);
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
  const vLoose = normAutocompleteKey(value);
  const v = normListSelectValue(value);
  if (!v && !vLoose) return null;
  for (const option of options) {
    if (vLoose && normAutocompleteKey(option) === vLoose) return option.trim();
    if (v && normListSelectValue(option) === v) return option.trim();
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
