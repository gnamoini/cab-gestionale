import "server-only";

import { buildReportAnalytics } from "@/lib/report/analytics-engine/build-report-analytics";
import { buildReportAnalyticsForAiContext } from "@/lib/report/analytics-engine/adapters/to-ai-context";
import type { ReportAnalyticsGranularity, ReportAnalyticsResult } from "@/lib/report/analytics-engine/types";
import { buildAnalyticsDatasetBundle } from "@/lib/report/analytics/analytics-dataset-bundle";
import { buildReportCrossDto } from "@/lib/report/cross-analysis/build-report-cross-dto";
import { createReportDatasetContext } from "@/lib/report/datasets/context";
import {
  enrichSlicesForDataset,
  loadBaseSlices,
} from "@/lib/report/datasets/api/report-dataset-api";
import type { ReportMetadataEnvelope, ReportRequestedPeriod } from "@/lib/report/contracts/metadata-envelope";
import { buildReportInsightsDto } from "@/lib/report/insights/builders/build-report-insights-dto";
import { loadComplianceInsightCounts } from "@/lib/operational-intelligence/compliance/load-compliance-counts.server";
import { loadOperationalDiaryForPeriod } from "@/lib/operational-intelligence/diary/load-operational-diary.server";
import { classifyDiaryEntry } from "@/lib/operational-intelligence/diary/classify-diary-entry";
import { buildFactEngine } from "@/lib/operational-intelligence/facts/build-fact-engine";
import { resolveOperationalPeriod } from "@/lib/operational-intelligence/period/resolve-operational-period";
import { resolveDatasetDateRanges } from "@/lib/report/datasets/period";
import { ymdFromDate } from "@/lib/report/date-ranges";
import { buildOperationalEventsFromSources } from "@/lib/report/operational-context/build-operational-events-from-sources";
import { buildReportCorrelationsLegacy } from "@/lib/report/operational-context/build-report-correlations-legacy";
import { resolveSupportedReportMetrics } from "@/lib/report/business-report/metric-selection";
import type { BusinessReportType, BusinessReportEventRef } from "@/lib/report/business-report/types";
import { buildDeterministicInsightBuckets } from "@/lib/report/business-report/classification/build-deterministic-insight-buckets";
import { buildDomainPeriodBriefs } from "@/lib/report/business-report/analysis/build-domain-period-briefs";
import type { InsightDto } from "@/lib/report/insights/types";
import type { ReportMetricEnvelope } from "@/lib/report/metrics/report-metric-envelope";

const MAX_DIARY = 8;
const MAX_INSIGHTS = 12;

export type BusinessReportRuntimeContext = {
  period: ReportRequestedPeriod;
  reportType: BusinessReportType;
  analytics: ReportAnalyticsResult;
  insights: InsightDto[];
  insightsMetadata: ReportMetadataEnvelope;
  buckets: ReturnType<typeof buildDeterministicInsightBuckets>;
  events: BusinessReportEventRef[];
  correlations: ReturnType<typeof buildReportCorrelationsLegacy>;
  aiContext: ReturnType<typeof buildReportAnalyticsForAiContext>;
  envelopesById: Map<string, ReportMetricEnvelope>;
  skippedMetricIds: string[];
};

export type BusinessReportAiPromptContext = {
  period: ReportAnalyticsResult["period"];
  compare: ReportAnalyticsResult["compare"];
  metrics: ReturnType<typeof buildReportAnalyticsForAiContext>["metrics"];
  keySeries: ReportAnalyticsResult["series"];
  trustSummary: ReportAnalyticsResult["trustSummary"];
  deterministicBuckets: ReturnType<typeof buildDeterministicInsightBuckets>;
  domainBriefs: ReturnType<typeof buildDomainPeriodBriefs>;
  insights: Array<{ ruleKey: string; message: string; severity: string; metricIds: string[] }>;
  events: BusinessReportEventRef[];
  correlations: ReturnType<typeof buildReportCorrelationsLegacy>;
};

export function buildBusinessReportAiPromptContext(ctx: BusinessReportRuntimeContext): BusinessReportAiPromptContext {
  const domainBriefs = buildDomainPeriodBriefs({
    metrics: ctx.analytics.metrics,
    highlights: ctx.buckets.highlights,
    concerns: ctx.buckets.concerns,
    anomalies: ctx.buckets.anomalies,
  });

  return {
    period: ctx.analytics.period,
    compare: ctx.analytics.compare,
    metrics: ctx.aiContext.metrics.slice(0, 24),
    keySeries: ctx.analytics.series.slice(0, 8),
    trustSummary: ctx.analytics.trustSummary,
    deterministicBuckets: ctx.buckets,
    domainBriefs,
    insights: ctx.insights.map((i) => ({
      ruleKey: i.ruleKey,
      message: i.message,
      severity: i.severity,
      metricIds: [...i.metricIds],
    })),
    events: ctx.events,
    correlations: ctx.correlations,
  };
}

export async function buildBusinessReportContext(
  period: ReportRequestedPeriod,
  reportType: BusinessReportType,
): Promise<BusinessReportRuntimeContext> {
  const { supported, skipped } = resolveSupportedReportMetrics(reportType);
  const granularity: ReportAnalyticsGranularity = reportType === "monthly" ? "week" : "day";

  const { result: analytics } = await buildReportAnalytics({
    period,
    metricIds: supported,
    compareMode: period.compareMode,
    includeSeries: true,
    granularity,
  });

  const [baseSlices, complianceCounts] = await Promise.all([
    loadBaseSlices(period),
    loadComplianceInsightCounts(),
  ]);
  const economicoSlices = await enrichSlicesForDataset("economico", baseSlices);
  const oreSlices = await enrichSlicesForDataset("ore", baseSlices);

  const lavCtx = createReportDatasetContext({ period, compareMode: period.compareMode, integrity: baseSlices.integrity });
  const magCtx = createReportDatasetContext({ period, compareMode: period.compareMode, integrity: baseSlices.integrity });
  const ecoCtx = createReportDatasetContext({ period, compareMode: period.compareMode, integrity: economicoSlices.integrity });
  const oreCtx = createReportDatasetContext({ period, compareMode: period.compareMode, integrity: oreSlices.integrity });

  const bundle = buildAnalyticsDatasetBundle({
    lavorazioniCtx: lavCtx,
    magazzinoCtx: magCtx,
    economicoCtx: ecoCtx,
    oreCtx,
    baseSlices,
    economicoSlices,
    oreSlices,
  });

  const cross = buildReportCrossDto({ bundle, requestedPeriod: period });
  const { dto: insightsDto } = buildReportInsightsDto({
    bundle,
    cross,
    requestedPeriod: period,
    complianceCounts,
  });

  const insights = insightsDto.insights.slice(0, MAX_INSIGHTS);
  const insightsMetadata = insightsDto.metadata;
  const envelopesById = new Map(analytics.metrics.map((m) => [m.metricId, m]));
  const buckets = buildDeterministicInsightBuckets(insights, envelopesById);

  const { range } = resolveDatasetDateRanges({ period });
  const fromYmd = period.start || ymdFromDate(range.start);
  const toYmd = period.end || ymdFromDate(range.end);
  const diaryRaw = await loadOperationalDiaryForPeriod(fromYmd, toYmd);
  const classifiedDiary = diaryRaw.map((e) => classifyDiaryEntry(e.workDate, e.text)).slice(0, MAX_DIARY);

  const opPeriod = resolveOperationalPeriod({ preset: period.preset, range });
  const facts = buildFactEngine({ period: opPeriod, bundle, cross, insights: insightsDto });
  const { events, correlations } = buildOperationalEventsFromSources({
    insights,
    classifiedDiary,
    facts,
    envelopesById,
  });

  return {
    period,
    reportType,
    analytics,
    insights,
    insightsMetadata,
    buckets,
    events,
    correlations,
    aiContext: buildReportAnalyticsForAiContext(analytics),
    envelopesById,
    skippedMetricIds: skipped,
  };
}
