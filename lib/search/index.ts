export { buildSearchDocument, buildSearchDocumentFromParts, rowMatchesSearchQuery } from "@/lib/search/build-document";
export { matchSearchQuery, matchSearchString } from "@/lib/search/match";
export { normalizeSearchText, tokenizeSearchQuery } from "@/lib/search/normalize";
export { parseSearchQuery } from "@/lib/search/parse-query";
export {
  combineTokenScores,
  exactScoreForKind,
  scoreTokenAgainstHaystack,
  SEARCH_KIND_EXACT_SCORE,
  SEARCH_MATCH_TYPE_SCORE,
} from "@/lib/search/rank";
export { getSearchConfig, listSearchDomains, resolveExecutionMode, usesServerSearch } from "@/lib/search/registry";
export type {
  FieldFilter,
  ParsedSearchQuery,
  SearchDomainConfig,
  SearchDomainId,
  SearchExecutionMode,
  SearchFieldDef,
  SearchFieldKind,
  SearchMatchResult,
  SearchMatchType,
} from "@/lib/search/types";
export { useGestionaleListSearch, GESTIONALE_SEARCH_DEBOUNCE_MS } from "@/lib/search/use-gestionale-list-search";
export { buildSearchDocumentLavorazione } from "@/lib/search/builders/build-search-document-lavorazione";
export { buildSearchDocumentPreventivo } from "@/lib/search/builders/build-search-document-preventivo";
export { buildSearchDocumentMagazzino } from "@/lib/search/builders/build-search-document-magazzino";
export { normalizedSearchIlikePattern, escapeIlikeToken } from "@/lib/search/server-search-filter";
