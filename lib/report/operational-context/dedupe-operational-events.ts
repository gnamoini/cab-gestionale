import type { ReportOperationalEvent } from "@/lib/report/operational-context/types";

/** Stable dedup key — type + sourceId + day + entityId */
export function operationalEventDedupKey(event: Pick<ReportOperationalEvent, "type" | "timestamp" | "source" | "entity">): string {
  const day = event.timestamp.slice(0, 10);
  const sourceId = event.source.sourceId ?? "";
  const entityId = event.entity?.id ?? "";
  return [event.type, sourceId, day, entityId].join(":");
}

export function dedupeOperationalEvents(events: ReportOperationalEvent[]): ReportOperationalEvent[] {
  const seen = new Map<string, ReportOperationalEvent>();
  for (const event of events) {
    const key = operationalEventDedupKey(event);
    if (!seen.has(key)) seen.set(key, event);
  }
  return [...seen.values()];
}
