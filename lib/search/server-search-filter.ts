import { normalizeSearchText } from "@/lib/search/normalize";

/** Escape caratteri speciali ILIKE PostgREST/SQL. */
export function escapeIlikeToken(raw: string): string {
  return raw.replace(/[%_\\]/g, "\\$&");
}

/** Pattern ILIKE su search_document normalizzato — null se query vuota. */
export function normalizedSearchIlikePattern(query: string): string | null {
  const n = normalizeSearchText(query);
  if (!n) return null;
  return `%${escapeIlikeToken(n)}%`;
}
