import type { ReportAnalyticsTrustSummary, ReportMetricSeries } from "@/lib/report/analytics-engine/types";
import type { ReportCompareMode } from "@/lib/report/date-ranges";
import type { ReportMetricEnvelope } from "@/lib/report/metrics/report-metric-envelope";

export type BusinessReportType = "weekly" | "monthly" | "custom";

export type ReportRunStatus = "generating" | "completed" | "failed";

export type BusinessReportAiStatus = "completed" | "unavailable";

export type BusinessReportClaimType =
  | "numeric"
  | "directional"
  | "comparison"
  | "entity"
  | "causal";

export type BusinessReportClaimConfidence = "verified" | "derived" | "contextual";

export type BusinessReportClaim = {
  text: string;
  type: BusinessReportClaimType;
  metricIds: string[];
  insightRuleKeys?: string[];
  confidence: BusinessReportClaimConfidence;
};

export type BusinessReportProvenance = {
  engineVersion: string;
  reportSchemaVersion: string;
  promptVersion: string;
  generatedAt: string;
  period: { from: string; to: string };
  compareMode: ReportCompareMode;
  metricIds: string[];
  formulaIds: string[];
  insightRuleKeys: string[];
  insightCount: number;
  eventCount: number;
  correlationCount: number;
};

export type BusinessReportInsightItem = {
  id: string;
  ruleKey: string;
  title: string;
  explanation: string;
  severity: "positive" | "negative" | "attention" | "neutral";
  metricIds: string[];
  insightRuleKeys: string[];
  /** AI overlay — optional narrative linked to deterministic bucket */
  aiExplanation?: string;
};

export type BusinessReportEventRef = {
  id: string;
  headline: string;
  source: "automatic" | "diary";
  metricIds?: string[];
  insightRuleKeys?: string[];
};

export type BusinessReportCorrelationRef = {
  id: string;
  label: string;
  association: "correlato" | "temporalmente_associato" | "possibile_fattore" | "evento_coincidente";
  metricIds: string[];
  insightRuleKeys?: string[];
  eventIds?: string[];
};

export type BusinessReportOperationalContext = {
  events: BusinessReportEventRef[];
  correlations: BusinessReportCorrelationRef[];
};

export type BusinessReportDecisionPoint = {
  title: string;
  rationale: string;
  supportingMetricIds: string[];
  insightRuleKeys?: string[];
  aiRationale?: string;
};

export type DomainPeriodMetricChange = {
  metricId: string;
  label: string;
  value: string;
  deltaPercent: number | null;
  deltaLabel: string | null;
};

export type DomainPeriodInsightWatch = {
  ruleKey: string;
  title: string;
  explanation: string;
  severity: BusinessReportInsightItem["severity"];
};

export type BusinessReportDomainBrief = {
  domainId: string;
  title: string;
  improved: DomainPeriodMetricChange[];
  worsened: DomainPeriodMetricChange[];
  /** Valori attuali senza confronto — backlog, scorte, flotta, ecc. */
  snapshots: DomainPeriodMetricChange[];
  watch: DomainPeriodInsightWatch[];
  /** Overlay narrativo AI per l'area */
  narrative?: string;
};

export type BusinessReportQualityVerdict = "publishable" | "needs_retry" | "failed";

export type BusinessReportQuality = {
  verdict: BusinessReportQualityVerdict;
  dataCompleteness: number;
  metricCoverage: number;
  claimSupport: number;
  trustCompliance: number;
  failures?: string[];
};

export type BusinessReport = {
  contractVersion: typeof import("@/lib/report/business-report/versions").BUSINESS_REPORT_SCHEMA_VERSION;
  id: string;
  logicalReportKey: string;
  generationVersion: number;
  reportType: BusinessReportType;
  period: { from: string; to: string };
  compare?: {
    mode: ReportCompareMode;
    from: string | null;
    to: string | null;
  };
  generatedAt: string;
  status: ReportRunStatus;
  aiStatus: BusinessReportAiStatus;
  executiveSummary: string;
  /** Analisi strutturata per area — miglioramenti, peggioramenti, attenzione */
  domainBriefs?: BusinessReportDomainBrief[];
  kpis: ReportMetricEnvelope[];
  trends: ReportMetricSeries[];
  highlights: BusinessReportInsightItem[];
  concerns: BusinessReportInsightItem[];
  anomalies: BusinessReportInsightItem[];
  events: BusinessReportEventRef[];
  operationalContext?: BusinessReportOperationalContext;
  decisions: BusinessReportDecisionPoint[];
  trustSummary: ReportAnalyticsTrustSummary;
  provenance: BusinessReportProvenance;
  quality?: BusinessReportQuality;
  error?: string;
};

export type BusinessReportRunRow = {
  id: string;
  logical_report_key: string;
  generation_version: number;
  idempotency_key: string;
  report_type: BusinessReportType;
  period_start: string;
  period_end: string;
  compare_mode: ReportCompareMode;
  status: ReportRunStatus;
  engine_version: string;
  prompt_version: string;
  report_schema_version: string;
  content: BusinessReport | null;
  provenance: BusinessReportProvenance | null;
  trust_summary: ReportAnalyticsTrustSummary | null;
  quality: BusinessReportQuality | null;
  ai_status: BusinessReportAiStatus;
  error: string | null;
  generated_at: string;
  completed_at: string | null;
  created_by: string | null;
};
