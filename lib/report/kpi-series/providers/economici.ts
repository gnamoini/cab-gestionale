import { intersectDateRanges } from "@/lib/magazzino/ricambio-consumo-from-log";
import { isoInRange, type DateRange } from "@/lib/report/date-ranges";
import {
  bucketDateRange,
  enumerateBucketDates,
} from "@/lib/report/kpi-series/bucket";
import type { KpiSeries, KpiSeriesPoint } from "@/lib/report/kpi-series/contracts/kpi-series-contract";
import type { KpiSeriesBuildContext } from "@/lib/report/kpi-series/providers/types";
import {
  sumManodoperaCostFromSchede,
  sumRicambiCostFromMagLog,
} from "@/lib/report/kpi-performance/kpi-performance-formulas";
import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";
import type { InvoiceRow } from "@/src/types/supabase-tables";

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

function sumInvoicesInRange(invoices: readonly InvoiceRow[], range: DateRange): number {
  let total = 0;
  for (const inv of invoices) {
    if (inv.status === "annullata" || inv.status === "bozza" || inv.status === "da_verificare") continue;
    if (!isoInRange(inv.data_emissione, range)) continue;
    total += inv.totale;
  }
  return Math.round(total);
}

export function economiciSeriesProvider(metricId: string, ctx: KpiSeriesBuildContext): KpiSeries {
  const entry = getRegistryEntry(metricId);
  const label = entry?.label ?? metricId;
  const unit = entry?.unit ?? "currency";

  if (metricId === "eco_invoices") {
    if (!ctx.invoices) {
      return {
        metricId,
        label,
        unit,
        granularity: ctx.bucket,
        points: [],
        status: "unavailable",
        unavailableReason: "Fatture non disponibili",
      };
    }
    const points = buildMonthPoints(ctx, (r) => sumInvoicesInRange(ctx.invoices!, r));
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

  if (metricId === "cost-tot") {
    const points = buildMonthPoints(ctx, (r) => {
      const ricambi = sumRicambiCostFromMagLog(ctx.magLog, ctx.prodotti, r);
      let manodopera = 0;
      if (ctx.schedeStore && ctx.magazzinoRows && ctx.costoOrario != null) {
        const schede = sumManodoperaCostFromSchede(
          ctx.completate,
          r,
          ctx.schedeStore,
          ctx.costoOrario,
          ctx.magazzinoRows,
        );
        manodopera = schede.manodopera;
      }
      const total = ricambi + manodopera;
      return total > 0 ? Math.round(total) : total === 0 ? 0 : null;
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
    unavailableReason: `Metrica economici non supportata: ${metricId}`,
  };
}
