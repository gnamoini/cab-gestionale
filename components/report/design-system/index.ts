/**
 * Composition API — unico entrypoint per components/report/sections/**.
 */

export { ReportSection } from "@/components/report/design-system/layout/section";
export { ReportSectionHeader } from "@/components/report/design-system/typography/report-typography-components";
export { ReportMetricGrid } from "@/components/report/design-system/layout/metric-grid";
export { ReportDomainMetricsGrid } from "@/components/report/design-system/layout/domain-metric-grid";
export { ReportMetricRenderer } from "@/components/report/report-metric-renderer";
export { ReportDataTable } from "@/components/report/design-system/primitives/data-table/data-table";
export { ReportLineChart, ReportBarChart } from "@/components/report/design-system/primitives/chart/chart";
export { ReportMultiSeriesLineChart, KPI_CHART_SERIES_COLORS } from "@/components/report/design-system/primitives/chart/multi-series-line-chart";
export { ReportMatrix } from "@/components/report/design-system/primitives/matrix/matrix";
export { ReportNarrativeBlock } from "@/components/report/design-system/primitives/narrative/narrative-block";
export { StatusBadge } from "@/components/report/design-system/primitives/status/status-badge";
export { ReportEmbeddedModule } from "@/components/report/design-system/embed/embedded-module";
export { ReportVisualization } from "@/components/report/design-system/layout/visualization";
export { ReportStorySection } from "@/components/report/design-system/layout/story-section";
export {
  ReportLayoutRow,
  ReportLayoutKpiStrip,
  ReportLayoutMainAside,
  ReportLayoutSplit,
  ReportLayoutDetail,
} from "@/components/report/design-system/layout/composer";
export { ReportAnalyticsKpi } from "@/components/report/design-system/primitives/metric-card/report-analytics-kpi";
export { ReportChartEmptyState } from "@/components/report/design-system/primitives/narrative/chart-empty-state";
export { ReportDensityProvider } from "@/components/report/design-system/internal/use-report-density";
export { REPORT_DEFAULT_DENSITY, REPORT_PANORAMICA_DENSITY } from "@/components/report/design-system/tokens/visual-density";
export { ReportUnifiedKpiGrid } from "@/components/report/report-unified-kpi-grid";
export { ReportExecutiveKpiSection } from "@/components/report/layout/report-executive-kpi-section";
