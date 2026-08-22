import { getEngineManifestEntry } from "@/lib/report/analytics-engine/engine-metric-manifest";
import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";
import type { ReportAnalyticsGranularity } from "@/lib/report/analytics-engine/types";

export type MultiMetricDisplayMode = "direct_overlay" | "dual_scale" | "indexed" | "blocked";

function unitFamily(unit: string | undefined): string {
  return unit ?? "unknown";
}

function supportsGranularity(metricId: string, granularity: ReportAnalyticsGranularity): boolean {
  const reg = getRegistryEntry(metricId);
  if (!reg?.series?.granularities) return false;
  return reg.series.granularities.includes(granularity);
}

/** Resolves safe chart mode — UI must not invent indexed normalization. */
export function resolveMultiMetricDisplayMode(
  metricA: string,
  metricB: string,
  granularity: ReportAnalyticsGranularity,
): MultiMetricDisplayMode {
  const manifestA = getEngineManifestEntry(metricA);
  const manifestB = getEngineManifestEntry(metricB);
  const regA = getRegistryEntry(metricA);
  const regB = getRegistryEntry(metricB);

  if (!manifestA?.supportsSeries || !manifestB?.supportsSeries) return "blocked";
  if (!regA || !regB) return "blocked";
  if (!supportsGranularity(metricA, granularity) || !supportsGranularity(metricB, granularity)) {
    return "blocked";
  }

  const modesA = new Set(regA.series?.supportedModes ?? []);
  const modesB = new Set(regB.series?.supportedModes ?? []);
  const sameUnit = unitFamily(regA.unit) === unitFamily(regB.unit);

  if (sameUnit && modesA.has("absolute") && modesB.has("absolute")) return "direct_overlay";
  if (modesA.has("dual-axis") && modesB.has("dual-axis")) return "dual_scale";
  if (modesA.has("indexed") && modesB.has("indexed")) return "indexed";
  if (!sameUnit) return "dual_scale";
  return "blocked";
}

export const CROSS_DOMAIN_PAIRS: { id: string; metricA: string; metricB: string; granularity: ReportAnalyticsGranularity }[] = [
  { id: "fatturato-lavorazioni", metricA: "eco_fatturato", metricB: "lav-chiusi", granularity: "month" },
  { id: "ore-lavorazioni", metricA: "presence_hours_total", metricB: "lav-chiusi", granularity: "month" },
  { id: "ricambi-lavorazioni", metricA: "ric-usati", metricB: "lav-chiusi", granularity: "month" },
  { id: "fatturato-ore", metricA: "eco_fatturato", metricB: "presence_hours_total", granularity: "month" },
];

export const MULTI_METRIC_PAIRS = CROSS_DOMAIN_PAIRS;
