"use client";

import { useMemo, type ReactNode } from "react";
import { ReportPerformanceContext } from "@/components/report/layout/report-performance-context";
import { mergeUnifiedKpiDisplay } from "@/lib/report/kpi-performance/merge-unified-kpi-display";
import { useReportKpiPerformanceData } from "@/lib/report/kpi-performance/use-report-kpi-performance-data";
import { partitionUnifiedKpiDisplay } from "@/lib/report/partition-unified-kpi-display";
import type { KpiCardModel } from "@/lib/report/build-report-model";
import type { DateRange, ReportCompareMode } from "@/lib/report/date-ranges";
import type { ReportSemanticIndex } from "@/lib/report/report-semantic-index";
import type { useReportLiveData } from "@/lib/report/use-report-live-data";

type LiveSlice = Pick<
  ReturnType<typeof useReportLiveData>,
  "lavListRows" | "attive" | "completate" | "mezzi" | "magazzino" | "magLog" | "isLoading"
>;

export { useReportPerformanceContext } from "@/components/report/layout/report-performance-context";
export type { ReportPerformanceContextValue } from "@/components/report/layout/report-performance-context";

export function ReportPerformanceGate({
  children,
  anchor,
  filterRange,
  compareRange,
  compareMode = "none",
  periodKpis,
  live,
  semanticIndex,
  enabled = true,
}: {
  children: ReactNode;
  anchor: Date;
  filterRange: DateRange;
  compareRange: DateRange | null;
  compareMode?: ReportCompareMode;
  periodKpis: KpiCardModel[];
  live: LiveSlice;
  semanticIndex: ReportSemanticIndex;
  enabled?: boolean;
}) {
  const { model: perf, isLoading: perfLoading } = useReportKpiPerformanceData({
    anchor,
    range: filterRange,
    compareRange,
    compareMode,
    live,
    semanticIndex,
    enabled,
  });

  const partitioned = useMemo(() => {
    const unified = mergeUnifiedKpiDisplay(periodKpis, perf, semanticIndex, compareRange);
    return partitionUnifiedKpiDisplay(unified);
  }, [periodKpis, perf, semanticIndex, compareRange]);

  const value = useMemo(
    () => ({ perf, perfLoading, partitioned }),
    [perf, perfLoading, partitioned],
  );

  return <ReportPerformanceContext.Provider value={value}>{children}</ReportPerformanceContext.Provider>;
}
