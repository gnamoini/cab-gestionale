import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";
import type { ReportMetricLifecycleStatus } from "@/lib/report/metrics/report-metric-types";

export const MAX_RESOLUTION_DEPTH = 3;

const TERMINAL_STATUSES = new Set<ReportMetricLifecycleStatus>(["active", "archived"]);

export type MetricIdLookupEntry = {
  status: ReportMetricLifecycleStatus;
  replacementId?: string;
};

export type MetricIdLookup = (id: string) => MetricIdLookupEntry | undefined;

export function resolveCanonicalMetricIdFromLookup(
  id: string,
  lookup: MetricIdLookup,
): string {
  const visited = new Set<string>();
  let current = id;

  for (let depth = 0; depth <= MAX_RESOLUTION_DEPTH; depth++) {
    if (visited.has(current)) {
      throw new Error(`Metric id resolution cycle detected at "${current}"`);
    }
    visited.add(current);

    const entry = lookup(current);
    if (!entry) return current;

    if (TERMINAL_STATUSES.has(entry.status)) return current;

    if (entry.status === "deprecated") {
      if (!entry.replacementId?.trim()) {
        throw new Error(`Deprecated metric "${current}" missing replacementId`);
      }
      current = entry.replacementId;
      continue;
    }

    return current;
  }

  throw new Error(
    `Metric id resolution exceeded MAX_RESOLUTION_DEPTH (${MAX_RESOLUTION_DEPTH}) from "${id}"`,
  );
}

export function resolveCanonicalMetricId(id: string): string {
  return resolveCanonicalMetricIdFromLookup(id, (metricId) => {
    const entry = getRegistryEntry(metricId);
    if (!entry) return undefined;
    return { status: entry.status, replacementId: entry.replacementId };
  });
}
