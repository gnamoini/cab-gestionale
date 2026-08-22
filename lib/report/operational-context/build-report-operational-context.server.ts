import "server-only";

import { buildReportAnalytics } from "@/lib/report/analytics-engine/build-report-analytics";
import { buildAnalyticsDatasetBundle } from "@/lib/report/analytics/analytics-dataset-bundle";
import { buildReportCrossDto } from "@/lib/report/cross-analysis/build-report-cross-dto";
import { createReportDatasetContext } from "@/lib/report/datasets/context";
import {
  enrichSlicesForDataset,
  loadBaseSlices,
} from "@/lib/report/datasets/api/report-dataset-api";
import type { ReportRequestedPeriod } from "@/lib/report/contracts/metadata-envelope";
import { buildReportInsightsDto } from "@/lib/report/insights/builders/build-report-insights-dto";
import { loadComplianceInsightCounts } from "@/lib/operational-intelligence/compliance/load-compliance-counts.server";
import { loadOperationalDiaryForPeriod } from "@/lib/operational-intelligence/diary/load-operational-diary.server";
import { classifyDiaryEntry } from "@/lib/operational-intelligence/diary/classify-diary-entry";
import { buildFactEngine } from "@/lib/operational-intelligence/facts/build-fact-engine";
import { resolveOperationalPeriod } from "@/lib/operational-intelligence/period/resolve-operational-period";
import { resolveDatasetDateRanges } from "@/lib/report/datasets/period";
import { ymdFromDate } from "@/lib/report/date-ranges";
import { buildOperationalEventsFromSources } from "@/lib/report/operational-context/build-operational-events-from-sources";
import { buildOperationalCorrelations } from "@/lib/report/operational-context/build-operational-correlations";
import { dedupeOperationalEvents } from "@/lib/report/operational-context/dedupe-operational-events";
import { normalizeOperationalEvents } from "@/lib/report/operational-context/normalize-operational-events";
import {
  paginateTimelineEvents,
  rankSummaryOperationalEvents,
} from "@/lib/report/operational-context/rank-summary-events";
import { attachEventDrillDown } from "@/lib/report/operational-context/resolve-event-drill-down";
import type { ReportOperationalContext } from "@/lib/report/operational-context/types";

const MAX_DIARY = 8;
const MAX_INSIGHTS = 12;
const DEFAULT_TIMELINE_LIMIT = 20;

export type BuildOperationalContextInput = {
  period: ReportRequestedPeriod;
  view?: "summary" | "timeline" | "full";
  cursor?: string | null;
  limit?: number;
};

export async function buildReportOperationalContext(
  input: BuildOperationalContextInput,
): Promise<ReportOperationalContext> {
  const view = input.view ?? "full";
  const limit = input.limit ?? DEFAULT_TIMELINE_LIMIT;

  const [baseSlices, complianceCounts] = await Promise.all([
    loadBaseSlices(input.period),
    loadComplianceInsightCounts(),
  ]);
  const economicoSlices = await enrichSlicesForDataset("economico", baseSlices);
  const oreSlices = await enrichSlicesForDataset("ore", baseSlices);

  const lavCtx = createReportDatasetContext({
    period: input.period,
    compareMode: input.period.compareMode,
    integrity: baseSlices.integrity,
  });
  const magCtx = createReportDatasetContext({
    period: input.period,
    compareMode: input.period.compareMode,
    integrity: baseSlices.integrity,
  });
  const ecoCtx = createReportDatasetContext({
    period: input.period,
    compareMode: input.period.compareMode,
    integrity: economicoSlices.integrity,
  });
  const oreCtx = createReportDatasetContext({
    period: input.period,
    compareMode: input.period.compareMode,
    integrity: oreSlices.integrity,
  });

  const bundle = buildAnalyticsDatasetBundle({
    lavorazioniCtx: lavCtx,
    magazzinoCtx: magCtx,
    economicoCtx: ecoCtx,
    oreCtx,
    baseSlices,
    economicoSlices,
    oreSlices,
  });

  const cross = buildReportCrossDto({ bundle, requestedPeriod: input.period });
  const { dto: insightsDto } = buildReportInsightsDto({
    bundle,
    cross,
    requestedPeriod: input.period,
    complianceCounts,
  });

  const insights = insightsDto.insights.slice(0, MAX_INSIGHTS);
  const metricIds = [...new Set(insights.flatMap((i) => i.metricIds))];

  const { result: analytics } = await buildReportAnalytics({
    period: input.period,
    metricIds: metricIds.length ? metricIds : ["lav-aperti"],
    compareMode: input.period.compareMode,
    includeSeries: false,
  });

  const envelopesById = new Map(analytics.metrics.map((m) => [m.metricId, m]));
  const { range } = resolveDatasetDateRanges({ period: input.period });
  const fromYmd = input.period.start || ymdFromDate(range.start);
  const toYmd = input.period.end || ymdFromDate(range.end);
  const diaryRaw = await loadOperationalDiaryForPeriod(fromYmd, toYmd);
  const classifiedDiary = diaryRaw.map((e) => classifyDiaryEntry(e.workDate, e.text)).slice(0, MAX_DIARY);

  const opPeriod = resolveOperationalPeriod({ preset: input.period.preset, range });
  const facts = buildFactEngine({ period: opPeriod, bundle, cross, insights: insightsDto });

  const { events: businessEvents } = buildOperationalEventsFromSources({
    insights,
    classifiedDiary,
    facts,
    envelopesById,
  });

  let events = dedupeOperationalEvents(
    normalizeOperationalEvents({
      insights,
      classifiedDiary,
      businessEvents,
      periodEndYmd: toYmd,
    }),
  );

  const insightsByRule = new Map(insights.map((i) => [i.ruleKey, i]));
  events = attachEventDrillDown({
    events,
    insightsByRule,
    period: input.period,
    compareMode: input.period.compareMode,
  });

  const correlations = buildOperationalCorrelations({ insights, events, envelopesById });

  const summaryEvents =
    view === "timeline" ? [] : rankSummaryOperationalEvents(events, correlations, 3);

  const timelinePage =
    view === "summary"
      ? { slice: [] as typeof events, nextCursor: null, hasMore: false }
      : paginateTimelineEvents(events, input.cursor ?? null, limit);

  return {
    summaryEvents,
    timelineEvents: timelinePage.slice,
    correlations,
    pagination: {
      cursor: timelinePage.nextCursor,
      hasMore: timelinePage.hasMore,
    },
    generatedAt: new Date().toISOString(),
  };
}
