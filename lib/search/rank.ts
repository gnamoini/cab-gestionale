import { collapseSearchKey } from "@/lib/search/field-token";
import { parseSearchQuery } from "@/lib/search/parse-query";
import { normalizeSearchText } from "@/lib/search/normalize";
import { probeParseQuery, probeScore } from "@/lib/search/search-hot-path-probe";
import type { SearchFieldMarker } from "@/lib/search/field-token";
import type { SearchFieldKind, SearchMatchResult, SearchMatchType } from "@/lib/search/types";
import { scoreEntityMatch } from "@/lib/validation/global-entity-validation";

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

/** Pesi ranking per marker campo (exact collapsed). */
export const SEARCH_FIELD_MARKER_WEIGHT: Record<SearchFieldMarker, number> = {
  codice: 1000,
  codice_alt: 800,
  targa: 950,
  matricola: 930,
  document: 950,
  telaio: 920,
  cliente: 900,
  marca: 850,
  modello: 830,
  descrizione: 300,
  note: 100,
  categoria: 280,
  ubicazione: 260,
  operatore: 240,
  generic: 200,
};

export const SEARCH_FIELD_CONTAINS_WEIGHT: Partial<Record<SearchFieldMarker, number>> = {
  descrizione: 300,
  note: 100,
  generic: 55,
};

export function exactScoreForKind(kind: SearchFieldKind): number {
  return SEARCH_KIND_EXACT_SCORE[kind] ?? SEARCH_KIND_EXACT_SCORE.generic;
}

const MARKER_PREFIXES: SearchFieldMarker[] = [
  "codice",
  "codice_alt",
  "targa",
  "matricola",
  "document",
  "telaio",
  "cliente",
  "marca",
  "modello",
  "descrizione",
  "note",
  "categoria",
  "ubicazione",
  "operatore",
  "generic",
];

function parseMarkedToken(word: string): { marker: SearchFieldMarker | null; value: string } {
  const idx = word.indexOf(":");
  if (idx <= 0) return { marker: null, value: collapseSearchKey(word) };
  const marker = word.slice(0, idx) as SearchFieldMarker;
  const value = word.slice(idx + 1);
  return { marker: MARKER_PREFIXES.includes(marker) ? marker : null, value };
}

function scoreMarkedExact(marker: SearchFieldMarker, collapsed: string, docWord: string): number {
  const parsed = parseMarkedToken(docWord);
  if (!parsed.marker || parsed.marker !== marker) return 0;
  if (parsed.value === collapsed) return SEARCH_FIELD_MARKER_WEIGHT[marker] ?? 500;
  if (parsed.value.startsWith(collapsed)) {
    return Math.max((SEARCH_FIELD_MARKER_WEIGHT[marker] ?? 500) - 50, SEARCH_MATCH_TYPE_SCORE.prefix);
  }
  if (collapsed.startsWith(parsed.value)) {
    return Math.max((SEARCH_FIELD_MARKER_WEIGHT[marker] ?? 500) - 80, SEARCH_MATCH_TYPE_SCORE.prefix);
  }
  return 0;
}

/** SSOT: token collassato contro documento indicizzato. */
export function scoreCollapsedTokenAgainstDocument(
  collapsed: string,
  document: string,
): { score: number; matchType: SearchMatchType | null; matches: boolean } {
  if (!collapsed) return { score: 0, matchType: null, matches: true };
  const doc = document.trim();
  if (!doc) return { score: 0, matchType: null, matches: false };

  const words = doc.split(/\s+/).filter(Boolean);
  let best = 0;
  let bestType: SearchMatchType | null = null;

  for (const marker of MARKER_PREFIXES) {
    const marked = `${marker}:${collapsed}`;
    if (doc.includes(marked)) {
      const w = SEARCH_FIELD_MARKER_WEIGHT[marker] ?? 500;
      if (w > best) {
        best = w;
        bestType = "exact";
      }
    }
    for (const word of words) {
      const s = scoreMarkedExact(marker, collapsed, word);
      if (s > best) {
        best = s;
        bestType = s >= (SEARCH_FIELD_MARKER_WEIGHT[marker] ?? 0) - 10 ? "exact" : "prefix";
      }
    }
  }

  if (doc.includes(collapsed)) {
    const containsScore = SEARCH_MATCH_TYPE_SCORE.contains + Math.min(collapsed.length, 20);
    if (containsScore > best) {
      best = containsScore;
      bestType = "contains";
    }
  }

  for (const word of words) {
    const { marker, value } = parseMarkedToken(word);
    if (value === collapsed) {
      const w = marker
        ? (SEARCH_FIELD_MARKER_WEIGHT[marker] ?? SEARCH_FIELD_MARKER_WEIGHT.generic)
        : SEARCH_MATCH_TYPE_SCORE.contains + 10;
      if (w > best) {
        best = w;
        bestType = "exact";
      }
    } else if (value.startsWith(collapsed)) {
      const w = marker
        ? Math.max((SEARCH_FIELD_MARKER_WEIGHT[marker] ?? 400) - 60, SEARCH_MATCH_TYPE_SCORE.prefix)
        : SEARCH_MATCH_TYPE_SCORE.prefix;
      if (w > best) {
        best = w;
        bestType = "prefix";
      }
    } else if (value.includes(collapsed)) {
      const w = marker
        ? (SEARCH_FIELD_CONTAINS_WEIGHT[marker] ?? SEARCH_MATCH_TYPE_SCORE.contains)
        : SEARCH_MATCH_TYPE_SCORE.contains;
      if (w > best) {
        best = w;
        bestType = "contains";
      }
    }
  }

  const spaced = normalizeSearchText(collapsed);
  if (spaced && doc.includes(spaced)) {
    const w = SEARCH_MATCH_TYPE_SCORE.contains;
    if (w > best) {
      best = w;
      bestType = "contains";
    }
  }

  if (best > 0) return { score: best, matchType: bestType, matches: true };

  const fuzzy = scoreEntityMatch(collapsed, doc);
  if (fuzzy >= 55) {
    return {
      score: Math.max(SEARCH_MATCH_TYPE_SCORE.similarity, fuzzy * 0.4),
      matchType: "similarity",
      matches: true,
    };
  }

  return { score: 0, matchType: null, matches: false };
}

export function getCollapsedQueryTokens(raw: string): string[] {
  const trimmed = raw.trim().replace(/\s*·\s*/g, " ");
  if (!trimmed) return [];

  probeParseQuery();
  const parsed = parseSearchQuery(trimmed);
  if (parsed.mode === "phrase" && parsed.phrase) {
    const words = parsed.phrase.split(/\s+/).filter(Boolean);
    if (words.length > 1) {
      return [...new Set(words.map((w) => collapseSearchKey(w)).filter(Boolean))];
    }
    const c = collapseSearchKey(parsed.phrase);
    return c ? [c] : [];
  }

  const freeText = trimmed.replace(/\b[a-zA-Z_][\w-]*\s*:\s*\S+/g, " ").trim();
  const words = freeText.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  return [...new Set(words.map((w) => collapseSearchKey(w)).filter(Boolean))];
}

export function documentMatchesSearchQuery(query: string, document: string): boolean {
  return scoreSearchDocument(query, document).matches;
}

export type PreparedSearchQuery = {
  raw: string;
  collapsedTokens: string[];
};

/** Parse + collapse once per filter/sort pass. */
export function prepareSearchQuery(raw: string): PreparedSearchQuery | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const collapsedTokens = getCollapsedQueryTokens(trimmed);
  if (collapsedTokens.length === 0) return null;
  return { raw: trimmed, collapsedTokens };
}

export function scoreSearchDocumentWithPrepared(
  prepared: PreparedSearchQuery,
  document: string,
): SearchMatchResult {
  probeScore();
  return scoreSearchDocumentWithCollapsedTokens(prepared.collapsedTokens, prepared.raw, document);
}

export function scoreSearchDocumentWithCollapsedTokens(
  tokens: readonly string[],
  raw: string,
  document: string,
): SearchMatchResult {
  if (tokens.length === 0) return { matches: true, score: 0, matchType: null };

  const scores: number[] = [];
  let bestMatchType: SearchMatchType | null = null;

  for (const token of tokens) {
    const r = scoreCollapsedTokenAgainstDocument(token, document);
    if (!r.matches) return { matches: false, score: 0, matchType: null };
    scores.push(r.score);
    if (r.matchType === "exact") bestMatchType = "exact";
    else if (r.matchType === "prefix" && bestMatchType !== "exact") bestMatchType = "prefix";
    else if (r.matchType === "contains" && !bestMatchType) bestMatchType = "contains";
    else if (r.matchType === "similarity" && !bestMatchType) bestMatchType = "similarity";
  }

  return {
    matches: true,
    score: combineTokenScores(scores),
    matchType: bestMatchType,
  };
}

export function scoreSearchDocument(query: string, document: string): SearchMatchResult {
  const trimmed = query.trim();
  if (!trimmed) return { matches: true, score: 0, matchType: null };

  const prepared = prepareSearchQuery(trimmed);
  if (!prepared) return { matches: true, score: 0, matchType: null };

  probeScore();
  return scoreSearchDocumentWithCollapsedTokens(prepared.collapsedTokens, prepared.raw, document);
}

export function scoreTokenAgainstHaystack(
  token: string,
  haystack: string,
  kind: SearchFieldKind = "generic",
): { score: number; matchType: SearchMatchType | null } {
  const collapsed = collapseSearchKey(token);
  const r = scoreCollapsedTokenAgainstDocument(collapsed || token, haystack);
  if (r.score > 0) return { score: r.score, matchType: r.matchType };
  const fuzzy = scoreEntityMatch(token, haystack);
  if (fuzzy > 0) {
    return { score: Math.max(SEARCH_MATCH_TYPE_SCORE.similarity, fuzzy * 0.4), matchType: "similarity" };
  }
  void kind;
  return { score: 0, matchType: null };
}

export function combineTokenScores(scores: number[]): number {
  if (scores.length === 0) return 0;
  return Math.min(...scores);
}
