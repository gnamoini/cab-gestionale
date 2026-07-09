import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";
import type { ReportMetricRegistryEntry } from "@/lib/report/metrics/report-metric-types";

export function getMetricDefinition(id: string): ReportMetricRegistryEntry {
  const entry = getRegistryEntry(id);
  if (!entry) {
    throw new Error(`Report metric not in registry: ${id}`);
  }
  if (process.env.NODE_ENV !== "production" && entry.status === "deprecated") {
    console.warn(`[report-metric] deprecated metric id: ${id}`);
  }
  return entry;
}

export function tryGetMetricDefinition(id: string): ReportMetricRegistryEntry | null {
  return getRegistryEntry(id) ?? null;
}
