import { collapseSearchKey } from "@/lib/search/field-token";
import { parseSearchQuery } from "@/lib/search/parse-query";
import { getCollapsedQueryTokens } from "@/lib/search/rank";

/** Escape caratteri speciali ILIKE PostgREST/SQL. */
export function escapeIlikeToken(raw: string): string {
  return raw.replace(/[%_\\]/g, "\\$&");
}

export type ServerSearchTokenFilter = {
  /** Token collassati — AND tra loro. */
  andTokens: string[];
};

/** Token collassati per filtro server — stesso SSOT del client match. */
export function buildServerSearchTokenFilter(query: string): ServerSearchTokenFilter | null {
  const cleaned = query.replace(/\s*·\s*/g, " ").trim();
  if (!cleaned) return null;

  const parsed = parseSearchQuery(cleaned);
  if (!parsed.raw.trim()) return null;

  const andTokens = getCollapsedQueryTokens(cleaned);
  if (andTokens.length === 0) return null;

  return { andTokens };
}

/** Pattern ILIKE singolo token — null se query vuota. @deprecated prefer buildServerSearchTokenFilter */
export function normalizedSearchIlikePattern(query: string): string | null {
  const filter = buildServerSearchTokenFilter(query);
  if (!filter?.andTokens[0]) return null;
  return `%${escapeIlikeToken(filter.andTokens[0])}%`;
}

/** Applica filtri AND su search_document via PostgREST ilike. */
export function applyServerSearchDocumentFilter<
  T extends { ilike: (col: string, pat: string) => T },
>(q: T, query: string | null | undefined): T {
  const filter = query?.trim() ? buildServerSearchTokenFilter(query) : null;
  if (!filter) return q;
  let queryBuilder = q;
  for (const token of filter.andTokens) {
    const collapsed = collapseSearchKey(token);
    if (!collapsed) continue;
    queryBuilder = queryBuilder.ilike("search_document", `%${escapeIlikeToken(collapsed)}%`);
  }
  return queryBuilder;
}
