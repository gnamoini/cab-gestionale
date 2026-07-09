export type ReportVisualDensity = "compact" | "comfortable" | "executive";

export type ReportDensityTokens = {
  sectionGap: string;
  metricGridCols: string;
  metricCardPadding: string;
  metricCardMinHeight: string;
  metricValueScale: string;
  tableRowPadding: string;
  chartMinHeight: string;
  chartPadding: string;
  narrativeGap: string;
};

const DENSITY_MAP: Record<ReportVisualDensity, ReportDensityTokens> = {
  compact: {
    sectionGap: "gap-3",
    metricGridCols: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
    metricCardPadding: "p-3",
    metricCardMinHeight: "min-h-[7.5rem]",
    metricValueScale: "text-xl sm:text-2xl",
    tableRowPadding: "py-1.5",
    chartMinHeight: "min-h-[140px] sm:min-h-[160px]",
    chartPadding: "p-3",
    narrativeGap: "gap-2",
  },
  comfortable: {
    sectionGap: "gap-4",
    metricGridCols: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
    metricCardPadding: "p-4",
    metricCardMinHeight: "min-h-[8.5rem]",
    metricValueScale: "text-2xl sm:text-3xl",
    tableRowPadding: "py-2",
    chartMinHeight: "min-h-[160px] sm:min-h-[180px]",
    chartPadding: "p-3 sm:p-4",
    narrativeGap: "gap-3",
  },
  executive: {
    sectionGap: "gap-5",
    metricGridCols: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    metricCardPadding: "p-5",
    metricCardMinHeight: "min-h-[9.5rem]",
    metricValueScale: "text-3xl sm:text-4xl",
    tableRowPadding: "py-2.5",
    chartMinHeight: "min-h-[180px] sm:min-h-[200px]",
    chartPadding: "p-4 sm:p-5",
    narrativeGap: "gap-4",
  },
};

export function getReportDensityTokens(density: ReportVisualDensity = "comfortable"): ReportDensityTokens {
  return DENSITY_MAP[density];
}

export const REPORT_DEFAULT_DENSITY: ReportVisualDensity = "comfortable";

export const REPORT_PANORAMICA_DENSITY: ReportVisualDensity = "executive";
