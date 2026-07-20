import type { ReportRequestedPeriod } from "@/lib/report/contracts/metadata-envelope";
import type { TrustStatus } from "@/lib/report/contracts/metadata-envelope";
import type { CanonicalMetricId } from "@/lib/report/metrics/report-metric-registry";
import type { InsightSeverity } from "@/lib/report/insights/types";
import type { InsightTelemetrySummary } from "@/lib/report/insights/observability/insight-telemetry-summary";

export const AI_CONTEXT_CONTRACT_VERSION = "1" as const;
export const AI_CONTEXT_MAX_INSIGHTS = 10 as const;
export const AI_CONTEXT_MAX_PAYLOAD_BYTES = 8192 as const;
export const AI_INSIGHT_PAYLOAD_SCHEMA_VERSION = 1 as const;

export type AIContextContractVersion = typeof AI_CONTEXT_CONTRACT_VERSION;

export type AIInsightPayload = {
  schemaVersion: typeof AI_INSIGHT_PAYLOAD_SCHEMA_VERSION;
  values: Record<string, string | number | boolean>;
};

export type AIInsightSignal = {
  ruleKey: string;
  ruleVersion: number;
  severity: InsightSeverity;
  trust: TrustStatus;
  metricIds: CanonicalMetricId[];
  payload: AIInsightPayload;
};

export type AIDiaryContextEntry = {
  workDate: string;
  body: string;
};

export type ReportAIContextDto = {
  contractVersion: AIContextContractVersion;
  period?: ReportRequestedPeriod;
  insights: AIInsightSignal[];
  trustSummary: TrustStatus;
  operationalDiary?: AIDiaryContextEntry[];
  telemetry?: Pick<InsightTelemetrySummary, "firedRules" | "skippedRules" | "insightFireRate"> & {
    crossMetrics?: { metricId: string; formattedValue: string; trust: TrustStatus }[];
    economicSummary?: { fatturato: number | null; preventivi: number | null };
  };
};

export type ReportAIContextPayloadData = {
  contractVersion: AIContextContractVersion;
  insights: AIInsightSignal[];
  trustSummary: TrustStatus;
};
