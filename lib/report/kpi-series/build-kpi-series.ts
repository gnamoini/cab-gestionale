import { ymdFromDate, type DateRange } from "@/lib/report/date-ranges";
import { alignKpiSeries } from "@/lib/report/kpi-series/align";
import { resolveBucket } from "@/lib/report/kpi-series/bucket";
import type { KpiSeriesBundle } from "@/lib/report/kpi-series/contracts/kpi-series-contract";
import type { KpiSeriesGranularity } from "@/lib/report/metrics/report-metric-types";
import { resolveSeriesProvider, resolveSeriesProviderId } from "@/lib/report/kpi-series/resolve-series-provider";
import type { KpiSeriesBuildContext } from "@/lib/report/kpi-series/providers/types";
import { reportKpiChartProviderFailed } from "@/lib/report/report-kpi-chart-telemetry";

export type BuildKpiSeriesInput = {
  metricIds: readonly string[];
  range: DateRange;
  bucket?: KpiSeriesGranularity;
  context: Omit<KpiSeriesBuildContext, "range" | "bucket">;
};

export function buildKpiSeries(input: BuildKpiSeriesInput): KpiSeriesBundle {
  const { bucket, downgraded } = resolveBucket(input.range, input.bucket);
  const ctx: KpiSeriesBuildContext = {
    ...input.context,
    range: input.range,
    bucket,
  };

  const series = input.metricIds.map((metricId) => {
    const provider = resolveSeriesProvider(metricId);
    if (!provider) {
      reportKpiChartProviderFailed({
        metricId,
        provider: resolveSeriesProviderId(metricId) ?? "unknown",
        reason: "provider_not_found",
      });
      return {
        metricId,
        label: metricId,
        unit: "count" as const,
        granularity: bucket,
        points: [],
        status: "unavailable" as const,
        unavailableReason: "Provider non configurato",
      };
    }
    try {
      const result = provider(metricId, ctx);
      if (result.status === "unavailable") {
        reportKpiChartProviderFailed({
          metricId,
          provider: resolveSeriesProviderId(metricId) ?? "unknown",
          reason: result.unavailableReason ?? "unavailable",
        });
      }
      return result;
    } catch (err) {
      reportKpiChartProviderFailed({
        metricId,
        provider: resolveSeriesProviderId(metricId) ?? "unknown",
        reason: err instanceof Error ? err.message : "provider_error",
      });
      return {
        metricId,
        label: metricId,
        unit: "count" as const,
        granularity: bucket,
        points: [],
        status: "unavailable" as const,
        unavailableReason: "Errore nel calcolo serie",
      };
    }
  });

  return {
    series: alignKpiSeries(series),
    bucket,
    range: { start: ymdFromDate(input.range.start), end: ymdFromDate(input.range.end) },
    bucketDowngraded: downgraded || undefined,
  };
}
