import { parseSearchQuery } from "@/lib/search/parse-query";
import {
  prepareSearchQuery,
  scoreSearchDocument,
  scoreSearchDocumentWithPrepared,
  type PreparedSearchQuery,
} from "@/lib/search/rank";
import { probeParseQuery } from "@/lib/search/search-hot-path-probe";
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
  probeParseQuery();
  return matchSearchQuery(parseSearchQuery(query), document);
}

/** Match con query già parsata (un parse per filter pass). */
export function matchSearchStringWithPrepared(
  prepared: PreparedSearchQuery,
  document: string,
): SearchMatchResult {
  const scored = scoreSearchDocumentWithPrepared(prepared, document);
  return scored;
}

export function matchSearchStringPreparedFromRaw(query: string): PreparedSearchQuery | null {
  return prepareSearchQuery(query);
}

export { scoreSearchDocument, documentMatchesSearchQuery } from "@/lib/search/rank";
