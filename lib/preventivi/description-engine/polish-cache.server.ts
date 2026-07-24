import { createHash } from "node:crypto";

export const PREVENTIVO_POLISH_MODEL_VERSION = "gemini-3.5-flash@0.2";

type CacheEntry = {
  text: string;
  applied: boolean;
  expiresAt: number;
};

const CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_ENTRIES = 500;
const cache = new Map<string, CacheEntry>();

export function buildPolishCacheKey(
  description: string,
  technicalFingerprint: string,
  modelVersion = PREVENTIVO_POLISH_MODEL_VERSION,
): string {
  return createHash("sha256")
    .update(`${description}\n${technicalFingerprint}\n${modelVersion}`)
    .digest("hex");
}

export function getPolishCache(key: string): { text: string; applied: boolean } | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return { text: entry.text, applied: entry.applied };
}

export function setPolishCache(key: string, text: string, applied: boolean): void {
  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { text, applied, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function resetPolishCacheForTests(): void {
  cache.clear();
}
