import { parseSearchQuery } from "@/lib/search/parse-query";
import { scoreSearchDocument } from "@/lib/search/rank";
import type { ParsedSearchQuery, SearchMatchResult } from "@/lib/search/types";

function matchAllTokens(tokens: string[], document: string, raw: string): SearchMatchResult {
  return scoreSearchDocument(raw, document);
}

/** ponytail: fieldFilters ignorati in Fase 1 — upgrade path verso filtri avanzati */
export function matchSearchQuery(parsed: ParsedSearchQuery, document: string): SearchMatchResult {
  const doc = document.trim();
  if (!parsed.raw.trim()) return { matches: true, score: 0, matchType: null };
  if (!doc) return { matches: false, score: 0, matchType: null };

  if (parsed.mode === "phrase" && parsed.phrase) {
    const scored = scoreSearchDocument(parsed.raw, doc);
    return {
      matches: scored.matches,
      score: scored.matches ? Math.max(scored.score, 80) : 0,
      matchType: scored.matches ? (scored.matchType ?? "contains") : null,
    };
  }

  return matchAllTokens(parsed.tokens, doc, parsed.raw);
}

/** Compat: stringa grezza toolbar → match su document. */
export function matchSearchString(query: string, document: string): SearchMatchResult {
  return matchSearchQuery(parseSearchQuery(query), document);
}

export { scoreSearchDocument, documentMatchesSearchQuery } from "@/lib/search/rank";
