/** ponytail: in-memory token bucket per processo — upgrade path: Redis per multi-instance */

type Bucket = { tokens: number; lastRefill: number };

const buckets = new Map<string, Bucket>();

const DEFAULT_MAX_PER_MINUTE = 30;

export function checkPushRateLimit(
  key: string,
  maxPerMinute = DEFAULT_MAX_PER_MINUTE,
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { tokens: maxPerMinute, lastRefill: now };
    buckets.set(key, bucket);
  }
  const elapsed = now - bucket.lastRefill;
  if (elapsed >= 60_000) {
    bucket.tokens = maxPerMinute;
    bucket.lastRefill = now;
  }
  if (bucket.tokens > 0) {
    bucket.tokens -= 1;
    return { allowed: true, retryAfterMs: 0 };
  }
  const retryAfterMs = Math.max(0, 60_000 - elapsed);
  return { allowed: false, retryAfterMs };
}

export function resetPushRateLimitForTests(): void {
  buckets.clear();
}
