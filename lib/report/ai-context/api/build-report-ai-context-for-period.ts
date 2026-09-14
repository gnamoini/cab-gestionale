import "server-only";

import { buildReportAIContextDto } from "@/lib/report/ai-context/build-report-ai-context";
import type { ReportAIContextDto } from "@/lib/report/ai-context/types";
import { buildAnalyticsDatasetBundle } from "@/lib/report/analytics/analytics-dataset-bundle";
import { buildReportCrossDto } from "@/lib/report/cross-analysis/build-report-cross-dto";
import { createReportDatasetContext } from "@/lib/report/datasets/context";
import {
  enrichSlicesForDataset,
  loadBaseSlices,
} from "@/lib/report/datasets/api/report-dataset-api";
import type { ReportMetadataEnvelope, ReportRequestedPeriod } from "@/lib/report/contracts/metadata-envelope";
import {
  buildReportInsightsDto,
  insightCatalogRuleCount,
} from "@/lib/report/insights/builders/build-report-insights-dto";
import { buildInsightTelemetrySummary } from "@/lib/report/insights/observability/insight-telemetry-summary";
import { loadComplianceInsightCounts } from "@/lib/operational-intelligence/compliance/load-compliance-counts.server";
import { loadOperationalDiaryForPeriod } from "@/lib/operational-intelligence/diary/load-operational-diary.server";
import { ymdFromDate } from "@/lib/report/date-ranges";
import { resolveDatasetDateRanges } from "@/lib/report/datasets/period";

export type BuildReportAIContextForPeriodResult = {
  aiContext: ReportAIContextDto;
  insightsMetadata: ReportMetadataEnvelope;
};

/** Estrazione meccanica della pipeline dataset→insights→aiContext. */
export async function buildReportAIContextForPeriod(
  period: ReportRequestedPeriod,
): Promise<BuildReportAIContextForPeriodResult> {
  const [baseSlices, complianceCounts] = await Promise.all([
    loadBaseSlices(period),
    loadComplianceInsightCounts(),
  ]);
  const economicoSlices = await enrichSlicesForDataset("economico", baseSlices);
  const oreSlices = await enrichSlicesForDataset("ore", baseSlices);

  const lavCtx = createReportDatasetContext({
    period,
    compareMode: period.compareMode,
    integrity: baseSlices.integrity,
  });
  const magCtx = createReportDatasetContext({
    period,
    compareMode: period.compareMode,
    integrity: baseSlices.integrity,
  });
  const ecoCtx = createReportDatasetContext({
    period,
    compareMode: period.compareMode,
    integrity: economicoSlices.integrity,
  });
  const oreCtx = createReportDatasetContext({
    period,
    compareMode: period.compareMode,
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

  const cross = buildReportCrossDto({ bundle, requestedPeriod: period });
  const { dto: insights, evaluationResults } = buildReportInsightsDto({
    bundle,
    cross,
    requestedPeriod: period,
    complianceCounts,
  });

  const telemetry = buildInsightTelemetrySummary({
    evaluationResults,
    insights: insights.insights,
    totalRules: insightCatalogRuleCount(),
  });

  const { range } = resolveDatasetDateRanges({ period });
  const fromYmd = period.start || ymdFromDate(range.start);
  const toYmd = period.end || ymdFromDate(range.end);
  const diaryEntries = await loadOperationalDiaryForPeriod(fromYmd, toYmd);

  const aiContext = buildReportAIContextDto({
    evaluationResults,
    telemetry,
    requestedPeriod: period,
    cross,
    bundle,
    operationalDiary: diaryEntries.map((e) => ({ workDate: e.workDate, body: e.text })),
  });

  return { aiContext, insightsMetadata: insights.metadata };
}
