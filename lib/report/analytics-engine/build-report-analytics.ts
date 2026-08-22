import { ymdFromDate } from "@/lib/report/date-ranges";
import { buildReportMetricEnvelope } from "@/lib/report/metrics/report-metric-envelope";
import type { ReportMetric } from "@/lib/report/metrics/report-metric-types";
import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";
import { getEngineManifestEntry } from "@/lib/report/analytics-engine/engine-metric-manifest";
import { runCalculator } from "@/lib/report/analytics-engine/calculators";
import { buildAnalyticsMetricComparison } from "@/lib/report/analytics-engine/comparison/build-metric-comparison";
import { mergeScalarTrust, aggregateTrustSummary } from "@/lib/report/analytics-engine/trust/aggregate-trust-summary";
import { buildMetricSeriesForEngine } from "@/lib/report/analytics-engine/series/build-metric-series";
import { loadAnalyticsSourceBundle } from "@/lib/report/analytics-engine/load-source-bundle";
import {
  resolveAnalyticsDataRequirements,
  resolveExecutiveDataRequirements,
} from "@/lib/report/analytics-engine/resolve-analytics-data-requirements";
import { validateAnalyticsMetricIds } from "@/lib/report/analytics-engine/validate-metric-ids";
import type {
  ReportAnalyticsQuery,
  ReportAnalyticsResult,
  ReportDimensionBreakdown,
} from "@/lib/report/analytics-engine/types";
import { resolveAnalyticsPeriod } from "@/lib/report/analytics-engine/parse-analytics-query";
import { buildCustomerRevenueBreakdown } from "@/lib/report/analytics-engine/dimensions/customer-revenue";

export async function buildReportAnalytics(query: ReportAnalyticsQuery): Promise<{
  result: ReportAnalyticsResult;
  bundle: Awaited<ReturnType<typeof loadAnalyticsSourceBundle>>;
}> {
  const metricIds = validateAnalyticsMetricIds(query.metricIds);
  const requirements = resolveAnalyticsDataRequirements(metricIds);
  const { range, compareRange, compareMode, period } = resolveAnalyticsPeriod(query);
  const bundle = await loadAnalyticsSourceBundle(period, requirements);

  const envelopes = [];
  const series = [];
  const dimensionRows: ReportDimensionBreakdown[] = [];

  for (const metricId of metricIds) {
    const manifest = getEngineManifestEntry(metricId);
    const registry = getRegistryEntry(metricId);
    if (!manifest || !registry) continue;

    const curCtx = { bundle, range };
    const scalar = runCalculator(manifest.calculatorId, curCtx);
    const baselineScalar =
      compareRange && compareMode !== "none"
        ? runCalculator(manifest.calculatorId, { bundle, range: compareRange })
        : null;

    const comparison = buildAnalyticsMetricComparison({
      metricId,
      registry,
      current: scalar,
      currentValue: scalar.value,
      baselineValue: baselineScalar?.value ?? null,
      range,
      compareRange,
      compareMode,
    });

    const metric: ReportMetric = {
      id: metricId,
      value: scalar.availability === "not_available" ? 0 : scalar.value,
      compare: comparison.compareState,
      source: { module: "analytics-engine", trace: manifest.calculatorId },
    };

    const envelope = buildReportMetricEnvelope(metric, registry, range, compareMode);
    envelopes.push({
      ...envelope,
      trust: mergeScalarTrust(envelope.trust, scalar),
      formulaId: scalar.formulaId,
    });

    if (query.includeSeries && manifest.supportsSeries && query.granularity) {
      series.push(
        buildMetricSeriesForEngine({
          metricId,
          calculatorId: manifest.calculatorId,
          bundle,
          granularity: query.granularity,
        }),
      );
    }
  }

  if (query.dimensions?.includes("cliente") && bundle.invoicesAvailable) {
    dimensionRows.push(
      buildCustomerRevenueBreakdown(metricIds, bundle, range),
    );
  }

  const trustSummary = aggregateTrustSummary(envelopes.map((e) => e.trust));

  const result: ReportAnalyticsResult = {
    period: { from: ymdFromDate(range.start), to: ymdFromDate(range.end) },
    compare: {
      mode: compareMode,
      from: compareRange ? ymdFromDate(compareRange.start) : null,
      to: compareRange ? ymdFromDate(compareRange.end) : null,
    },
    metrics: envelopes,
    series,
    dimensions: dimensionRows,
    trustSummary,
  };

  return { result, bundle };
}

export async function buildExecutiveAnalytics(
  query: Pick<ReportAnalyticsQuery, "period" | "compareMode">,
): Promise<ReportAnalyticsResult> {
  const requirements = resolveExecutiveDataRequirements();
  const { result } = await buildReportAnalytics({
    period: query.period,
    metricIds: requirements.metricIds,
    compareMode: query.compareMode,
    includeSeries: false,
  });
  return result;
}
