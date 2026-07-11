import { entryToCellValue } from "@/lib/dipendenti/timesheet-totals";
import { intersectDateRanges } from "@/lib/magazzino/ricambio-consumo-from-log";
import { isoInRange, type DateRange } from "@/lib/report/date-ranges";
import {
  bucketDateRange,
  enumerateBucketDates,
} from "@/lib/report/kpi-series/bucket";
import type { KpiSeries, KpiSeriesPoint } from "@/lib/report/kpi-series/contracts/kpi-series-contract";
import type { KpiSeriesBuildContext } from "@/lib/report/kpi-series/providers/types";
import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";

function sumHoursInRange(ctx: KpiSeriesBuildContext, range: DateRange): number {
  if (!ctx.timesheetEntries) return 0;
  let total = 0;
  for (const e of ctx.timesheetEntries) {
    if (!isoInRange(e.work_date, range)) continue;
    const cell = entryToCellValue(e);
    total += cell.oreOrdinarie + cell.oreStraordinarie;
  }
  return Math.round(total * 100) / 100;
}

function buildMonthPoints(
  ctx: KpiSeriesBuildContext,
  compute: (range: DateRange) => number | null,
): KpiSeriesPoint[] {
  const dates = enumerateBucketDates(ctx.range, "month");
  return dates.map((date) => {
    const br = bucketDateRange(date, "month");
    const slice = intersectDateRanges(ctx.range, br);
    if (!slice) return { date, value: null };
    return { date, value: compute(slice) };
  });
}

export function oreSeriesProvider(metricId: string, ctx: KpiSeriesBuildContext): KpiSeries {
  const entry = getRegistryEntry(metricId);
  const label = entry?.label ?? metricId;
  const unit = entry?.unit ?? "hours";

  if (metricId === "ore_total") {
    if (!ctx.timesheetEntries) {
      return {
        metricId,
        label,
        unit,
        granularity: ctx.bucket,
        points: [],
        status: "unavailable",
        unavailableReason: "Timesheet non disponibile",
      };
    }
    const points = buildMonthPoints(ctx, (r) => {
      const v = sumHoursInRange(ctx, r);
      return v;
    });
    const hasData = points.some((p) => p.value != null && p.value > 0);
    return {
      metricId,
      label,
      unit,
      granularity: ctx.bucket,
      points,
      status: hasData ? "ready" : "empty",
    };
  }

  return {
    metricId,
    label,
    unit,
    granularity: ctx.bucket,
    points: [],
    status: "unavailable",
    unavailableReason: `Metrica ore non supportata: ${metricId}`,
  };
}
