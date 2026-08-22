import type { AnalyticsSourceSliceFlags } from "@/lib/report/analytics-engine/engine-metric-manifest";
import { getEngineManifestEntry } from "@/lib/report/analytics-engine/engine-metric-manifest";
import { resolveCanonicalMetricId } from "@/lib/report/metrics/resolve-metric-id";

export type AnalyticsDataRequirements = AnalyticsSourceSliceFlags & {
  metricIds: readonly string[];
};

const EMPTY_FLAGS: AnalyticsSourceSliceFlags = {
  preventivi: false,
  invoices: false,
  invoicePayments: false,
  ddt: false,
  timesheet: false,
  schede: false,
  ordini: false,
};

/**
 * requested metrics → required source slices → minimal loader.
 * Reads ENGINE_METRIC_MANIFEST — not documentation-only.
 */
export function resolveAnalyticsDataRequirements(
  metricIds: readonly string[],
): AnalyticsDataRequirements {
  const flags: AnalyticsSourceSliceFlags = { ...EMPTY_FLAGS };
  const canonical: string[] = [];

  for (const raw of metricIds) {
    const id = resolveCanonicalMetricId(raw);
    canonical.push(id);
    const entry = getEngineManifestEntry(id);
    if (!entry) continue;
    for (const [key, value] of Object.entries(entry.requiredSlices) as [
      keyof AnalyticsSourceSliceFlags,
      boolean | undefined,
    ][]) {
      if (value) flags[key] = true;
    }
    if (entry.requiredSlices.invoices) {
      flags.invoicePayments = true;
    }
  }

  return { ...flags, metricIds: canonical };
}

const EXECUTIVE_IDS = [
  "lav-chiusi",
  "lav-aperti",
  "lav_late_sla",
  "eco_fatturato",
  "eco_da_incassare",
  "scorta",
] as const;

export function resolveExecutiveDataRequirements(): AnalyticsDataRequirements {
  return resolveAnalyticsDataRequirements(EXECUTIVE_IDS);
}
