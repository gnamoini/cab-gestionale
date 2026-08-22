"use client";

import { buildAnalyticsPeriodFromContext } from "@/components/report/analytics/report-period-to-analytics";
import { mapUiCompareToEnvelope } from "@/components/report/bi-center/drill-down/compare-mode-bridge";
import { useReportPeriodContext } from "@/components/report/context/report-period-context";
import { useOptionalReportDrillDown } from "@/components/report/bi-center/use-report-drill-down";
import type { ReportDrillDownContext } from "@/lib/report/drilldown/types";

export function useMetricDrillDown(metricId: string) {
  const drill = useOptionalReportDrillDown();
  const periodCtx = useReportPeriodContext();
  const supported = drill?.isDrilldownSupported(metricId) ?? false;

  const open = (extra?: Partial<Omit<ReportDrillDownContext, "metricId" | "period">>) => {
    if (!drill || !supported) return;
    drill.openKpiDrillDown({
      metricId,
      period: buildAnalyticsPeriodFromContext(periodCtx),
      compareMode: mapUiCompareToEnvelope(periodCtx.compareMode),
      ...extra,
    });
  };

  return { supported, open };
}
