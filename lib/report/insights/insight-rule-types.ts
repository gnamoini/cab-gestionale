import type { DrillDownRef } from "@/lib/report/contracts/drill-down-contract";
import type { TrustStatus } from "@/lib/report/contracts/metadata-envelope";
import type { CanonicalMetricId } from "@/lib/report/metrics/report-metric-registry";
import type { InsightRuleContext } from "@/lib/report/insights/insight-input";
import type {
  InsightDomain,
  InsightEvaluationResult,
  InsightSeverity,
} from "@/lib/report/insights/types";

export type InsightRuleDefinition = {
  ruleKey: string;
  ruleVersion: number;
  domain: InsightDomain;
  severity: InsightSeverity;
  priority: number;
  applicability: "active" | "deferred";
  requiresTrust?: TrustStatus[];
  metricIds: CanonicalMetricId[];
  drillDown: DrillDownRef;
  evaluate(input: InsightRuleContext): InsightEvaluationResult;
};
