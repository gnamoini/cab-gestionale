import "server-only";

import { NextResponse } from "next/server";
import { createReportDatasetContext } from "@/lib/report/datasets/context";
import { buildAnalyticsDatasetBundle } from "@/lib/report/analytics/analytics-dataset-bundle";
import { buildReportCrossDto } from "@/lib/report/cross-analysis/build-report-cross-dto";
import {
  enrichSlicesForDataset,
  loadBaseSlices,
  parseRequestedPeriod,
} from "@/lib/report/datasets/api/report-dataset-api";
import { assertValidReportPayload } from "@/lib/report/contracts/validate-envelope";
import {
  buildReportInsightsDto,
  insightCatalogRuleCount,
} from "@/lib/report/insights/builders/build-report-insights-dto";
import { buildInsightTelemetrySummary } from "@/lib/report/insights/observability/insight-telemetry-summary";
import { INSIGHT_CONTRACT_VERSION, type InsightPayloadData } from "@/lib/report/insights/types";
import { resolveReportV2InsightsEnabled } from "@/lib/feature-flags/report-v2-flag";
import { reportMetricObserver } from "@/lib/report/observability/report-metric-observability";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";
import type { ReportPayload } from "@/lib/report/contracts/report-payload";

export async function handleReportInsightsGet(request: Request): Promise<NextResponse> {
  if (!resolveReportV2InsightsEnabled()) {
    return new NextResponse(null, { status: 404 });
  }

  if (!(await verifyServerPageRead("report"))) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  const t0 = Date.now();
  const period = parseRequestedPeriod(new URL(request.url).searchParams);
  const baseSlices = await loadBaseSlices(period);
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
  });

  const telemetry = buildInsightTelemetrySummary({
    evaluationResults,
    insights: insights.insights,
    totalRules: insightCatalogRuleCount(),
  });

  const payload: ReportPayload<InsightPayloadData> = {
    metadata: insights.metadata,
    data: {
      contractVersion: INSIGHT_CONTRACT_VERSION,
      insights: insights.insights,
    },
  };
  assertValidReportPayload(payload);

  for (const insight of insights.insights) {
    reportMetricObserver.emit("insight_payload_generated", {
      consumer: "insight",
      metricId: insight.ruleKey,
      ruleKey: insight.ruleKey,
      ruleVersion: insight.ruleVersion,
    });
  }

  reportMetricObserver.emit("insight_telemetry_summary", {
    consumer: "insight",
    metricId: "insights",
    metricIds: insights.insights.map((i) => i.ruleKey),
    executionTimeMs: Date.now() - t0,
    cardCount: insights.insights.length,
    message: JSON.stringify({
      totalRules: telemetry.totalRules,
      evaluatedRules: telemetry.evaluatedRules,
      firedRules: telemetry.firedRules,
      skippedRules: telemetry.skippedRules,
      insightFireRate: telemetry.insightFireRate,
      insightSkipRate: telemetry.insightSkipRate,
      skipByReason: telemetry.skipByReason,
      trustDistribution: telemetry.trustDistribution,
      topInsightRules: telemetry.topInsightRules,
    }),
  });

  return NextResponse.json(payload);
}
