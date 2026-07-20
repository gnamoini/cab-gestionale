import type { ReportMetricCompareState } from "@/lib/report/metrics/report-metric-types";

export type KpiMetricDto = {
  id: string;
  label: string;
  value: number;
  unit: string;
  compare: ReportMetricCompareState | null;
  trust?: "exact" | "partial" | "estimated" | "proxy" | "snapshot";
};
