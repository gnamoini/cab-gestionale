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
import { buildReportOperationalContext } from "@/lib/report/operational-context/build-report-operational-context.server";
import type { InsightDto } from "@/lib/report/insights/types";
import type { ReportMetricEnvelope } from "@/lib/report/metrics/report-metric-envelope";
import type { ReportOperationalEvent } from "@/lib/report/operational-context/types";
import { listDecisionRuleMetricIds } from "@/lib/report/decision-center/rules/decision-rule-registry";
import { buildPeriodKey } from "@/lib/report/decision-center/fingerprint/decision-fingerprint";

const MAX_INSIGHTS = 12;

export type DecisionCenterRuntimeContext = {
  period: ReportRequestedPeriod;
  periodKey: string;
  envelopesById: Map<string, ReportMetricEnvelope>;
  insights: InsightDto[];
  summaryEvents: ReportOperationalEvent[];
};

/** Lightweight: rule metrics + insight DTOs + operational summary slice (C3). */
export async function buildDecisionCenterContext(
  period: ReportRequestedPeriod,
): Promise<DecisionCenterRuntimeContext> {
  const metricIds = listDecisionRuleMetricIds();
  const periodKey = buildPeriodKey(period.start, period.end, period.compareMode);

  const [baseSlices, complianceCounts, opSummary] = await Promise.all([
    loadBaseSlices(period),
    loadComplianceInsightCounts(),
    buildReportOperationalContext({ period, view: "summary" }),
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
  const { dto: insightsDto } = buildReportInsightsDto({
    bundle,
    cross,
    requestedPeriod: period,
    complianceCounts,
  });

  const insights = insightsDto.insights.slice(0, MAX_INSIGHTS);
  const insightMetricIds = [...new Set(insights.flatMap((i) => i.metricIds))];
  const allMetricIds = [...new Set([...metricIds, ...insightMetricIds])];

  const { result: analytics } = await buildReportAnalytics({
    period,
    metricIds: allMetricIds,
    compareMode: period.compareMode,
    includeSeries: false,
  });

  const envelopesById = new Map(analytics.metrics.map((m) => [m.metricId, m]));

  return {
    period,
    periodKey,
    envelopesById,
    insights,
    summaryEvents: opSummary.summaryEvents,
  };
}
