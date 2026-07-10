/** Primitive dati governate — kind runtime su ReportMetric. */
export const REPORT_DATA_PRIMITIVE_KINDS = [
  "metric-card",
  "data-table",
  "chart",
  "matrix",
] as const;

export type ReportDataPrimitiveKind = (typeof REPORT_DATA_PRIMITIVE_KINDS)[number];

/** Elementi semantici / layout (non dati). */
export const REPORT_SEMANTIC_PRIMITIVE_KINDS = [
  "narrative",
  "status-badge",
  "embedded",
] as const;

export type ReportSemanticPrimitiveKind = (typeof REPORT_SEMANTIC_PRIMITIVE_KINDS)[number];

export type ReportPrimitiveKind = ReportDataPrimitiveKind | ReportSemanticPrimitiveKind;

/** Mapping JSX composition API → primitive kind (coverage AST). */
export const REPORT_COMPOSITION_JSX_TO_PRIMITIVE: Record<string, ReportPrimitiveKind> = {
  ReportMetricGrid: "metric-card",
  ReportDomainMetricsGrid: "metric-card",
  ReportUnifiedKpiGrid: "metric-card",
  ReportExecutiveKpiSection: "metric-card",
  ReportMetricRenderer: "metric-card",
  ReportDataTable: "data-table",
  ReportLineChart: "chart",
  ReportBarChart: "chart",
  ReportMultiSeriesLineChart: "chart",
  ReportMatrix: "matrix",
  ReportNarrativeBlock: "narrative",
  StatusBadge: "status-badge",
  ReportEmbeddedModule: "embedded",
};
