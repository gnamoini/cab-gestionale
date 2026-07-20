import { evaluateInsightRules } from "@/lib/report/insights/engine/evaluate-insight-rules";
import { trustFilterFiredCandidates } from "@/lib/report/insights/engine/trust-filter";
import { scoreInsightCandidates } from "@/lib/report/insights/engine/calculate-insight-score";
import { rankInsights } from "@/lib/report/insights/engine/rank-insights";
import { enrichInsightDto } from "@/lib/report/insights/engine/enrich-insight-dto";
import { renderInsightMessage } from "@/lib/report/insights/engine/render-insight-message";
import { buildInsightRuleContext, type InsightEngineInput } from "@/lib/report/insights/insight-input";
import { mergeInsightMetadata } from "@/lib/report/insights/merge-insight-metadata";
import { INSIGHT_RULE_REGISTRY } from "@/lib/report/insights/registry/insight-rule-registry";
import {
  INSIGHT_CONTRACT_VERSION,
  type InsightDto,
  type InsightEvaluationResult,
  type ReportInsightsDto,
} from "@/lib/report/insights/types";

export type BuildReportInsightsResult = {
  dto: ReportInsightsDto;
  evaluationResults: InsightEvaluationResult[];
};

export function buildReportInsightsDto(input: InsightEngineInput): BuildReportInsightsResult {
  const ctx = buildInsightRuleContext(input);
  const evaluationResults = evaluateInsightRules(ctx);
  const candidates = trustFilterFiredCandidates(evaluationResults);
  const scored = scoreInsightCandidates(candidates);
  const ranked = rankInsights(scored);

  const insights: InsightDto[] = [];
  for (const candidate of ranked) {
    const enriched = enrichInsightDto(candidate);
    if (!enriched) continue;
    insights.push({
      ...enriched,
      message: renderInsightMessage(candidate),
    });
  }

  return {
    evaluationResults,
    dto: {
      contractVersion: INSIGHT_CONTRACT_VERSION,
      insights,
      metadata: mergeInsightMetadata(input.bundle.metadata.childMetadata, insights, {
        requestedPeriod: input.requestedPeriod,
      }),
    },
  };
}

export function insightCatalogRuleCount(): number {
  return INSIGHT_RULE_REGISTRY.length;
}
