import { parseSearchQuery } from "@/lib/search/parse-query";
import { getCollapsedQueryTokens } from "@/lib/search/rank";
import { buildServerSearchTokenFilter, escapeIlikeToken } from "@/lib/search/server-search-filter";

/** Token grezzi AND — stesso split di getCollapsedQueryTokens, prima del collapse. */
function getRawQueryTokens(query: string): string[] {
  const trimmed = query.trim().replace(/\s*·\s*/g, " ");
  if (!trimmed) return [];

  const parsed = parseSearchQuery(trimmed);
  if (parsed.mode === "phrase" && parsed.phrase) {
    const words = parsed.phrase.split(/\s+/).filter(Boolean);
    return words.length > 1 ? [...new Set(words)] : parsed.phrase ? [parsed.phrase] : [];
  }

  const freeText = trimmed.replace(/\b[a-zA-Z_][\w-]*\s*:\s*\S+/g, " ").trim();
  return [...new Set(freeText.split(/\s+/).filter(Boolean))];
}

/**
 * Ricerca server preventivi: search_document + numero in dettagli JSON.
 * ponytail: numero non è colonna scalare; OR su dettagli->>numero finché search_document non è allineato.
 */
export function applyPreventiviServerSearchFilter<
  T extends { or: (filter: string) => T },
>(q: T, query: string | null | undefined): T {
  const cleaned = query?.trim().replace(/\s*·\s*/g, " ").trim();
  if (!cleaned) return q;

  const filter = buildServerSearchTokenFilter(cleaned);
  if (!filter) return q;

  const rawTokens = getRawQueryTokens(cleaned);
  const collapsedTokens = getCollapsedQueryTokens(cleaned);
  let queryBuilder = q;

  for (let i = 0; i < collapsedTokens.length; i++) {
    const collapsed = collapsedTokens[i] ?? "";
    if (!collapsed) continue;
    const raw = (rawTokens[i] ?? collapsedTokens[i] ?? collapsed).trim();
    const collapsedPat = `%${escapeIlikeToken(collapsed)}%`;
    const rawPat = `%${escapeIlikeToken(raw)}%`;
    queryBuilder = queryBuilder.or(
      `search_document.ilike.${collapsedPat},dettagli->>numero.ilike.${rawPat}`,
    );
  }

  return queryBuilder;
}
