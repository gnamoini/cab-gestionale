import { entityAutocompleteKey, scoreEntityMatch } from "@/lib/validation/global-entity-validation";
import { normalizeSearchText } from "@/lib/search/normalize";
import type { SearchFieldKind, SearchMatchType } from "@/lib/search/types";

/** Pesi base per tipo match (plan v2). */
export const SEARCH_MATCH_TYPE_SCORE: Record<SearchMatchType, number> = {
  exact: 0,
  prefix: 70,
  contains: 45,
  fts: 35,
  similarity: 20,
};

/** Pesi per kind su match exact. */
export const SEARCH_KIND_EXACT_SCORE: Record<SearchFieldKind, number> = {
  code: 100,
  plate: 95,
  document: 92,
  customer: 90,
  operator: 88,
  brand: 85,
  model: 83,
  category: 80,
  location: 78,
  description: 50,
  note: 40,
  generic: 55,
};

export function exactScoreForKind(kind: SearchFieldKind): number {
  return SEARCH_KIND_EXACT_SCORE[kind] ?? SEARCH_KIND_EXACT_SCORE.generic;
}

export function scoreTokenAgainstHaystack(
  token: string,
  haystack: string,
  kind: SearchFieldKind = "generic",
): { score: number; matchType: SearchMatchType | null } {
  const q = normalizeSearchText(token);
  if (!q) return { score: 0, matchType: null };
  const hay = haystack;
  if (!hay) return { score: 0, matchType: null };

  const qKey = entityAutocompleteKey(q);
  const hayWords = hay.split(/\s+/).filter(Boolean);

  for (const word of hayWords) {
    const wKey = entityAutocompleteKey(word);
    if (qKey && wKey === qKey) {
      return { score: exactScoreForKind(kind), matchType: "exact" };
    }
    if (word === q) {
      return { score: exactScoreForKind(kind), matchType: "exact" };
    }
  }

  if (hay.startsWith(q) || hayWords.some((w) => w.startsWith(q))) {
    return { score: SEARCH_MATCH_TYPE_SCORE.prefix, matchType: "prefix" };
  }

  if (hay.includes(q)) {
    return { score: SEARCH_MATCH_TYPE_SCORE.contains, matchType: "contains" };
  }

  const fuzzy = scoreEntityMatch(q, hay);
  if (fuzzy > 0) {
    return { score: Math.max(SEARCH_MATCH_TYPE_SCORE.similarity, fuzzy * 0.4), matchType: "similarity" };
  }

  return { score: 0, matchType: null };
}

export function combineTokenScores(scores: number[]): number {
  if (scores.length === 0) return 0;
  return Math.max(...scores);
}
