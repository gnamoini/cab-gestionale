import "server-only";

import type { HealthScoreWeeklyPoint } from "@/lib/health-score/engine/run-health-score-weekly-history.server";

type CacheEntry = { value: HealthScoreWeeklyPoint[]; loadedAt: number };

const DEFAULT_TTL_MS = Number(process.env.HEALTH_SCORE_HISTORY_CACHE_TTL_MS ?? 3_600_000);

const historyCache = new Map<string, CacheEntry>();

export function getHealthScoreHistoryCache(key: string): HealthScoreWeeklyPoint[] | null {
  const hit = historyCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.loadedAt >= DEFAULT_TTL_MS) {
    historyCache.delete(key);
    return null;
  }
  return hit.value;
}

export function setHealthScoreHistoryCache(key: string, value: HealthScoreWeeklyPoint[]): void {
  historyCache.set(key, { value, loadedAt: Date.now() });
}

export function invalidateHealthScoreHistoryCache(): void {
  historyCache.clear();
}
