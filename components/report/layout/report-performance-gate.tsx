"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { mergeUnifiedKpiDisplay } from "@/lib/report/kpi-performance/merge-unified-kpi-display";
import type { KpiPerformanceModel } from "@/lib/report/kpi-performance/kpi-performance-types";
import { partitionUnifiedKpiDisplay, type PartitionedUnifiedKpis } from "@/lib/report/partition-unified-kpi-display";
import { useReportKpiPerformanceData } from "@/lib/report/kpi-performance/use-report-kpi-performance-data";
import type { KpiCardModel } from "@/lib/report/build-report-model";
import type { DateRange } from "@/lib/report/date-ranges";
import type { ReportSemanticIndex } from "@/lib/report/report-semantic-index";
import type { useReportLiveData } from "@/lib/report/use-report-live-data";

type LiveSlice = Pick<
  ReturnType<typeof useReportLiveData>,
  "attive" | "completate" | "mezzi" | "magazzino" | "magLog" | "isLoading"
>;

type ReportPerformanceContextValue = {
  perf: KpiPerformanceModel | null;
  perfLoading: boolean;
  partitioned: PartitionedUnifiedKpis;
};

const ReportPerformanceContext = createContext<ReportPerformanceContextValue | null>(null);

export function useReportPerformanceContext(): ReportPerformanceContextValue {
  const ctx = useContext(ReportPerformanceContext);
  if (!ctx) throw new Error("useReportPerformanceContext must be used within ReportPerformanceGate");
  return ctx;
}

export function ReportPerformanceGate({
  children,
  anchor,
  filterRange,
  compareRange,
  periodKpis,
  live,
  semanticIndex,
}: {
  children: ReactNode;
  anchor: Date;
  filterRange: DateRange;
  compareRange: DateRange | null;
  periodKpis: KpiCardModel[];
  live: LiveSlice;
  semanticIndex: ReportSemanticIndex;
}) {
  const { model: perf, isLoading: perfLoading } = useReportKpiPerformanceData({
    anchor,
    range: filterRange,
    compareRange,
    live,
    semanticIndex,
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
