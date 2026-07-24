import { matchSearchString } from "@/lib/search/match";
import type { SearchDomainConfig } from "@/lib/search/types";
import { buildNormalizedSearchHaystack } from "@/lib/validation/entity-keys";

/** Costruisce search document normalizzato da parti stringa. */
export function buildSearchDocumentFromParts(parts: readonly (string | null | undefined)[]): string {
  return buildNormalizedSearchHaystack(parts);
}

/** Costruisce document da config dominio. */
export function buildSearchDocument<TRow, TCtx>(
  config: SearchDomainConfig<TRow, TCtx>,
  row: TRow,
  ctx?: TCtx,
): string {
  return config.buildDocument(row, ctx);
}

/** Match riga contro query grezza via config. */
export function rowMatchesSearchQuery<TRow, TCtx>(
  config: SearchDomainConfig<TRow, TCtx>,
  row: TRow,
  query: string,
  ctx?: TCtx,
): boolean {
  const doc = config.buildDocument(row, ctx);
  return matchSearchString(query, doc).matches;
}
