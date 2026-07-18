import { getRuntimeHealthSnapshot, incrementHealthCounter } from "@/lib/observability/runtime-health";

export type GestionaleSyncMetricName =
  | "gestionale_dirty_marked"
  | "gestionale_dirty_flushed"
  | "gestionale_invalidation_skipped";

export type GestionaleSyncMetricTags = {
  reason?: string;
  domain?: string;
  source?: string;
};

function metricKey(name: GestionaleSyncMetricName, tags?: GestionaleSyncMetricTags): string {
  if (!tags) return name;
  const parts: string[] = [name];
  if (tags.reason) parts.push(`reason=${tags.reason}`);
  if (tags.domain) parts.push(`domain=${tags.domain}`);
  if (tags.source) parts.push(`source=${tags.source}`);
  return parts.join("|");
}

export function incrementSyncMetric(
  name: GestionaleSyncMetricName,
  delta = 1,
  tags?: GestionaleSyncMetricTags,
): void {
  incrementHealthCounter(metricKey(name, tags), delta);
}

export function getSyncMetricSnapshot(): Record<string, number> {
  return getRuntimeHealthSnapshot().counters;
}
