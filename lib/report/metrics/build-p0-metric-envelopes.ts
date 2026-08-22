import type { DateRange, ReportCompareMode } from "@/lib/report/date-ranges";
import type { KpiCardModel } from "@/lib/report/build-report-model";
import { buildReportMetricEnvelope } from "@/lib/report/metrics/report-metric-envelope";
import type { ReportMetricEnvelope } from "@/lib/report/metrics/report-metric-envelope";
import { fromKpiCardModel } from "@/lib/report/adapters/from-kpi-card-model";
import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";
import { resolveCanonicalMetricId } from "@/lib/report/metrics/resolve-metric-id";

/** Metriche header Report P0 — envelope per parity / P1 prep, non rendering UI. */
export const P0_HEADER_METRIC_IDS = [
  "lav-periodo",
  "lav-chiusi",
  "lav-aperti",
  "clienti",
  "cap",
  "ric-usati",
  "mag-entrate",
  "mezzi",
  "eco_fatturato",
  "eco_incassato",
  "eco_da_incassare",
  "eco_margine_pct",
  "manodopera_cost",
  "presence_hours_total",
  "mag_low_stock",
] as const;

export function buildP0MetricEnvelopes(
  kpis: readonly KpiCardModel[],
  period: DateRange,
  compareMode?: ReportCompareMode,
): ReportMetricEnvelope[] {
  const out: ReportMetricEnvelope[] = [];
  for (const card of kpis) {
    const canonicalId = resolveCanonicalMetricId(card.id);
    if (!(P0_HEADER_METRIC_IDS as readonly string[]).includes(canonicalId)) continue;
    const entry = getRegistryEntry(card.id);
    if (!entry) continue;
    const metric = fromKpiCardModel(card);
    if (!metric) continue;
    out.push(buildReportMetricEnvelope(metric, entry, period, compareMode));
  }
  return out;
}
