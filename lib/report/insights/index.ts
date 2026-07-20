export {
  INSIGHT_CONTRACT_VERSION,
  INSIGHT_P0_RULE_COUNT,
  INSIGHT_SKIP_REASONS,
  INSIGHT_STRIP_MAX,
} from "@/lib/report/insights/types";
export type {
  InsightCandidate,
  InsightDto,
  InsightEvaluationResult,
  InsightPayloadData,
  InsightSeverity,
  InsightSkipReason,
  ReportInsightsDto,
} from "@/lib/report/insights/types";
export { INSIGHT_RULE_REGISTRY, getInsightRuleByKey } from "@/lib/report/insights/registry/insight-rule-registry";
export { buildInsightRuleContext, buildInsightSignals } from "@/lib/report/insights/insight-input";
export {
  buildReportInsightsDto,
  insightCatalogRuleCount,
  type BuildReportInsightsResult,
} from "@/lib/report/insights/builders/build-report-insights-dto";
export { evaluateInsightRules } from "@/lib/report/insights/engine/evaluate-insight-rules";
export { calculateInsightScore, SEVERITY_SCORE } from "@/lib/report/insights/engine/calculate-insight-score";
export { buildInsightTelemetrySummary } from "@/lib/report/insights/observability/insight-telemetry-summary";
export type { InsightTelemetrySummary } from "@/lib/report/insights/observability/insight-telemetry-summary";
