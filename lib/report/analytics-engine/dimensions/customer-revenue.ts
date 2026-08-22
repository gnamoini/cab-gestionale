import { buildTopClientiFatturatoEnriched } from "@/lib/report/economic-analytics-extended";
import type { ReportAnalyticsSourceBundle } from "@/lib/report/analytics-engine/source-bundle";
import type { ReportDimensionBreakdown } from "@/lib/report/analytics-engine/types";
import type { DateRange } from "@/lib/report/date-ranges";

/** Optional P1 — zero new queries; uses invoices already in bundle. */
export function buildCustomerRevenueBreakdown(
  metricIds: readonly string[],
  bundle: ReportAnalyticsSourceBundle,
  range: DateRange,
): ReportDimensionBreakdown {
  if (!metricIds.includes("eco_fatturato") || !bundle.invoicesAvailable) {
    return { dimension: "cliente", metricId: "eco_fatturato", rows: [] };
  }
  const rows = buildTopClientiFatturatoEnriched(bundle.invoices, range, 10).map((r) => ({
    key: r.cliente,
    label: r.cliente,
    value: r.fatturato,
  }));
  return { dimension: "cliente", metricId: "eco_fatturato", rows };
}
