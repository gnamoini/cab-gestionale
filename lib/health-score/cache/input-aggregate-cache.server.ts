import "server-only";

type CacheEntry<T> = { value: T; loadedAt: number };

const DEFAULT_TTL_MS = Number(process.env.HEALTH_SCORE_CACHE_TTL_MS ?? 120_000);

const inputCache = new Map<string, CacheEntry<unknown>>();

export function getInputAggregateCache<T>(key: string): T | null {
  const hit = inputCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.loadedAt >= DEFAULT_TTL_MS) {
    inputCache.delete(key);
    return null;
  }
  return hit.value as T;
}

export function setInputAggregateCache<T>(key: string, value: T): void {
  inputCache.set(key, { value, loadedAt: Date.now() });
}

export function invalidateInputAggregateCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    inputCache.clear();
    return;
  }
  for (const key of inputCache.keys()) {
    if (key.startsWith(keyPrefix)) inputCache.delete(key);
  }
}
