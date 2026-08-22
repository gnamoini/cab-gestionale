import type { DrillDownRef } from "@/lib/report/contracts/drill-down-contract";
import type {
  ReportCompareMode,
  ReportRequestedPeriod,
} from "@/lib/report/contracts/metadata-envelope";
import type { ReportDrillDownContext, ReportDrillDownSource } from "@/lib/report/drilldown/types";
import { isDrilldownSupported } from "@/lib/report/drilldown/drilldown-metric-registry";

export function drillDownRefToContext(
  ref: DrillDownRef,
  period: ReportRequestedPeriod,
  compareMode: ReportCompareMode | undefined,
  source: ReportDrillDownSource,
  extra?: Pick<ReportDrillDownContext, "dimension" | "dimensionValue" | "filters" | "anchor">,
): ReportDrillDownContext {
  const filters: Record<string, string | number | boolean> = {
    ...(ref.filterPreset ?? {}),
    ...(extra?.filters ?? {}),
  };
  if (ref.targetTab) {
    filters.targetTab = ref.targetTab;
  }
  return {
    metricId: ref.metricId,
    period,
    compareMode,
    source,
    dimension: extra?.dimension,
    dimensionValue: extra?.dimensionValue,
    anchor: extra?.anchor ?? ref.targetTab,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
  };
}

export function insightDrillDownToContext(
  drillDown: DrillDownRef,
  period: ReportRequestedPeriod,
  compareMode: ReportCompareMode | undefined,
): ReportDrillDownContext | null {
  if (!isDrilldownSupported(drillDown.metricId)) return null;
  return drillDownRefToContext(drillDown, period, compareMode, "insight");
}
