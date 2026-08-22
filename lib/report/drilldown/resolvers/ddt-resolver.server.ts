import "server-only";

import { isoInRange, type DateRange } from "@/lib/report/date-ranges";
import type { ReportAnalyticsSourceBundle } from "@/lib/report/analytics-engine/source-bundle";
import type { ReportDrillDownRow } from "@/lib/report/drilldown/types";

export function listDdtInPeriod(
  bundle: ReportAnalyticsSourceBundle,
  range: DateRange,
  status?: string,
): ReportDrillDownRow[] {
  const rows: ReportDrillDownRow[] = [];
  for (const d of bundle.ddtDocuments) {
    if (!isoInRange(d.data_documento, range)) continue;
    if (status && d.status !== status) continue;
    rows.push({
      id: d.id,
      target: { entity: "ddt", id: d.id },
      label: d.numero != null ? String(d.numero) : d.id,
      sublabel: d.cliente_label ?? undefined,
      date: d.data_documento,
      status: d.status,
    });
  }
  return rows.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

export function resolveDdtDrilldownRows(
  metricId: string,
  bundle: ReportAnalyticsSourceBundle,
  range: DateRange,
  filters?: Record<string, string | number | boolean>,
): ReportDrillDownRow[] {
  if (metricId !== "eco_ddt") return [];
  const status = filters?.status != null ? String(filters.status) : undefined;
  return listDdtInPeriod(bundle, range, status);
}
