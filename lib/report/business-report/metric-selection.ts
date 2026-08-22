import type { BusinessReportType } from "@/lib/report/business-report/types";
import { getEngineManifestEntry } from "@/lib/report/analytics-engine/engine-metric-manifest";
import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";
import { resolveCanonicalMetricId } from "@/lib/report/metrics/resolve-metric-id";

export const WEEKLY_CANONICAL_METRIC_IDS = [
  "eco_fatturato",
  "eco_incassato",
  "eco_da_incassare",
  "eco_importo_scaduto",
  "eco_margine_operativo_stimato",
  "eco_preventivi",
  "win_rate_preventivi",
  "lav-periodo",
  "lav-chiusi",
  "lav-aperti",
  "lav_late_sla",
  "lav-tempo",
  "ric-usati",
  "scorta",
  "cap",
  "clienti",
  "presence_hours_total",
  "actual_labor_hours_total",
  "ore_straordinari",
  "saturazione_team",
  "flotta-officina",
] as const;

export const MONTHLY_EXTENDED_METRIC_IDS = [
  ...WEEKLY_CANONICAL_METRIC_IDS,
  "eco_preventivi_approvati",
  "eco_preventivi_valore",
  "lav-ricavi",
  "lav-costi",
  "mag_movement_value",
  "mag_orders",
  "cross_efficiency",
  "cross_parts_job",
  "cross_cost_job",
  "cross_value_hour",
] as const;

export type ResolvedReportMetrics = {
  requested: readonly string[];
  supported: string[];
  skipped: string[];
};

function isSupportedEngineMetric(rawId: string): boolean {
  const id = resolveCanonicalMetricId(rawId.trim());
  if (!id) return false;
  const registry = getRegistryEntry(id);
  if (!registry || registry.status === "draft" || registry.status === "blocked") return false;
  return Boolean(getEngineManifestEntry(id));
}

/** ponytail: filter unsupported metrics — generation continues with supported subset */
export function resolveSupportedReportMetrics(
  reportType: BusinessReportType,
  extraIds: readonly string[] = [],
): ResolvedReportMetrics {
  const configured =
    reportType === "monthly"
      ? [...MONTHLY_EXTENDED_METRIC_IDS, ...extraIds]
      : [...WEEKLY_CANONICAL_METRIC_IDS, ...extraIds];

  const supported: string[] = [];
  const skipped: string[] = [];
  const seen = new Set<string>();

  for (const raw of configured) {
    const id = resolveCanonicalMetricId(raw.trim());
    if (!id || seen.has(id)) continue;
    seen.add(id);
    if (isSupportedEngineMetric(id)) supported.push(id);
    else skipped.push(raw);
  }

  return { requested: configured, supported, skipped };
}
