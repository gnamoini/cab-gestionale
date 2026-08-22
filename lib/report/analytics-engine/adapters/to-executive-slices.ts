import type { ExecutiveDatasetSlice } from "@/lib/report/executive/types";
import type { ReportMetricEnvelope } from "@/lib/report/metrics/report-metric-envelope";
import { getEngineManifestEntry } from "@/lib/report/analytics-engine/engine-metric-manifest";

function metricHealthFromTrust(
  trust: ReportMetricEnvelope["trust"],
): ExecutiveDatasetSlice["metricHealth"] {
  if (trust === "partial" || trust === "not_available") {
    return { status: trust === "not_available" ? "unavailable" : "partial" };
  }
  return { status: "full" };
}

export function envelopesToExecutiveSlices(
  envelopes: readonly ReportMetricEnvelope[],
): ExecutiveDatasetSlice[] {
  return envelopes.map((env) => {
    const manifest = getEngineManifestEntry(env.metricId);
    return {
      metricId: env.metricId,
      value: env.metric.value,
      metricHealth: metricHealthFromTrust(env.trust),
      sourceDataset: manifest?.executiveDataset ?? "lavorazioni",
    };
  });
}
