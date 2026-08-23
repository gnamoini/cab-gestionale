/**
 * Data-driven chart layout decisions — size is not cosmetic.
 */

export type ChartLayoutSpec = {
  chartType: "line" | "bar" | "horizontalBar" | "donut" | "stackedBar" | "pareto" | "table";
  pointCount?: number;
  seriesCount?: number;
  categoryCount?: number;
  labelMaxLen?: number;
  hasLegend?: boolean;
  needsInlineValues?: boolean;
};

export type ChartLayoutSize = "compact" | "standard" | "wide";

export type ChartLayoutDecision = {
  size: ChartLayoutSize;
  /** Grid column span 1-12 on desktop */
  mainSpan: number;
  /** Whether a side panel (KPI/context) is recommended */
  suggestSidePanel: boolean;
  sideSpan: number;
  minHeightClass: string;
};

export function resolveChartLayout(spec: ChartLayoutSpec): ChartLayoutDecision {
  const points = spec.pointCount ?? spec.categoryCount ?? 0;
  const series = spec.seriesCount ?? 1;
  const labels = spec.labelMaxLen ?? 0;

  if (spec.chartType === "table" || spec.chartType === "donut") {
    return {
      size: "standard",
      mainSpan: 12,
      suggestSidePanel: false,
      sideSpan: 0,
      minHeightClass: "min-h-[12rem]",
    };
  }

  if (spec.chartType === "horizontalBar" || (spec.categoryCount ?? 0) > 8) {
    return {
      size: "wide",
      mainSpan: 12,
      suggestSidePanel: false,
      sideSpan: 0,
      minHeightClass: "min-h-[16rem]",
    };
  }

  if (points <= 6 && series <= 2 && labels <= 12) {
    return {
      size: "compact",
      mainSpan: 7,
      suggestSidePanel: true,
      sideSpan: 5,
      minHeightClass: "min-h-[10rem]",
    };
  }

  if (points <= 12 || series <= 3) {
    return {
      size: "standard",
      mainSpan: 8,
      suggestSidePanel: true,
      sideSpan: 4,
      minHeightClass: "min-h-[14rem]",
    };
  }

  return {
    size: "wide",
    mainSpan: 12,
    suggestSidePanel: false,
    sideSpan: 0,
    minHeightClass: "min-h-[18rem]",
  };
}

export function layoutGridClass(mainSpan: number, sideSpan: number, hasSide: boolean): string {
  if (!hasSide || sideSpan === 0) return "grid min-w-0 grid-cols-1";
  if (mainSpan >= 10) return "grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-12";
  return `grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-12`;
}

const COL_SPAN: Record<number, string> = {
  1: "lg:col-span-1",
  2: "lg:col-span-2",
  3: "lg:col-span-3",
  4: "lg:col-span-4",
  5: "lg:col-span-5",
  6: "lg:col-span-6",
  7: "lg:col-span-7",
  8: "lg:col-span-8",
  9: "lg:col-span-9",
  10: "lg:col-span-10",
  11: "lg:col-span-11",
  12: "lg:col-span-12",
};

export function layoutMainClass(decision: ChartLayoutDecision): string {
  if (!decision.suggestSidePanel) return "min-w-0 col-span-1";
  return `min-w-0 col-span-1 ${COL_SPAN[Math.min(decision.mainSpan, 12)] ?? "lg:col-span-8"}`;
}

export function layoutSideClass(decision: ChartLayoutDecision): string {
  if (!decision.suggestSidePanel) return "hidden";
  return `min-w-0 col-span-1 ${COL_SPAN[Math.min(decision.sideSpan, 12)] ?? "lg:col-span-4"}`;
}
