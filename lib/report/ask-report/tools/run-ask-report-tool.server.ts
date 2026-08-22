import "server-only";

import { buildReportAnalytics } from "@/lib/report/analytics-engine/build-report-analytics";
import { buildReportInsightsDto } from "@/lib/report/insights/builders/build-report-insights-dto";
import { buildAnalyticsDatasetBundle } from "@/lib/report/analytics/analytics-dataset-bundle";
import { buildReportCrossDto } from "@/lib/report/cross-analysis/build-report-cross-dto";
import { createReportDatasetContext } from "@/lib/report/datasets/context";
import {
  enrichSlicesForDataset,
  loadBaseSlices,
} from "@/lib/report/datasets/api/report-dataset-api";
import { loadComplianceInsightCounts } from "@/lib/operational-intelligence/compliance/load-compliance-counts.server";
import { buildReportOperationalContext } from "@/lib/report/operational-context/build-report-operational-context.server";
import { buildDecisionCenterContext } from "@/lib/report/decision-center/context/build-decision-center-context.server";
import { buildDecisionCandidates } from "@/lib/report/decision-center/engine/build-decision-candidates.server";
import { mergeCandidatesWithPersistence } from "@/lib/report/decision-center/engine/merge-decision-with-persistence";
import { listDecisionPointsForPeriod } from "@/lib/report/decision-center/storage/decision-point-storage.server";
import { validateDrilldownRequest } from "@/lib/report/drilldown/validate-drilldown-request.server";
import { runDrilldownServer } from "@/lib/report/drilldown/run-drilldown.server";
import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";
import { formatReportMetricValue } from "@/lib/report/metrics/format-report-metric-value";
import { resolveEnvelopeCompareDeltaPercent } from "@/lib/report/business-report/metrics/resolve-envelope-compare-delta";
import type { EffectiveAskContext, AskReportToolResult, AskReportCitation } from "@/lib/report/ask-report/types";
import {
  getAskReportTool,
  type AskReportToolName,
} from "@/lib/report/ask-report/tools/ask-report-tool-registry";
import {
  ASK_REPORT_MAX_DRILLDOWN_ROWS,
  ASK_REPORT_MAX_INSIGHTS,
  ASK_REPORT_MAX_DECISIONS,
  ASK_REPORT_MAX_SERIES_POINTS,
} from "@/lib/report/ask-report/budget/ask-report-context-budget";
import { ASK_REPORT_ENGINE_VERSION } from "@/lib/report/ask-report/versions";
import { loadAskRecidivitaData } from "@/lib/report/ask-report/recidivita/load-ask-recidivita.server";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";
import type { ReportRequestedPeriod, ReportCompareMode as EnvelopeCompareMode } from "@/lib/report/contracts/metadata-envelope";
import type { ReportCompareMode } from "@/lib/report/date-ranges";

function toEnvelopeCompareMode(mode: ReportCompareMode): EnvelopeCompareMode | undefined {
  if (mode === "none" || mode === "prev_period" || mode === "prev_year") return mode;
  return "prev_period";
}

function periodRange(period: ReportRequestedPeriod) {
  return { from: period.start, to: period.end };
}

function citationPeriod(period: ReportRequestedPeriod): import("@/lib/report/date-ranges").DateRange {
  return {
    start: new Date(`${period.start}T12:00:00`),
    end: new Date(`${period.end}T12:00:00`),
  };
}

function metricCitation(metricId: string, label: string, period: ReportRequestedPeriod): AskReportCitation {
  return {
    type: "metric",
    id: metricId,
    label,
    metricId,
    period: citationPeriod(period),
  };
}

async function loadInsights(period: ReportRequestedPeriod) {
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
  const { dto } = buildReportInsightsDto({ bundle, cross, requestedPeriod: period, complianceCounts });
  return dto.insights.slice(0, ASK_REPORT_MAX_INSIGHTS);
}

async function loadDecisions(period: ReportRequestedPeriod, status?: string) {
  const ctx = await buildDecisionCenterContext(period);
  const candidates = buildDecisionCandidates(ctx);
  const persisted = await listDecisionPointsForPeriod({
    periodFrom: period.start,
    periodTo: period.end,
    compareMode: period.compareMode,
  });
  let decisions = mergeCandidatesWithPersistence(candidates, persisted);
  if (status) {
    decisions = decisions.filter((d) => d.status === status);
  }
  return decisions.slice(0, ASK_REPORT_MAX_DECISIONS);
}

export async function runAskReportTool(input: {
  toolName: AskReportToolName;
  rawArgs: Record<string, unknown>;
  effective: EffectiveAskContext;
  userId: string;
  allowTier3?: boolean;
}): Promise<AskReportToolResult> {
  if (!(await verifyServerPageRead("report"))) {
    return {
      toolName: input.toolName,
      success: false,
      error: "forbidden",
      citations: [],
      provenance: { period: periodRange(input.effective.period), compareMode: input.effective.compareMode },
    };
  }

  const def = getAskReportTool(input.toolName);
  if (!def) {
    return {
      toolName: input.toolName,
      success: false,
      error: "unknown_tool",
      citations: [],
      provenance: { period: periodRange(input.effective.period) },
    };
  }

  if (def.tier === 3 && !input.allowTier3) {
    return {
      toolName: input.toolName,
      success: false,
      error: "tier3_not_authorized",
      citations: [],
      provenance: { period: periodRange(input.effective.period) },
    };
  }

  const normalized = def.normalizeArgs(input.rawArgs);
  if (!normalized.ok) {
    return {
      toolName: input.toolName,
      success: false,
      error: normalized.error,
      citations: [],
      provenance: { period: periodRange(input.effective.period) },
    };
  }

  const period = input.effective.period;
  const compareMode = (normalized.args.compareMode as ReportCompareMode | undefined) ?? input.effective.compareMode;
  const periodWithCompare: ReportRequestedPeriod = {
    ...period,
    compareMode: toEnvelopeCompareMode(compareMode) ?? "none",
  };
  const provenance = {
    period: periodRange(period),
    compareMode,
    engineVersion: ASK_REPORT_ENGINE_VERSION,
  };

  try {
    switch (input.toolName) {
      case "get_metric": {
        const metricId = normalized.args.metricId as string;
        if (!getRegistryEntry(metricId)) {
          return { toolName: input.toolName, success: false, error: "invalid_metric", citations: [], provenance };
        }
        const { result } = await buildReportAnalytics({
          period: periodWithCompare,
          metricIds: [metricId],
          compareMode: toEnvelopeCompareMode(compareMode),
          includeSeries: false,
        });
        const env = result.metrics[0];
        if (!env) {
          return { toolName: input.toolName, success: false, error: "metric_unavailable", citations: [], provenance };
        }
        const reg = getRegistryEntry(metricId);
        return {
          toolName: input.toolName,
          success: true,
          data: env,
          citations: [metricCitation(metricId, reg?.label ?? metricId, period)],
          provenance: { ...provenance, metricIds: [metricId] },
        };
      }
      case "get_series": {
        const metricId = normalized.args.metricId as string;
        const granularity = normalized.args.granularity as "day" | "week" | "month";
        const { result } = await buildReportAnalytics({
          period: periodWithCompare,
          metricIds: [metricId],
          compareMode: toEnvelopeCompareMode(compareMode),
          includeSeries: true,
          granularity,
        });
        const series = result.series.slice(0, ASK_REPORT_MAX_SERIES_POINTS);
        const reg = getRegistryEntry(metricId);
        return {
          toolName: input.toolName,
          success: true,
          data: { series, metricId },
          citations: [{ type: "series", id: metricId, label: reg?.label ?? metricId, metricId, period: citationPeriod(period) }],
          provenance: { ...provenance, metricIds: [metricId] },
        };
      }
      case "get_insights": {
        const insights = await loadInsights(periodWithCompare);
        return {
          toolName: input.toolName,
          success: true,
          data: insights,
          citations: insights.map((i) => ({ type: "insight" as const, id: i.id, label: i.message })),
          provenance,
        };
      }
      case "get_breakdown": {
        const metricId = normalized.args.metricId as string;
        const dimension = normalized.args.dimension as "cliente";
        const { result } = await buildReportAnalytics({
          period: periodWithCompare,
          metricIds: [metricId],
          compareMode: toEnvelopeCompareMode(compareMode),
          includeSeries: false,
          dimensions: [dimension],
        });
        const breakdown = result.dimensions[0];
        if (!breakdown) {
          return { toolName: input.toolName, success: false, error: "breakdown_unavailable", citations: [], provenance };
        }
        return {
          toolName: input.toolName,
          success: true,
          data: breakdown,
          citations: [{ type: "metric", id: metricId, label: breakdown.dimension, metricId, period: citationPeriod(period) }],
          provenance: { ...provenance, metricIds: [metricId] },
        };
      }
      case "get_operational_context": {
        const op = await buildReportOperationalContext({ period: periodWithCompare, view: "summary" });
        return {
          toolName: input.toolName,
          success: true,
          data: { summaryEvents: op.summaryEvents },
          citations: op.summaryEvents.map((e) => ({
            type: "operational_event" as const,
            id: e.id,
            label: e.title,
          })),
          provenance,
        };
      }
      case "get_decisions": {
        const status = normalized.args.status as string | undefined;
        const decisions = await loadDecisions(periodWithCompare, status);
        return {
          toolName: input.toolName,
          success: true,
          data: decisions,
          citations: decisions.map((d) => ({
            type: "decision" as const,
            id: d.id,
            label: d.title,
          })),
          provenance,
        };
      }
      case "get_drilldown": {
        const metricId = normalized.args.metricId as string;
        const validated = validateDrilldownRequest({
          metricId,
          period: periodWithCompare,
          compareMode: toEnvelopeCompareMode(compareMode),
          dimension: normalized.args.dimension as import("@/lib/report/metrics/report-metric-types").ReportDimensionId | undefined,
          dimensionValue: normalized.args.dimensionValue as string | undefined,
        });
        const response = await runDrilldownServer(validated);
        const rows = (response.page?.rows ?? []).slice(0, ASK_REPORT_MAX_DRILLDOWN_ROWS);
        const drillContext: import("@/lib/report/drilldown/types").ReportDrillDownContext = {
          metricId,
          period: periodWithCompare,
          compareMode: toEnvelopeCompareMode(compareMode),
          dimension: validated.dimension,
          dimensionValue: validated.dimensionValue,
          source: "kpi",
        };
        return {
          toolName: input.toolName,
          success: true,
          data: { rows, context: drillContext },
          citations: rows.slice(0, 5).map((r: { id: string; label: string }) => ({
            type: "record" as const,
            id: r.id,
            label: r.label,
            drillDownContext: drillContext,
          })),
          provenance: { ...provenance, metricIds: [metricId] },
        };
      }
      case "get_recidivita": {
        const data = await loadAskRecidivitaData({
          period: periodWithCompare,
          subject: normalized.args.subject as import("@/lib/report/ask-report/recidivita/load-ask-recidivita.server").AskRecidivitaSubject,
          rankBy: normalized.args.rankBy as import("@/lib/report/ask-report/recidivita/load-ask-recidivita.server").AskRecidivitaRankBy,
          windowDays: normalized.args.windowDays as 30 | 90 | 365,
          limit: normalized.args.limit as number | undefined,
        });
        return {
          toolName: input.toolName,
          success: true,
          data,
          citations: [
            {
              type: "metric",
              id: "recidivita",
              label: "Recidività mezzi",
              period: citationPeriod(period),
            },
          ],
          provenance,
        };
      }
      default:
        return { toolName: input.toolName, success: false, error: "unsupported", citations: [], provenance };
    }
  } catch (e) {
    return {
      toolName: input.toolName,
      success: false,
      error: e instanceof Error ? e.message : "tool_error",
      citations: [],
      provenance,
    };
  }
}

export function formatMetricValueForAnswer(env: import("@/lib/report/metrics/report-metric-envelope").ReportMetricEnvelope): string {
  const reg = getRegistryEntry(env.metricId);
  return formatReportMetricValue(env.metric.value, reg?.formatter ?? reg?.unit ?? "count");
}

export function formatMetricDeltaForAnswer(env: import("@/lib/report/metrics/report-metric-envelope").ReportMetricEnvelope): string | null {
  const delta = resolveEnvelopeCompareDeltaPercent(env);
  if (delta == null) return null;
  return `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`;
}
