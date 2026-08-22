import type { ReportDrillDownContext } from "@/lib/report/drilldown/types";
import type { ReportRequestedPeriod } from "@/lib/report/contracts/metadata-envelope";
import type { ReportCompareMode, DateRange } from "@/lib/report/date-ranges";
import type { ReportMetricEnvelope } from "@/lib/report/metrics/report-metric-envelope";
import type { ReportAnalyticsTrustSummary } from "@/lib/report/analytics-engine/types";
import type { InsightDto } from "@/lib/report/insights/types";
import type { ReportDecisionPoint } from "@/lib/report/decision-center/types";
import type { ReportOperationalEvent } from "@/lib/report/operational-context/types";
import type { ReportDimensionBreakdown } from "@/lib/report/analytics-engine/types";
import type { ASK_REPORT_SCHEMA_VERSION } from "@/lib/report/ask-report/versions";

export type AskReportIntent =
  | "metric_query"
  | "trend_query"
  | "comparison_query"
  | "breakdown_query"
  | "operational_context_query"
  | "insight_query"
  | "decision_query"
  | "drilldown_query"
  | "recidivita_query"
  | "explanation_query"
  | "summary_query"
  | "followup_query"
  | "greeting_query";

export type AskReportConversationContext = {
  period: ReportRequestedPeriod;
  compareMode: ReportCompareMode;
  metricId?: string;
  entity?: { type: string; id: string };
};

export type AskReportRequest = {
  conversationId?: string;
  message: string;
  conversationContext?: AskReportConversationContext;
  period?: ReportRequestedPeriod;
  compareMode?: ReportCompareMode;
  uiContext?: {
    activeSection?: string;
    focusedMetricId?: string;
    focusedEntity?: { type: string; id: string };
  };
};

export type AskReportCitation = {
  type: "metric" | "series" | "insight" | "decision" | "operational_event" | "record";
  id: string;
  label: string;
  metricId?: string;
  period?: DateRange;
  drillDownContext?: ReportDrillDownContext;
};

export type AskReportFollowUp = {
  label: string;
  message: string;
};

export type AskReportToolProvenance = {
  period: { from: string; to: string };
  compareMode?: ReportCompareMode;
  metricIds?: string[];
  engineVersion?: string;
};

export type AskReportToolResultData =
  | ReportMetricEnvelope
  | { series: unknown[]; metricId: string }
  | ReportDimensionBreakdown
  | InsightDto[]
  | { summaryEvents: ReportOperationalEvent[] }
  | ReportDecisionPoint[]
  | import("@/lib/report/ask-report/recidivita/load-ask-recidivita.server").AskRecidivitaToolData
  | { rows: unknown[]; context: ReportDrillDownContext };

export type AskReportToolResult = {
  toolName: string;
  success: boolean;
  data?: AskReportToolResultData;
  error?: string;
  citations: AskReportCitation[];
  provenance: AskReportToolProvenance;
};

export type AskReportResponseStatus = "completed" | "needs_clarification" | "failed";

export type AskReportResponse = {
  contractVersion: typeof ASK_REPORT_SCHEMA_VERSION;
  conversationId: string;
  conversationContext: AskReportConversationContext;
  answer: string;
  citations: AskReportCitation[];
  metrics?: ReportMetricEnvelope[];
  insights?: InsightDto[];
  decisions?: ReportDecisionPoint[];
  drillDownContexts?: ReportDrillDownContext[];
  trustSummary?: ReportAnalyticsTrustSummary;
  followUps?: AskReportFollowUp[];
  status: AskReportResponseStatus;
  clarificationQuestion?: string;
  toolActivity?: string[];
  planMode?: "deterministic" | "llm";
};

export type EffectiveAskContext = {
  period: ReportRequestedPeriod;
  compareMode: ReportCompareMode;
  metricId?: string;
  entity?: { type: string; id: string };
};

export type AskReportToolCall = {
  toolName: string;
  args: Record<string, unknown>;
};

export type AskReportIntentResult = {
  intent: AskReportIntent;
  confidence: number;
  planMode: "deterministic" | "llm";
  toolCalls?: AskReportToolCall[];
  needsClarification?: boolean;
  clarificationQuestion?: string;
};
