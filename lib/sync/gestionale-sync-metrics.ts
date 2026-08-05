import { getRuntimeHealthSnapshot, incrementHealthCounter } from "@/lib/observability/runtime-health";

export type GestionaleSyncMetricName =
  | "gestionale_dirty_marked"
  | "gestionale_dirty_flushed"
  | "gestionale_invalidation_skipped"
  | "gestionale_sync_pipeline_stage";

export type GestionaleSyncMetricTags = {
  reason?: string;
  domain?: string;
  source?: string;
  stage?: string;
};

function metricKey(name: GestionaleSyncMetricName, tags?: GestionaleSyncMetricTags): string {
  if (!tags) return name;
  const parts: string[] = [name];
  if (tags.reason) parts.push(`reason=${tags.reason}`);
  if (tags.domain) parts.push(`domain=${tags.domain}`);
  if (tags.source) parts.push(`source=${tags.source}`);
  if (tags.stage) parts.push(`stage=${tags.stage}`);
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
