import type { DrillDownRef } from "@/lib/report/contracts/drill-down-contract";
import type { ReportMetadataEnvelope, TrustStatus } from "@/lib/report/contracts/metadata-envelope";
import type { CanonicalMetricId } from "@/lib/report/metrics/report-metric-registry";

export const INSIGHT_CONTRACT_VERSION = "1" as const;
export const INSIGHT_STRIP_MAX = 5 as const;
export const INSIGHT_P0_RULE_COUNT = 26 as const;

export type InsightContractVersion = typeof INSIGHT_CONTRACT_VERSION;

export type InsightSeverity = "info" | "warning" | "critical";
export type InsightDomain =
  | "lavorazioni"
  | "magazzino"
  | "economico"
  | "ore"
  | "cross"
  | "compliance";

export type InsightSkipReason =
  | "deferred"
  | "missing_data"
  | "trust_blocked"
  | "condition_false";

export const INSIGHT_SKIP_REASONS = [
  "deferred",
  "missing_data",
  "trust_blocked",
  "condition_false",
] as const satisfies readonly InsightSkipReason[];

export type InsightCandidate = {
  ruleKey: string;
  ruleVersion: number;
  severity: InsightSeverity;
  priority: number;
  metricIds: CanonicalMetricId[];
  trust: TrustStatus;
  payload: Record<string, string | number | boolean>;
};

export type InsightEvaluationResult =
  | { status: "fired"; candidate: InsightCandidate }
  | { status: "skipped"; ruleKey: string; ruleVersion: number; reason: InsightSkipReason };

export type InsightDto = {
  id: string;
  ruleKey: string;
  ruleVersion: number;
  message: string;
  severity: InsightSeverity;
  priority: number;
  metricIds: CanonicalMetricId[];
  drillDown: DrillDownRef;
  trust: TrustStatus;
};

export type ReportInsightsDto = {
  contractVersion: InsightContractVersion;
  insights: InsightDto[];
  metadata: ReportMetadataEnvelope;
};

export type InsightPayloadData = {
  contractVersion: InsightContractVersion;
  insights: InsightDto[];
};

export type ScoredInsightCandidate = InsightCandidate & { score: number };

export type EnrichedInsight = Omit<InsightDto, "message">;
