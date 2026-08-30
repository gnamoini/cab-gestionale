/** Token per match testuale cataloghi/listini (≥3 caratteri) + codici articolo. */
export function catalogSearchTokens(...parts: (string | undefined | null)[]): string[] {
  const raw = parts.filter(Boolean).join(" ");
  const tokens = raw
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3);
  const codes = (raw.match(/[A-Za-z0-9][A-Za-z0-9.\-/]{1,31}/g) ?? [])
    .map((c) => c.toLowerCase())
    .filter((c) => c.length >= 2);
  return [...new Set([...tokens, ...codes])];
}

/** 0–1 — codice esatto/query intera pesano di più dei token singoli. */
export function scoreCatalogPartMatch(
  haystack: string,
  tokens: string[],
  visibleCodes: string[],
  fullQuery: string,
): number {
  const hay = haystack.toLowerCase();
  const q = fullQuery.trim().toLowerCase();
  if (visibleCodes.some((c) => c && hay.includes(c.toLowerCase()))) return 1;
  if (q.length >= 4 && hay.includes(q)) return 0.95;
  if (!tokens.length) return 0;
  let matched = 0;
  for (const t of tokens) {
    if (hay.includes(t)) matched += 1;
  }
  return matched / tokens.length;
}

export function escapeIlikeToken(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

/** Match se score sufficiente o almeno un token significativo nel testo. */
export function catalogPartMatches(
  score: number,
  haystack: string,
  tokens: string[],
  minScore = 0.25,
): boolean {
  if (score >= minScore) return true;
  const hay = haystack.toLowerCase();
  return tokens.some((t) => t.length >= 4 && hay.includes(t));
}

/** Query unificata catalogo + magazzino. */
export function buildCatalogSearchQuery(input: {
  normalizedDescription?: string;
  partType?: string;
  additionalInfo?: string;
  visibleCodes?: string[];
  fallbackDescription?: string;
}): { fullQuery: string; searchTokens: string[] } {
  const fullQuery = [
    input.normalizedDescription,
    input.partType,
    input.additionalInfo,
    input.fallbackDescription,
  ]
    .filter(Boolean)
    .join(" ");
  const searchTokens = catalogSearchTokens(
    input.normalizedDescription,
    input.partType,
    input.additionalInfo,
    ...(input.visibleCodes ?? []),
    input.fallbackDescription,
  );
  return { fullQuery, searchTokens };
}
