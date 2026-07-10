import { intersectDateRanges } from "@/lib/magazzino/ricambio-consumo-from-log";
import type { DateRange } from "@/lib/report/date-ranges";
import {
  bucketDateRange,
  enumerateBucketDates,
} from "@/lib/report/kpi-series/bucket";
import type { KpiSeries, KpiSeriesPoint } from "@/lib/report/kpi-series/contracts/kpi-series-contract";
import type { KpiSeriesBuildContext } from "@/lib/report/kpi-series/providers/types";
import { avgWeeklyCompletateInRange } from "@/lib/report/avg-weekly-completate";
import {
  countCompletedInRange,
  countOpenedInRange,
} from "@/lib/report/lavorazioni-report-selectors";
import { buildCompletateDbMaps } from "@/lib/report/report-completate-maps";
import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";

function buildPoints(
  ctx: KpiSeriesBuildContext,
  compute: (range: DateRange) => number | null,
): KpiSeriesPoint[] {
  const dates = enumerateBucketDates(ctx.range, ctx.bucket);
  return dates.map((date) => {
    const br = bucketDateRange(date, ctx.bucket);
    const slice = intersectDateRanges(ctx.range, br);
    if (!slice) return { date, value: null };
    return { date, value: compute(slice) };
  });
}

function emptySeries(metricId: string, ctx: KpiSeriesBuildContext, reason: string): KpiSeries {
  const entry = getRegistryEntry(metricId);
  return {
    metricId,
    label: entry?.label ?? metricId,
    unit: entry?.unit ?? "count",
    granularity: ctx.bucket,
    points: [],
    status: "unavailable",
    unavailableReason: reason,
  };
}

export function lavorazioniSeriesProvider(metricId: string, ctx: KpiSeriesBuildContext): KpiSeries {
  const entry = getRegistryEntry(metricId);
  const label = entry?.label ?? metricId;
  const unit = entry?.unit ?? "count";

  if (metricId === "lav-periodo") {
    const points = buildPoints(ctx, (r) =>
      countOpenedInRange(ctx.attive, ctx.storico, r),
    );
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

  if (metricId === "lav-chiusi") {
    const points = buildPoints(ctx, (r) =>
      countCompletedInRange(ctx.completate, r, ctx.manualByMonth),
    );
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

  if (metricId === "lav-media-settimanale") {
    const { byWeek } = buildCompletateDbMaps(ctx.completate);
    const points = buildPoints(ctx, (r) => {
      const result = avgWeeklyCompletateInRange(r, byWeek, ctx.completate, ctx.manualByMonth);
      return result.weekCount > 0 ? result.avg : null;
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

  return emptySeries(metricId, ctx, `Metrica lavorazioni non supportata: ${metricId}`);
}
