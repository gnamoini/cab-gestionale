import { enumerateBucketDates, bucketDateRange } from "@/lib/report/kpi-series/bucket";
import { intersectDateRanges } from "@/lib/magazzino/ricambio-consumo-from-log";
import { ymdFromDate } from "@/lib/report/date-ranges";
import type { ReportAnalyticsGranularity, ReportMetricSeries } from "@/lib/report/analytics-engine/types";
import type { ReportAnalyticsSourceBundle } from "@/lib/report/analytics-engine/source-bundle";
import { getEngineManifestEntry } from "@/lib/report/analytics-engine/engine-metric-manifest";
import { runCalculator } from "@/lib/report/analytics-engine/calculators";
import { verifiedResult } from "@/lib/report/analytics-engine/calculator-context";
import { countCompletedForCalendarMonth } from "@/lib/report/lavorazioni-report-selectors";

/**
 * 1 source bundle → bucketize → calculator on filtered in-memory data.
 * Never reload DB per bucket.
 */
export function buildMetricSeriesForEngine(input: {
  metricId: string;
  calculatorId: string;
  bundle: ReportAnalyticsSourceBundle;
  granularity: ReportAnalyticsGranularity;
}): ReportMetricSeries {
  const manifest = getEngineManifestEntry(input.metricId);
  if (!manifest?.supportsSeries) {
    return {
      metricId: input.metricId,
      granularity: input.granularity,
      points: [],
    };
  }

  const dates = enumerateBucketDates(input.bundle.range, input.granularity);
  const points = dates.map((bucketStartYmd) => {
    const br = bucketDateRange(bucketStartYmd, input.granularity);
    const slice = intersectDateRanges(input.bundle.range, br);
    if (!slice) {
      return {
        periodStart: bucketStartYmd,
        periodEnd: bucketStartYmd,
        value: null,
        trust: "not_available" as const,
      };
    }
    const scalar =
      input.granularity === "month" && input.calculatorId === "computeLavChiusi"
        ? verifiedResult(
            countCompletedForCalendarMonth(
              input.bundle.integrity.completate,
              bucketStartYmd.slice(0, 7),
              input.bundle.range,
              input.bundle.integrity.manualByMonth,
            ),
            "completedInPeriod",
          )
        : runCalculator(input.calculatorId, {
            bundle: input.bundle,
            range: slice,
          });
    return {
      periodStart: ymdFromDate(slice.start),
      periodEnd: ymdFromDate(slice.end),
      value: scalar.availability === "not_available" ? null : scalar.value,
      trust: scalar.trust,
    };
  });

  return {
    metricId: input.metricId,
    granularity: input.granularity,
    points,
  };
}
