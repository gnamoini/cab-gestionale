import { parseSearchQuery } from "@/lib/search/parse-query";
import { combineTokenScores, scoreTokenAgainstHaystack } from "@/lib/search/rank";
import { normalizeSearchText } from "@/lib/search/normalize";
import type { ParsedSearchQuery, SearchMatchResult } from "@/lib/search/types";
import { scoreEntityMatch } from "@/lib/validation/global-entity-validation";

function matchPhrase(phrase: string, document: string): boolean {
  const p = normalizeSearchText(phrase);
  if (!p) return true;
  const doc = document;
  if (doc.includes(p)) return true;
  return scoreEntityMatch(p, doc) >= 55;
}

function matchAllTokens(tokens: string[], document: string): SearchMatchResult {
  if (tokens.length === 0) return { matches: true, score: 0, matchType: null };

  const scores: number[] = [];
  let bestMatchType: SearchMatchResult["matchType"] = "contains";

  for (const token of tokens) {
    const { score, matchType } = scoreTokenAgainstHaystack(token, document);
    if (score <= 0) {
      const fuzzy = scoreEntityMatch(token, document);
      if (fuzzy <= 0) return { matches: false, score: 0, matchType: null };
      scores.push(fuzzy * 0.4);
      bestMatchType = "similarity";
    } else {
      scores.push(score);
      if (matchType === "exact") bestMatchType = "exact";
      else if (matchType === "prefix" && bestMatchType !== "exact") bestMatchType = "prefix";
    }
  }

  return {
    matches: true,
    score: combineTokenScores(scores),
    matchType: bestMatchType,
  };
}

/** ponytail: fieldFilters ignorati in Fase 1 — upgrade path verso filtri avanzati */
export function matchSearchQuery(parsed: ParsedSearchQuery, document: string): SearchMatchResult {
  const doc = document.trim();
  if (!parsed.raw.trim()) return { matches: true, score: 0, matchType: null };
  if (!doc) return { matches: false, score: 0, matchType: null };

  if (parsed.mode === "phrase" && parsed.phrase) {
    const ok = matchPhrase(parsed.phrase, doc);
    return {
      matches: ok,
      score: ok ? 80 : 0,
      matchType: ok ? "contains" : null,
    };
  }

  return matchAllTokens(parsed.tokens, doc);
}

/** Compat: stringa grezza toolbar → match su document. */
export function matchSearchString(query: string, document: string): SearchMatchResult {
  return matchSearchQuery(parseSearchQuery(query), document);
}
