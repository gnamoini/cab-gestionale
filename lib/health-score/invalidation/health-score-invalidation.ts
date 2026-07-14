import { invalidateInputAggregateCache } from "@/lib/health-score/cache/input-aggregate-cache.server";
import { invalidateHealthScoreResultCache } from "@/lib/health-score/cache/result-cache.server";

/** ponytail: invalidazione globale in-memory; upgrade path = tag per tenant/event bus. */
export type HealthScoreInvalidationScope = "input" | "result" | "all";

const EVENT_MAP: Record<string, HealthScoreInvalidationScope[]> = {
  "lavorazioni.closed": ["input", "result"],
  "lavorazioni.updated": ["input", "result"],
  "magazzino.movement": ["input", "result"],
  "timesheet.upserted": ["input", "result"],
  "preventivo.emitted": ["input", "result"],
  "invoice.paid": ["input", "result"],
};

export function invalidateHealthScoreOnDomainEvent(
  event: keyof typeof EVENT_MAP | string,
): void {
  const scopes = EVENT_MAP[event] ?? ["result"];
  if (scopes.includes("input") || scopes.includes("all")) {
    invalidateInputAggregateCache();
  }
  if (scopes.includes("result") || scopes.includes("all")) {
    invalidateHealthScoreResultCache();
  }
}

export function invalidateAllHealthScoreCaches(): void {
  invalidateInputAggregateCache();
  invalidateHealthScoreResultCache();
}
