"use client";

import { createContext, useContext } from "react";
import type { KpiPerformanceModel } from "@/lib/report/kpi-performance/kpi-performance-types";
import type { PartitionedUnifiedKpis } from "@/lib/report/partition-unified-kpi-display";

export type ReportPerformanceContextValue = {
  perf: KpiPerformanceModel | null;
  perfLoading: boolean;
  partitioned: PartitionedUnifiedKpis;
};

export const ReportPerformanceContext = createContext<ReportPerformanceContextValue | null>(null);

export function useReportPerformanceContext(): ReportPerformanceContextValue {
  const ctx = useContext(ReportPerformanceContext);
  if (!ctx) throw new Error("useReportPerformanceContext must be used within ReportPerformanceGate");
  return ctx;
}
