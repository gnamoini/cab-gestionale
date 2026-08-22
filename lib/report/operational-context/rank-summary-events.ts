import type { ReportOperationalCorrelation } from "@/lib/report/operational-context/types";
import type { ReportOperationalEvent } from "@/lib/report/operational-context/types";

const SEVERITY_WEIGHT: Record<string, number> = {
  negative: 40,
  attention: 30,
  positive: 10,
  neutral: 0,
};

function correlationStrength(eventId: string, correlations: ReportOperationalCorrelation[]): number {
  return correlations.filter((c) => c.eventIds?.includes(eventId)).length * 15;
}

function metricRelevance(event: ReportOperationalEvent): number {
  return (event.metricIds?.length ?? 0) * 8 + (event.insightRuleKeys?.length ?? 0) * 5;
}

function recencyScore(timestamp: string): number {
  const t = Date.parse(timestamp);
  if (!Number.isFinite(t)) return 0;
  const ageDays = (Date.now() - t) / (86400000);
  return Math.max(0, 14 - ageDays);
}

function summaryDedupKey(event: ReportOperationalEvent): string {
  const rule = event.insightRuleKeys?.[0];
  if (rule) return `rule:${rule}`;
  return `title:${event.title.trim().toLowerCase()}`;
}

/** Server-side ranking for context panel — not recency-only. */
export function rankSummaryOperationalEvents(
  events: ReportOperationalEvent[],
  correlations: ReportOperationalCorrelation[],
  limit = 3,
): ReportOperationalEvent[] {
  const unique = new Map<string, ReportOperationalEvent>();
  for (const event of events) {
    const key = summaryDedupKey(event);
    if (!unique.has(key)) unique.set(key, event);
  }

  const scored = [...unique.values()].map((event) => ({
    event,
    score:
      (SEVERITY_WEIGHT[event.severity ?? "neutral"] ?? 0) +
      metricRelevance(event) +
      correlationStrength(event.id, correlations) +
      recencyScore(event.timestamp),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.event);
}

export function paginateTimelineEvents(
  events: ReportOperationalEvent[],
  cursor: string | null,
  limit: number,
): { slice: ReportOperationalEvent[]; nextCursor: string | null; hasMore: boolean } {
  const sorted = [...events].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  let start = 0;
  if (cursor) {
    const idx = sorted.findIndex((e) => e.id === cursor);
    start = idx >= 0 ? idx + 1 : 0;
  }
  const slice = sorted.slice(start, start + limit);
  const hasMore = start + limit < sorted.length;
  const nextCursor = hasMore && slice.length ? slice[slice.length - 1]!.id : null;
  return { slice, nextCursor, hasMore };
}
