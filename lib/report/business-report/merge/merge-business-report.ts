import type { BusinessReportRuntimeContext } from "@/lib/report/business-report/context/build-business-report-context";
import type { BusinessReportAiOutput } from "@/lib/report/business-report/schema/business-report-ai-output-schema";
import type {
  BusinessReport,
  BusinessReportDomainBrief,
  BusinessReportInsightItem,
  BusinessReportProvenance,
} from "@/lib/report/business-report/types";
import {
  BUSINESS_REPORT_ENGINE_VERSION,
  BUSINESS_REPORT_PROMPT_VERSION,
  BUSINESS_REPORT_SCHEMA_VERSION,
} from "@/lib/report/business-report/versions";
import { buildDeterministicExecutiveSummary } from "@/lib/report/business-report/merge/build-deterministic-executive-summary";
import { buildDomainPeriodBriefs } from "@/lib/report/business-report/analysis/build-domain-period-briefs";
import { randomUUID } from "node:crypto";

function overlayAiExplanation(
  items: BusinessReportInsightItem[],
  aiItems: Array<{ ruleKey: string; title: string; explanation: string; metricIds: string[] }>,
): BusinessReportInsightItem[] {
  const byRule = new Map(aiItems.map((a) => [a.ruleKey, a]));
  return items.map((item) => {
    const ai = byRule.get(item.ruleKey);
    if (!ai) return item;
    return {
      ...item,
      title: ai.title || item.title,
      aiExplanation: ai.explanation,
    };
  });
}

function overlayDomainNarratives(
  briefs: BusinessReportDomainBrief[],
  narratives: Array<{ domainId: string; summary: string }> | undefined,
): BusinessReportDomainBrief[] {
  if (!narratives?.length) return briefs;
  const byId = new Map(narratives.map((n) => [n.domainId, n.summary]));
  return briefs.map((b) => {
    const narrative = byId.get(b.domainId);
    return narrative ? { ...b, narrative } : b;
  });
}

export function buildDomainBriefsFromContext(
  ctx: BusinessReportRuntimeContext,
  insightItems: {
    highlights: BusinessReportInsightItem[];
    concerns: BusinessReportInsightItem[];
    anomalies: BusinessReportInsightItem[];
  },
): BusinessReportDomainBrief[] {
  return buildDomainPeriodBriefs({
    metrics: ctx.analytics.metrics,
    highlights: insightItems.highlights,
    concerns: insightItems.concerns,
    anomalies: insightItems.anomalies,
  });
}

export function buildBusinessReportProvenance(
  ctx: BusinessReportRuntimeContext,
  generatedAt: string,
): BusinessReportProvenance {
  return {
    engineVersion: BUSINESS_REPORT_ENGINE_VERSION,
    reportSchemaVersion: BUSINESS_REPORT_SCHEMA_VERSION,
    promptVersion: BUSINESS_REPORT_PROMPT_VERSION,
    generatedAt,
    period: ctx.analytics.period,
    compareMode: ctx.period.compareMode,
    metricIds: ctx.analytics.metrics.map((m) => m.metricId),
    formulaIds: [...new Set(ctx.analytics.metrics.map((m) => m.formulaId))],
    insightRuleKeys: ctx.insights.map((i) => i.ruleKey),
    insightCount: ctx.insights.length,
    eventCount: ctx.events.length,
    correlationCount: ctx.correlations.length,
  };
}

export type MergeBusinessReportInput = {
  runId: string;
  logicalReportKey: string;
  generationVersion: number;
  ctx: BusinessReportRuntimeContext;
  ai: BusinessReportAiOutput | null;
  aiStatus: BusinessReport["aiStatus"];
  status: BusinessReport["status"];
  error?: string;
};

export function mergeBusinessReport(input: MergeBusinessReportInput): BusinessReport {
  const generatedAt = new Date().toISOString();
  const provenance = buildBusinessReportProvenance(input.ctx, generatedAt);

  const highlights = overlayAiExplanation(
    input.ctx.buckets.highlights,
    input.ai?.highlightExplanations ?? [],
  );
  const concerns = overlayAiExplanation(input.ctx.buckets.concerns, input.ai?.concernExplanations ?? []);
  const anomalies = overlayAiExplanation(input.ctx.buckets.anomalies, input.ai?.anomalyExplanations ?? []);

  const domainBriefs = overlayDomainNarratives(
    buildDomainBriefsFromContext(input.ctx, { highlights, concerns, anomalies }),
    input.ai?.domainNarratives,
  );

  const executiveSummary =
    input.ai?.executiveSummary ??
    (input.aiStatus === "unavailable" ? buildDeterministicExecutiveSummary(input.ctx, domainBriefs) : "");

  const decisions =
    input.ai?.decisions.map((d) => ({
      title: d.title,
      rationale: d.rationale,
      supportingMetricIds: d.supportingMetricIds,
      insightRuleKeys: d.insightRuleKeys,
      aiRationale: d.rationale,
    })) ?? [];

  return {
    contractVersion: BUSINESS_REPORT_SCHEMA_VERSION,
    id: input.runId,
    logicalReportKey: input.logicalReportKey,
    generationVersion: input.generationVersion,
    reportType: input.ctx.reportType,
    period: input.ctx.analytics.period,
    compare: {
      mode: input.ctx.analytics.compare.mode,
      from: input.ctx.analytics.compare.from,
      to: input.ctx.analytics.compare.to,
    },
    generatedAt,
    status: input.status,
    aiStatus: input.aiStatus,
    executiveSummary,
    domainBriefs,
    kpis: input.ctx.analytics.metrics,
    trends: input.ctx.analytics.series,
    highlights,
    concerns,
    anomalies,
    events: input.ctx.events,
    operationalContext: {
      events: input.ctx.events,
      correlations: input.ctx.correlations,
    },
    decisions,
    trustSummary: input.ctx.analytics.trustSummary,
    provenance,
    error: input.error,
  };
}

export function newReportRunId(): string {
  return randomUUID();
}
