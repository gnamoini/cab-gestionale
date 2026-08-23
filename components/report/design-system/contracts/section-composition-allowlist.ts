/** Export consentiti a components/report/sections/** */
export const REPORT_SECTION_COMPOSITION_ALLOWLIST = [
  "ReportSection",
  "ReportSectionHeader",
  "ReportStorySection",
  "ReportLayoutRow",
  "ReportLayoutKpiStrip",
  "ReportLayoutMainAside",
  "ReportLayoutSplit",
  "ReportLayoutDetail",
  "ReportMetricGrid",
  "ReportDomainMetricsGrid",
  "ReportUnifiedKpiGrid",
  "ReportExecutiveKpiSection",
  "ReportMetricRenderer",
  "ReportDataTable",
  "ReportLineChart",
  "ReportMultiSeriesLineChart",
  "ReportBarChart",
  "ReportMatrix",
  "ReportNarrativeBlock",
  "ReportChartEmptyState",
  "StatusBadge",
  "ReportEmbeddedModule",
  "ReportVisualization",
  "ReportDensityProvider",
  "REPORT_DEFAULT_DENSITY",
  "REPORT_PANORAMICA_DENSITY",
] as const;

/** Vietati in sections (rendering atomico — solo via renderer/grid). */
export const REPORT_SECTION_FORBIDDEN_IMPORTS = [
  "MetricCard",
  "ReportChart",
  "useReportDensity",
  "useSemanticColor",
  "assertSemanticUsage",
] as const;

/** Path segment vietati negli import delle sezioni. */
export const REPORT_SECTION_FORBIDDEN_IMPORT_PATHS = [
  "/design-system/primitives/",
  "/design-system/internal/",
  "/design-system/tokens/",
] as const;
