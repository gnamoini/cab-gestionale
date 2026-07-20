import type { ReportRequestedPeriod, TrustStatus } from "@/lib/report/contracts/metadata-envelope";
import type { CanonicalMetricId } from "@/lib/report/metrics/report-metric-registry";
import type { InsightSeverity } from "@/lib/report/insights/types";
import type { AIContextContractVersion, AIInsightPayload } from "@/lib/report/ai-context/types";

export const NARRATIVE_PROMPT_CONTEXT_VERSION = "1" as const;
export const GENERATED_NARRATIVE_CONTRACT_VERSION = "1" as const;

export const NARRATIVE_PROVIDER_IDS = ["gemini"] as const;
export type NarrativeProviderId = (typeof NARRATIVE_PROVIDER_IDS)[number];

export type NarrativePromptContextVersion = typeof NARRATIVE_PROMPT_CONTEXT_VERSION;
export type GeneratedNarrativeContractVersion = typeof GENERATED_NARRATIVE_CONTRACT_VERSION;

export type NarrativePromptSignal = {
  ruleKey: string;
  ruleVersion: number;
  severity: InsightSeverity;
  trust: TrustStatus;
  metricIds: CanonicalMetricId[];
  payload: AIInsightPayload;
};

export type NarrativePromptContext = {
  contractVersion: NarrativePromptContextVersion;
  period?: ReportRequestedPeriod;
  trustSummary: TrustStatus;
  signals: NarrativePromptSignal[];
  operationalDiary?: { workDate: string; body: string }[];
  sourceContextVersion: AIContextContractVersion;
};

export type GeneratedNarrativeSection = {
  ruleKey: string;
  metricIds: CanonicalMetricId[];
  explanation: string;
  /** Audit trail: trust of the source signal that produced this explanation. */
  sourceTrust?: TrustStatus;
};

export type NarrativeModelMetadata = {
  provider: NarrativeProviderId;
  model: string;
  latencyMs?: number;
};

/**
 * Explanatory only — MUST NOT become source of truth, input for calculations, alerts, or health score.
 */
export type GeneratedNarrativeDto = {
  contractVersion: GeneratedNarrativeContractVersion;
  sections: GeneratedNarrativeSection[];
  disclaimer?: string;
  generatedAt: string;
  modelMetadata?: NarrativeModelMetadata;
};
