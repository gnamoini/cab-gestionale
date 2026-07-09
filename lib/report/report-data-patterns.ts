/**
 * SSOT pattern report: card | table | chart | matrix.
 * Ogni widget dati della pagina Report deve usare uno di questi export.
 */
export const REPORT_DATA_PATTERN = {
  card: "card",
  table: "table",
  chart: "chart",
  matrix: "matrix",
} as const;

export type ReportDataPattern = (typeof REPORT_DATA_PATTERN)[keyof typeof REPORT_DATA_PATTERN];

/** Componenti canonici per pattern (audit regression). */
export const REPORT_DATA_PATTERN_COMPONENTS = {
  card: ["ReportKpiCard", "ReportUnifiedKpiGrid", "ReportExecutiveKpiSection", "ReportDomainMetricsGrid", "ReportDomainMetricCard"],
  table: ["ReportTopRicambi", "ReportTopMezzi", "ReportTopClienti", "ReportClassificheOperativePanel"],
  chart: [
    "ReportTemporalMonthlyBars",
    "ReportLavorazioniTemporalSection",
    "ReportMagazzinoSection",
    "ReportRicambiConsumoSection",
    "ReportYearlyForecastLineChart",
    "MagazzinoEntrateUsciteBars",
    "MagazzinoCapitalLineChart",
    "KpiPerformanceBarChart",
  ],
  matrix: ["ReportLavorazioniSection"],
} as const;
