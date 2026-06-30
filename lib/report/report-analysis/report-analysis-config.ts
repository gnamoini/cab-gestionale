/** TTL cache client sessionStorage — default 30 minuti. */
export const REPORT_ANALYSIS_CACHE_TTL_MS_DEFAULT = 1_800_000;

/** Limite dimensione context serializzato (anti-abuso API). */
export const REPORT_ANALYSIS_CONTEXT_MAX_BYTES = 48_000;

/** Limite fingerprint snapshot report (hint log + queryMeta). */
export const REPORT_ANALYSIS_SNAPSHOT_FINGERPRINT_MAX = 512;

export function resolveReportAnalysisCacheTtlMs(): number {
  const raw = process.env.REPORT_ANALYSIS_CACHE_TTL_MS?.trim();
  if (!raw) return REPORT_ANALYSIS_CACHE_TTL_MS_DEFAULT;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : REPORT_ANALYSIS_CACHE_TTL_MS_DEFAULT;
}
