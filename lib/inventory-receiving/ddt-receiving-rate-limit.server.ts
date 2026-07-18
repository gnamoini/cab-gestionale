import "server-only";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;
const buckets = new Map<string, number[]>();

export async function isDdtReceivingAiRateLimited(userId: string): Promise<boolean> {
  const now = Date.now();
  const arr = buckets.get(userId) ?? [];
  const fresh = arr.filter((t) => now - t < WINDOW_MS);
  if (fresh.length >= MAX_PER_WINDOW) {
    buckets.set(userId, fresh);
    return true;
  }
  fresh.push(now);
  buckets.set(userId, fresh);
  return false;
}
