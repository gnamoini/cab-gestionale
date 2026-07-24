import type { DateRange } from "@/lib/report/date-ranges";
import { ymdFromDate } from "@/lib/report/date-ranges";

export type DerivedKey = "operational" | "warehouse" | "labor" | "economic";

export type DerivedEntry<T> = {
  data: T;
  rangeKey: string;
  generatedAt: number;
  version: number;
};

export type ReportMetricCompare = {
  label: string;
  value: string;
  deltaPct: number | null;
};

export type ReportMetricState =
  | { status: "available"; value: string; compare?: ReportMetricCompare | null }
  | { status: "loading" }
  | { status: "error"; message: string; retry?: () => void }
  | { status: "not_available"; reason: string }
  | { status: "not_loaded"; hint: string };

export type ReportDomainMetric = {
  id: string;
  label: string;
  state: ReportMetricState;
};

export type AnalyticsPublishBase = {
  rangeKey: string;
  requestId: number;
};

export type OperationalAnalyticsDto = {
  metrics: ReportDomainMetric[];
  openedInPeriod: number;
  completedInPeriod: number;
  archivedTotal: number;
  cancelledInPeriod: number;
  backlog: number;
  avgCloseDays: number | null;
  lateCount: number;
  clientsServed: number;
};

export type WarehouseAnalyticsDto = {
  metrics: ReportDomainMetric[];
  partsUsedQty: number;
  movementValue: number;
  criticalStockCount: number;
  ordersCount: number;
};

export type LaborAnalyticsDto = {
  metrics: ReportDomainMetric[];
  /** Ore presenza (timesheet) — non usare per produttività reale. */
  totalHours: number;
  /** Ore consuntive (actual_labor_hours). */
  actualLaborHours: number;
  completedJobs: number;
  avgHoursPerJob: number | null;
  actualHoursPerJob: number | null;
  manodoperaCost: number;
};

export type EconomicAnalyticsDto = {
  metrics: ReportDomainMetric[];
  preventiviCount: number;
  preventiviValue: number;
  invoicesBilled: number;
  ddtCount: number;
};

export type CrossAnalyticsDto = {
  metrics: ReportDomainMetric[];
};

export type ReportAnalyticsDerivedSnapshot = {
  revision: number;
  currentRangeKey: string;
  operational?: DerivedEntry<OperationalAnalyticsDto>;
  warehouse?: DerivedEntry<WarehouseAnalyticsDto>;
  labor?: DerivedEntry<LaborAnalyticsDto>;
  economic?: DerivedEntry<EconomicAnalyticsDto>;
};

export type DerivedFreshness = {
  rangeKey: string;
  version: number;
};

export function buildReportRangeKey(
  range: DateRange,
  compareRange: DateRange | null,
  orgId?: string | null,
): string {
  const base = `${ymdFromDate(range.start)}..${ymdFromDate(range.end)}`;
  const cmp = compareRange
    ? `|${ymdFromDate(compareRange.start)}..${ymdFromDate(compareRange.end)}`
    : "";
  const org = orgId ? `|org:${orgId}` : "";
  return `${base}${cmp}${org}`;
}

export function isDerivedEntryFresh(
  entry: DerivedEntry<unknown> | undefined,
  expected: DerivedFreshness,
): boolean {
  if (!entry) return false;
  return entry.rangeKey === expected.rangeKey && entry.version === expected.version;
}
