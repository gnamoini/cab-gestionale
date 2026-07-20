import "server-only";

import { buildReportAIContextForPeriod } from "@/lib/report/ai-context/build-report-ai-context-for-period";
import { loadOperationalDiaryForPeriod } from "@/lib/operational-intelligence/diary/load-operational-diary.server";
import { classifyDiaryEntry } from "@/lib/operational-intelligence/diary/classify-diary-entry";
import { buildFactEngine } from "@/lib/operational-intelligence/facts/build-fact-engine";
import { buildOperationalEvents } from "@/lib/operational-intelligence/events/build-operational-events";
import { generateOperationalBrief } from "@/lib/operational-intelligence/brief/generate-operational-brief";
import { resolveOperationalPeriod } from "@/lib/operational-intelligence/period/resolve-operational-period";
import { buildOperationalBriefScore } from "@/lib/operational-intelligence/score/build-operational-brief-score";
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
import { resolveDatasetDateRanges } from "@/lib/report/datasets/period";
import { ymdFromDate } from "@/lib/report/date-ranges";
import type { OperationalBriefOutput } from "@/lib/operational-intelligence/types";
import { saveOperationalBrief } from "@/lib/operational-intelligence/storage/operational-brief-storage.server";

export type BuildOperationalBriefPipelineResult = {
  brief: OperationalBriefOutput;
  insightsMetadata: ReportMetadataEnvelope;
};

/** Pipeline completa Fact → Insight → Brief Context → AI */
export async function buildOperationalBriefPipeline(
  period: ReportRequestedPeriod,
  signal?: AbortSignal,
): Promise<BuildOperationalBriefPipelineResult> {
  const { aiContext, insightsMetadata } = await buildReportAIContextForPeriod(period);

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
  const { dto: insights } = buildReportInsightsDto({
    bundle,
    cross,
    requestedPeriod: period,
    complianceCounts,
  });

  const { range } = resolveDatasetDateRanges({ period });
  const fromYmd = period.start || ymdFromDate(range.start);
  const toYmd = period.end || ymdFromDate(range.end);
  const diaryRaw = await loadOperationalDiaryForPeriod(fromYmd, toYmd);
  const diary =
    diaryRaw.length > 0
      ? diaryRaw
      : (aiContext.operationalDiary ?? []).map((e) => classifyDiaryEntry(e.workDate, e.body));

  const opPeriod = resolveOperationalPeriod({ preset: period.preset, range });
  const facts = buildFactEngine({ period: opPeriod, bundle, cross, insights });
  const briefScore = buildOperationalBriefScore(facts, insights);
  const events = buildOperationalEvents(insights.insights, diary, facts);

  const genResult = await generateOperationalBrief(
    { period: opPeriod, briefScore, facts, events, insights, aiContext, diary },
    signal,
  );

  if (!genResult.ok) {
    throw new Error(`${genResult.code}: ${genResult.message}`);
  }

  await saveOperationalBrief(genResult.data);

  return { brief: genResult.data, insightsMetadata };
}
