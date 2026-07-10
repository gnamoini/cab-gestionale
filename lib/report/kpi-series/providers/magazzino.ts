import { intersectDateRanges } from "@/lib/magazzino/ricambio-consumo-from-log";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { isoInRange, type DateRange } from "@/lib/report/date-ranges";
import {
  bucketDateRange,
  enumerateBucketDates,
} from "@/lib/report/kpi-series/bucket";
import type { KpiSeries, KpiSeriesPoint } from "@/lib/report/kpi-series/contracts/kpi-series-contract";
import type { KpiSeriesBuildContext } from "@/lib/report/kpi-series/providers/types";
import { extractScortaDelta } from "@/lib/report/magazzino-log-parse";
import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";
import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";

function sumUsciteInRange(
  magLog: MagazzinoChangeLogEntry[],
  _prodotti: RicambioMagazzino[],
  range: DateRange,
): number {
  let total = 0;
  for (const e of magLog) {
    if (e.annullato) continue;
    if (!isoInRange(e.at, range)) continue;
    const d = extractScortaDelta(e);
    if (e.tipo === "rimozione") {
      total += d != null && d < 0 ? -d : 1;
      continue;
    }
    if (e.tipo === "update" && d != null && d < 0) total += -d;
    if (e.tipo === "aggiunta") continue;
  }
  return total;
}

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

export function magazzinoSeriesProvider(metricId: string, ctx: KpiSeriesBuildContext): KpiSeries {
  const entry = getRegistryEntry(metricId);
  const label = entry?.label ?? metricId;
  const unit = entry?.unit ?? "count";

  if (metricId === "ric-usati") {
    const points = buildPoints(ctx, (r) => {
      const v = sumUsciteInRange(ctx.magLog, ctx.prodotti, r);
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
    unavailableReason: `Metrica magazzino non supportata: ${metricId}`,
  };
}
