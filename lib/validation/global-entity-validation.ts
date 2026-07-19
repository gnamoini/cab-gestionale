/**
 * Global Validation Layer — normalizzazione e matching entità condiviso frontend/backend.
 */

export type NormalizeEntityStringOptions = {
  /** Standardizza sigle societarie (SRL, SPA, SNC). Utile per clienti/fornitori. */
  standardizeLegalSuffix?: boolean;
};

const LEGAL_SUFFIX_REPLACERS: ReadonlyArray<[RegExp, string]> = [
  [/\bs\.?\s*r\.?\s*l\.?\b/gi, " srl "],
  [/\bs\.?\s*p\.?\s*a\.?\b/gi, " spa "],
  [/\bs\.?\s*n\.?\s*c\.?\b/gi, " snc "],
];

/** Confusabili tastiera / codici ricambio — fold condiviso ricerca fuzzy. */
export function foldSearchConfusables(value: string): string {
  return value.replace(/c/g, "k");
}

function searchCharsEquivalent(a: string, b: string): boolean {
  return a === b || (a === "c" && b === "k") || (a === "k" && b === "c");
}

/** Normalizza stringhe entità: trim, lower, accenti, spazi, punteggiatura base. */
export function normalizeEntityString(value: string, options?: NormalizeEntityStringOptions): string {
  let s = value.trim();
  if (!s) return "";

  if (options?.standardizeLegalSuffix) {
    for (const [re, repl] of LEGAL_SUFFIX_REPLACERS) {
      s = s.replace(re, repl);
    }
  }

  s = s.replace(/[.,;:'"!?()[\]{}\\/|@#$%^&*+=~`<>]/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  s = s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return foldSearchConfusables(s);
}

/** Chiave alfanumerica permissiva (ignora punteggiatura, spazi, trattini). */
export function entityAutocompleteKey(value: string, options?: NormalizeEntityStringOptions): string {
  return normalizeEntityString(value, options).replace(/[^a-z0-9]/g, "");
}

/** Chiave canonica per dedupe: normalize(name) + contesto opzionale. */
export function buildEntityKey(
  name: string,
  context?: string,
  options?: NormalizeEntityStringOptions,
): string {
  const normalized = normalizeEntityString(name, options);
  if (!normalized) return "";
  const ctx = context?.trim();
  return ctx ? `${normalized}|${ctx}` : normalized;
}

export type FuzzyEntityMatch = {
  entity: string;
  score: number;
  exact: boolean;
};

function scoreLooseEntityKey(query: string, candidate: string, options?: NormalizeEntityStringOptions): number {
  const q = entityAutocompleteKey(query, options);
  const o = entityAutocompleteKey(candidate, options);
  if (!q) return 1;
  if (o === q) return 100;
  if (o.startsWith(q)) return 80 - Math.abs(o.length - q.length) / 10;
  if (o.includes(q)) return 55 - o.indexOf(q);
  let qi = 0;
  for (const ch of o) {
    if (searchCharsEquivalent(ch, q[qi] ?? "")) qi += 1;
    if (qi >= q.length) return 30 - Math.abs(o.length - q.length) / 10;
  }
  return 0;
}

/** Score di similarità tra query e candidato (0 = nessun match). */
export function scoreEntityMatch(
  query: string,
  candidate: string,
  options?: NormalizeEntityStringOptions,
): number {
  const loose = scoreLooseEntityKey(query, candidate, options);
  if (loose > 0) return loose;

  const q = normalizeEntityString(query, options);
  const o = normalizeEntityString(candidate, options);
  if (!q) return 1;
  if (o === q) return 100;
  if (o.startsWith(q)) return 80 - Math.abs(o.length - q.length) / 10;
  if (o.includes(q)) return 55 - o.indexOf(q);
  let qi = 0;
  for (const ch of o) {
    if (searchCharsEquivalent(ch, q[qi] ?? "")) qi += 1;
    if (qi >= q.length) return 30 - Math.abs(o.length - q.length) / 10;
  }
  return 0;
}

export const ENTITY_SIMILAR_SCORE_MIN = 55;

export type FuzzyMatchEntityOptions = NormalizeEntityStringOptions & {
  exclude?: string;
  minScore?: number;
  /** Se true, restituisce anche match esatti (default: false per warning UI). */
  includeExact?: boolean;
};

/**
 * Matching leggero per suggerimenti UI (non bloccante).
 * Restituisce il miglior candidato simile, escludendo match esatti salvo `includeExact`.
 */
export function fuzzyMatchEntity(
  candidate: string,
  pool: readonly string[],
  options?: FuzzyMatchEntityOptions,
): FuzzyEntityMatch | null {
  const q = candidate.trim();
  if (!q) return null;

  const excludeKey = options?.exclude ? normalizeEntityString(options.exclude, options) : "";
  const minScore = options?.minScore ?? ENTITY_SIMILAR_SCORE_MIN;
  let best: FuzzyEntityMatch | null = null;

  for (const entity of pool) {
    const trimmed = entity.trim();
    if (!trimmed) continue;
    if (excludeKey && normalizeEntityString(trimmed, options) === excludeKey) continue;

    const score = scoreEntityMatch(q, trimmed, options);
    if (score <= 0) continue;

    const exact =
      normalizeEntityString(trimmed, options) === normalizeEntityString(q, options) ||
      entityAutocompleteKey(trimmed, options) === entityAutocompleteKey(q, options);

    if (exact && !options?.includeExact) continue;
    if (!best || score > best.score) best = { entity: trimmed, score, exact };
  }

  if (!best || best.score < minScore) return null;
  return best;
}

/** Trova duplicato esatto normalizzato in un elenco. */
export function findExactEntityInPool(
  candidate: string,
  pool: readonly string[],
  options?: NormalizeEntityStringOptions & { exclude?: string },
): string | null {
  const key = normalizeEntityString(candidate, options);
  const looseKey = entityAutocompleteKey(candidate, options);
  if (!key && !looseKey) return null;
  const excludeKey = options?.exclude ? normalizeEntityString(options.exclude, options) : "";
  for (const entity of pool) {
    const trimmed = entity.trim();
    if (!trimmed) continue;
    if (excludeKey && normalizeEntityString(trimmed, options) === excludeKey) continue;
    if (looseKey && entityAutocompleteKey(trimmed, options) === looseKey) return trimmed;
    if (key && normalizeEntityString(trimmed, options) === key) return trimmed;
  }
  return null;
}

/** Trova entità simile (fuzzy o esatta) per warning UI non bloccante. */
export function findSimilarEntityInPool(
  candidate: string,
  pool: readonly string[],
  options?: FuzzyMatchEntityOptions,
): string | null {
  const exact = findExactEntityInPool(candidate, pool, options);
  if (exact) return exact;
  return fuzzyMatchEntity(candidate, pool, options)?.entity ?? null;
}
