import "server-only";

import { isoInRange, type DateRange } from "@/lib/report/date-ranges";
import type { ReportAnalyticsSourceBundle } from "@/lib/report/analytics-engine/source-bundle";
import type { ReportDrillDownRow } from "@/lib/report/drilldown/types";

export function listOrdiniInPeriod(
  bundle: ReportAnalyticsSourceBundle,
  range: DateRange,
  status?: string,
): ReportDrillDownRow[] {
  const rows: ReportDrillDownRow[] = [];
  for (const o of bundle.ordini) {
    if (o.status === "annullato") continue;
    if (!isoInRange(o.dataOrdine, range)) continue;
    if (status && o.status !== status) continue;
    rows.push({
      id: o.id,
      target: { entity: "ordine_fornitore", id: o.id },
      label: o.numero?.trim() || o.id,
      sublabel: o.fornitoreLabel ?? undefined,
      amount: o.totale ?? null,
      date: o.dataOrdine,
      status: o.status,
    });
  }
  return rows.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

export function resolveOrdiniDrilldownRows(
  metricId: string,
  bundle: ReportAnalyticsSourceBundle,
  range: DateRange,
  filters?: Record<string, string | number | boolean>,
): ReportDrillDownRow[] {
  if (metricId !== "mag_orders") return [];
  const status = filters?.status != null ? String(filters.status) : undefined;
  return listOrdiniInPeriod(bundle, range, status);
}
