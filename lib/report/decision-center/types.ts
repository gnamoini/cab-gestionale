import type { ReportDrillDownContext } from "@/lib/report/drilldown/types";
import type { ReportMetricEnvelopeTrust } from "@/lib/report/metrics/report-metric-envelope";

export type DecisionPriority = "critical" | "high" | "medium" | "low";

export type DecisionCategory =
  | "economic"
  | "operational"
  | "commercial"
  | "inventory"
  | "resource"
  | "customer";

export type DecisionStatus =
  | "new"
  | "acknowledged"
  | "monitoring"
  | "resolved"
  | "dismissed";

export type DecisionSource = "rule_engine" | "business_report";

export type DecisionEntityRef = {
  dimension?: string;
  entityId?: string;
};

export type DecisionEvidenceMetric = {
  metricId: string;
  label: string;
  value: string;
  deltaPercent: number | null;
  trust: ReportMetricEnvelopeTrust;
};

export type DecisionEvidence = {
  metrics: DecisionEvidenceMetric[];
  insightRuleKeys: string[];
  eventIds: string[];
  summary: string;
};

export type DecisionCandidate = {
  candidateId: string;
  candidateFingerprint: string;
  conditionHash: string;
  ruleKey: string;
  title: string;
  summary: string;
  rationale: string;
  priority: DecisionPriority;
  category: DecisionCategory;
  trust: ReportMetricEnvelopeTrust;
  metricIds: string[];
  insightRuleKeys: string[];
  eventIds: string[];
  entity?: DecisionEntityRef;
  evidence: DecisionEvidence;
  drillDownContexts?: ReportDrillDownContext[];
  source: DecisionSource;
  sourceReportRunId?: string;
};

export type ReportDecisionPoint = DecisionCandidate & {
  id: string;
  status: DecisionStatus;
  engineVersion: string;
  priorityModelVersion: string;
  aiExplanation?: string | null;
  aiStatus?: "completed" | "unavailable";
  dismissedConditionHash?: string | null;
  acknowledgedAt?: string | null;
  resolvedAt?: string | null;
  dismissedAt?: string | null;
  generatedAt: string;
};

export type DecisionCenterDto = {
  contractVersion: typeof import("@/lib/report/decision-center/versions").DECISION_SCHEMA_VERSION;
  decisions: ReportDecisionPoint[];
  aiStatus: "completed" | "unavailable" | "idle";
  generatedAt: string;
};
