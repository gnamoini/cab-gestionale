/**
 * Documented exceptions for domain-driven colors (not arbitrary chart styling).
 * Governance test allows matches in these paths/patterns only.
 */
export const REPORT_CHART_COLOR_ALLOWLIST = [
  /** Stato lavorazione colors from app settings — passed as data, not theme */
  "statoColorById",
  /** Multi-series palette re-exported from DS multi-series-line-chart during migration */
  "KPI_CHART_SERIES_COLORS",
] as const;
