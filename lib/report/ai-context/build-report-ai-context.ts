import { mergeTrustStatus } from "@/lib/report/contracts/merge-trust-status";
import type { ReportRequestedPeriod } from "@/lib/report/contracts/metadata-envelope";
import { calculateInsightScore } from "@/lib/report/insights/engine/calculate-insight-score";
import type { ReportCrossDto } from "@/lib/report/cross-analysis/types";
import type { AnalyticsDatasetBundle } from "@/lib/report/analytics/analytics-dataset-bundle";
import type { InsightTelemetrySummary } from "@/lib/report/insights/observability/insight-telemetry-summary";
import type { InsightCandidate, InsightEvaluationResult } from "@/lib/report/insights/types";
import {
  AI_CONTEXT_CONTRACT_VERSION,
  AI_CONTEXT_MAX_INSIGHTS,
  AI_CONTEXT_MAX_PAYLOAD_BYTES,
  AI_INSIGHT_PAYLOAD_SCHEMA_VERSION,
  type AIInsightSignal,
  type AIDiaryContextEntry,
  type ReportAIContextDto,
} from "@/lib/report/ai-context/types";

export type BuildReportAIContextInput = {
  evaluationResults: InsightEvaluationResult[];
  telemetry: InsightTelemetrySummary;
  requestedPeriod?: ReportRequestedPeriod;
  cross?: ReportCrossDto;
  bundle?: AnalyticsDatasetBundle;
  operationalDiary?: AIDiaryContextEntry[];
};

function toAIInsightSignal(candidate: InsightCandidate): AIInsightSignal {
  return {
    ruleKey: candidate.ruleKey,
    ruleVersion: candidate.ruleVersion,
    severity: candidate.severity,
    trust: candidate.trust,
    metricIds: [...candidate.metricIds],
    payload: {
      schemaVersion: AI_INSIGHT_PAYLOAD_SCHEMA_VERSION,
      values: { ...candidate.payload },
    },
  };
}

function rankFiredCandidates(candidates: InsightCandidate[]): InsightCandidate[] {
  return [...candidates]
    .sort((a, b) => {
      const scoreA = calculateInsightScore(a);
      const scoreB = calculateInsightScore(b);
      if (scoreB !== scoreA) return scoreB - scoreA;
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.ruleKey.localeCompare(b.ruleKey);
    })
    .slice(0, AI_CONTEXT_MAX_INSIGHTS);
}

function serializeContextBytes(dto: ReportAIContextDto): number {
  return Buffer.byteLength(JSON.stringify(dto), "utf8");
}

function fitPayloadBudget(dto: ReportAIContextDto): ReportAIContextDto {
  const insights = [...dto.insights];
  while (insights.length > 0 && serializeContextBytes({ ...dto, insights }) > AI_CONTEXT_MAX_PAYLOAD_BYTES) {
    insights.pop();
  }
  return { ...dto, insights };
}

export function buildReportAIContextDto(input: BuildReportAIContextInput): ReportAIContextDto {
  const fired = input.evaluationResults
    .filter((r): r is Extract<InsightEvaluationResult, { status: "fired" }> => r.status === "fired")
    .map((r) => r.candidate);

  const ranked = rankFiredCandidates(fired);
  const insights = ranked.map(toAIInsightSignal);
  const trusts = fired.map((c) => c.trust);

  const base: ReportAIContextDto = {
    contractVersion: AI_CONTEXT_CONTRACT_VERSION,
    period: input.requestedPeriod,
    insights,
    trustSummary: trusts.length > 0 ? mergeTrustStatus(trusts) : "GREEN",
    operationalDiary: input.operationalDiary?.length ? input.operationalDiary.slice(0, 20) : undefined,
    telemetry: {
      firedRules: input.telemetry.firedRules,
      skippedRules: input.telemetry.skippedRules,
      insightFireRate: input.telemetry.insightFireRate,
      crossMetrics: input.cross?.metrics.map((m) => ({
        metricId: m.metricId,
        formattedValue: m.formattedValue,
        trust: m.trust,
      })),
      economicSummary: input.bundle
        ? {
            fatturato:
              input.bundle.datasets.economico.metrics.find((m) => m.id === "eco_fatturato")?.value ?? null,
            preventivi:
              input.bundle.datasets.economico.metrics.find((m) => m.id === "eco_preventivi")?.value ?? null,
          }
        : undefined,
    },
  };

  return fitPayloadBudget(base);
}
