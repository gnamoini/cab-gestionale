import type { ResolvedAiKey } from "@/lib/ai/runtime/types";

type CacheEntry = {
  keys: ResolvedAiKey[];
  loadedAt: number;
};

const DEFAULT_TTL_MS = 45_000;
const cache = new Map<string, CacheEntry>();

export function getCachedKeys(provider: string): ResolvedAiKey[] | null {
  const hit = cache.get(provider);
  if (!hit) return null;
  if (Date.now() - hit.loadedAt > DEFAULT_TTL_MS) {
    cache.delete(provider);
    return null;
  }
  return hit.keys;
}

export function setCachedKeys(provider: string, keys: ResolvedAiKey[]): void {
  cache.set(provider, { keys, loadedAt: Date.now() });
}

export function invalidateKeyCache(provider?: string): void {
  if (provider) cache.delete(provider);
  else cache.clear();
}

/** Test hook */
export function resetKeyCacheForTests(): void {
  cache.clear();
}
