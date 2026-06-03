import type { DateRange } from "@/lib/report/date-ranges";

export type KpiPerformanceMetricKind = "exact" | "proxy" | "partial" | "unavailable";

export type KpiPerformanceExecutiveCard = {
  id: string;
  label: string;
  value: string;
  sub?: string;
  kind: KpiPerformanceMetricKind;
  compareDelta?: string | null;
  comparePct?: number | null;
};

export type KpiPerformanceMonthPoint = {
  monthKey: string;
  label: string;
  value: number;
};

export type KpiPerformanceOperational = {
  closedInPeriod: number;
  openCount: number;
  avgCloseDays: number | null;
  avgCloseDaysCompare: number | null;
  monthlyClosed: KpiPerformanceMonthPoint[];
  heuristicFaultsMonthly: KpiPerformanceMonthPoint[];
};

export type KpiPerformanceEconomic = {
  ricambiCostPeriod: number;
  manodoperaCostPeriod: number | null;
  manodoperaAvailable: boolean;
  totalMaintenanceCost: number;
  topMezziByCost: { mezzoId: string; label: string; cost: number }[];
  topComponents: { id: string; nome: string; totalUscite: number }[];
};

export type KpiPerformanceFleet = {
  totalMezzi: number;
  mezziInOfficina: number;
  mezziOperativiProxy: number;
  disponibilitaPct: number | null;
  avgDowntimeDays: number | null;
  guastiByTipo: { tipo: string; count: number }[];
  mezziAltaFrequenzaGuasti: { mezzoId: string; label: string }[];
};

export type KpiPerformanceAlert = {
  id: string;
  severity: "warning" | "critical" | "info";
  title: string;
  detail: string;
};

export type KpiPerformanceModel = {
  range: DateRange;
  compareRange: DateRange | null;
  executive: KpiPerformanceExecutiveCard[];
  operational: KpiPerformanceOperational;
  economic: KpiPerformanceEconomic;
  fleet: KpiPerformanceFleet;
  alerts: KpiPerformanceAlert[];
  complianceAvailable: false;
};
