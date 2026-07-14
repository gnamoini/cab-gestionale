import "server-only";

import type { HealthScoreResult } from "@/lib/health-score/types";

type CacheEntry = { value: HealthScoreResult; loadedAt: number };

const DEFAULT_TTL_MS = Number(process.env.HEALTH_SCORE_CACHE_TTL_MS ?? 120_000);

const resultCache = new Map<string, CacheEntry>();

export function getHealthScoreResultCache(key: string): HealthScoreResult | null {
  const hit = resultCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.loadedAt >= DEFAULT_TTL_MS) {
    resultCache.delete(key);
    return null;
  }
  return { ...hit.value, cacheHit: true };
}

export function setHealthScoreResultCache(key: string, value: HealthScoreResult): void {
  resultCache.set(key, { value, loadedAt: Date.now() });
}

export function invalidateHealthScoreResultCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    resultCache.clear();
    return;
  }
  for (const key of resultCache.keys()) {
    if (key.startsWith(keyPrefix)) resultCache.delete(key);
  }
}
