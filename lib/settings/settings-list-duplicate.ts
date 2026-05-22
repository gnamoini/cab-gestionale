import { findBestFuzzyListOption, normAutocompleteKey, normListSelectValue } from "@/lib/ui/list-select-utils";

/** Soglia minima score per considerare "simile" (includes/subsequence loose). */
export const SETTINGS_SIMILAR_SCORE_MIN = 55;

export function settingsNormKey(value: string): string {
  return normListSelectValue(value);
}

export function findExactSettingsDuplicate(
  values: readonly string[],
  candidate: string,
  exclude?: string,
): string | null {
  const c = settingsNormKey(candidate);
  if (!c) return null;
  const ex = exclude ? settingsNormKey(exclude) : "";
  for (const v of values) {
    if (exclude && settingsNormKey(v) === ex) continue;
    if (settingsNormKey(v) === c) return v;
  }
  return null;
}

export function findSimilarSettingsDuplicate(
  values: readonly string[],
  candidate: string,
  exclude?: string,
): string | null {
  const exact = findExactSettingsDuplicate(values, candidate, exclude);
  if (exact) return exact;
  const pool = exclude
    ? values.filter((v) => settingsNormKey(v) !== settingsNormKey(exclude))
    : [...values];
  const best = findBestFuzzyListOption(candidate, pool);
  if (!best) return null;
  if (settingsNormKey(best) === settingsNormKey(candidate)) return null;
  if (normAutocompleteKey(best) === normAutocompleteKey(candidate)) return best;
  return best;
}

export function isBlockingExactDuplicate(
  values: readonly string[],
  candidate: string,
  exclude?: string,
): boolean {
  return findExactSettingsDuplicate(values, candidate, exclude) != null;
}
