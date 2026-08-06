import { matchSearchString } from "@/lib/search/match";
import type { SearchDomainConfig } from "@/lib/search/types";
import {
  buildSearchDocumentFromFieldEntries,
  type FieldSearchEntry,
} from "@/lib/search/field-token";
import { buildNormalizedSearchHaystack } from "@/lib/validation/entity-keys";

/** Costruisce search document normalizzato da parti stringa (senza marker campo). */
export function buildSearchDocumentFromParts(parts: readonly (string | null | undefined)[]): string {
  return buildNormalizedSearchHaystack(parts);
}

/** Costruisce search document con marker campo anti-collisione. */
export function buildSearchDocumentFromFields(
  entries: readonly FieldSearchEntry[],
  extraParts?: readonly (string | null | undefined)[],
): string {
  return buildSearchDocumentFromFieldEntries(entries, extraParts);
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
