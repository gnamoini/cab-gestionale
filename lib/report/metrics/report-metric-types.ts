import type { ReportKpiTrust } from "@/lib/report/kpi-display-clusters";

export type ReportMetricUnit =
  | "count"
  | "currency"
  | "hours"
  | "days"
  | "percentage"
  | "ratio";

export type ReportMetricAggregation =
  | "sum"
  | "avg"
  | "count"
  | "min"
  | "max"
  | "latest"
  | "derived";

export type ReportMetricCategory =
  | "operational"
  | "economic"
  | "warehouse"
  | "customer"
  | "fleet";

export type ReportMetricApplicability =
  | "period"
  | "snapshot"
  | "trend"
  | "derived";

export type ReportMetricTrendSemantics =
  | "higher_is_better"
  | "lower_is_better"
  | "positive_when_decreasing"
  | "neutral";

export type ReportMetricKind = "kpi" | "ranking" | "temporal" | "matrix";

export type ReportMetricIcon = "trend" | "currency" | "clock" | "box" | "users" | "fleet";

export type ReportMetricLifecycleStatus =
  | "draft"
  | "active"
  | "deprecated"
  | "blocked"
  | "archived"
  | "internal";

export type ReportMetricContractImpact = "none" | "minor" | "major";

export type ReportMetricValidationStatus = "pending_validation" | "validated";

export type ReportCompareUnavailableReason =
  | "snapshot"
  | "no_history"
  | "period_not_applicable"
  | "not_loaded";

export type ReportMetricConfidence = "full" | "partial" | "estimated";

export type KpiSeriesProviderId = "lavorazioni" | "economici" | "magazzino" | "ore";

export type KpiSeriesGranularity = "day" | "week" | "month";

export type KpiChartDisplayMode = "indexed" | "absolute" | "dual-axis";

export type ReportMetricSeriesConfig = {
  provider: KpiSeriesProviderId;
  granularities: readonly KpiSeriesGranularity[];
  supportedModes: readonly KpiChartDisplayMode[];
};

export type ReportMetricValueCapability = "scalar" | "series";

export type KpiPayload = { spark?: number[] };
export type RankingPayload = { rowCount: number };
export type TemporalPayload = {
  points: { label: string; value: number; muted?: boolean }[];
};
export type MatrixPayload = { year: number };

export type ReportMetricPayload =
  | { kind: "kpi"; data: KpiPayload }
  | { kind: "ranking"; data: RankingPayload }
  | { kind: "temporal"; data: TemporalPayload }
  | { kind: "matrix"; data: MatrixPayload };

export type ReportMetricSource = {
  module: string;
  trace?: string;
};

export type ReportMetricCompareState =
  | {
      status: "available";
      previousValue: number;
      deltaAbs: number | null;
      deltaPercent: number | null;
    }
  | {
      status: "unavailable";
      reason: ReportCompareUnavailableReason;
      hint?: string;
    };

/** Runtime DTO — metadati solo nel registry. */
export type ReportMetric = {
  id: string;
  value: number;
  compare: ReportMetricCompareState | null;
  source: ReportMetricSource;
  payload?: ReportMetricPayload;
};

import type { ReportValueFormatter } from "@/lib/report/metrics/report-value-formatter";

export type ReportMetricRegistryEntry = {
  id: string;
  status: ReportMetricLifecycleStatus;
  /** Obbligatorio se status deprecated — supporta catene (resolver MAX_RESOLUTION_DEPTH). */
  replacementId?: string;
  technicalOwner: string;
  businessOwner?: string;
  freshnessSLA?: number;
  observabilityEnabled: boolean;
  contractImpact: ReportMetricContractImpact;
  validation?: {
    status: ReportMetricValidationStatus;
  };
  owner: import("@/components/report/report-sections-config").ReportSectionId;
  category: ReportMetricCategory;
  label: string;
  description: string;
  unit: ReportMetricUnit;
  aggregation: ReportMetricAggregation;
  applicability: ReportMetricApplicability;
  trendSemantics: ReportMetricTrendSemantics;
  rendererKind: ReportMetricKind;
  /** Obbligatorio per status active — presentation SSOT. */
  formatter?: ReportValueFormatter;
  icon?: ReportMetricIcon;
  sourceModule: string;
  formula?: string;
  trust?: ReportKpiTrust;
  confidence?: ReportMetricConfidence;
  valueCapability: ReportMetricValueCapability;
  series?: ReportMetricSeriesConfig;
};
