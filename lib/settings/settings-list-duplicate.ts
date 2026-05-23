import {
  ENTITY_SIMILAR_SCORE_MIN,
  entityAutocompleteKey,
  findExactEntityInPool,
  fuzzyMatchEntity,
  normalizeEntityString,
} from "@/lib/validation/global-entity-validation";

/** Soglia minima score per considerare "simile" (includes/subsequence loose). */
export const SETTINGS_SIMILAR_SCORE_MIN = ENTITY_SIMILAR_SCORE_MIN;

export function settingsNormKey(value: string): string {
  return normalizeEntityString(value, { standardizeLegalSuffix: true });
}

export function findExactSettingsDuplicate(
  values: readonly string[],
  candidate: string,
  exclude?: string,
): string | null {
  return findExactEntityInPool(candidate, values, {
    exclude,
    standardizeLegalSuffix: true,
  });
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
  const match = fuzzyMatchEntity(candidate, pool, {
    exclude,
    standardizeLegalSuffix: true,
    minScore: SETTINGS_SIMILAR_SCORE_MIN,
  });
  if (!match) return null;
  if (settingsNormKey(match.entity) === settingsNormKey(candidate)) return null;
  if (entityAutocompleteKey(match.entity, { standardizeLegalSuffix: true }) === entityAutocompleteKey(candidate, { standardizeLegalSuffix: true })) {
    return match.entity;
  }
  return match.entity;
}

export function isBlockingExactDuplicate(
  values: readonly string[],
  candidate: string,
  exclude?: string,
): boolean {
  return findExactSettingsDuplicate(values, candidate, exclude) != null;
}
