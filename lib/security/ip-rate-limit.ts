/**
 * Rate limit per IP — in-memory (default) o Upstash Redis REST (multi-istanza).
 *
 * Env opzionali produzione:
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 */
export type IpRateLimitConfig = {
  /** Prefisso chiave (es. login, pdf-preview). */
  namespace: string;
  windowMs: number;
  maxAttempts: number;
};

type MemoryBucket = { count: number; windowStart: number };

const memoryByKey = new Map<string, MemoryBucket>();

function memoryStoreKey(config: IpRateLimitConfig, clientKey: string): string {
  return `${config.namespace}:${clientKey}`;
}

function isMemoryRateLimited(config: IpRateLimitConfig, clientKey: string): boolean {
  const now = Date.now();
  const key = memoryStoreKey(config, clientKey);
  const bucket = memoryByKey.get(key);
  if (!bucket || now - bucket.windowStart > config.windowMs) {
    memoryByKey.set(key, { count: 1, windowStart: now });
    return false;
  }
  bucket.count += 1;
  return bucket.count > config.maxAttempts;
}

function upstashConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL?.trim() && process.env.UPSTASH_REDIS_REST_TOKEN?.trim());
}

async function upstashCommand(path: string): Promise<unknown> {
  const base = process.env.UPSTASH_REDIS_REST_URL!.trim().replace(/\/$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!.trim();
  const res = await fetch(`${base}/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { result?: unknown };
  return body.result ?? null;
}

async function isUpstashRateLimited(config: IpRateLimitConfig, clientKey: string): Promise<boolean | null> {
  if (!upstashConfigured()) return null;

  const redisKey = encodeURIComponent(`${config.namespace}:${clientKey}`);
  const windowSec = Math.max(1, Math.ceil(config.windowMs / 1000));

  try {
    const count = await upstashCommand(`incr/${redisKey}`);
    if (typeof count !== "number") return null;
    if (count === 1) {
      await upstashCommand(`expire/${redisKey}/${windowSec}`);
    }
    return count > config.maxAttempts;
  } catch {
    return null;
  }
}

/** true = bloccato (rate limited). */
export async function isIpRateLimited(config: IpRateLimitConfig, clientKey: string): Promise<boolean> {
  const key = clientKey.trim() || "unknown";
  const upstash = await isUpstashRateLimited(config, key);
  if (upstash !== null) return upstash;
  return isMemoryRateLimited(config, key);
}

export function clientKeyFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return forwarded || realIp || "unknown";
}

export function clientKeyFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return headers.get("x-real-ip")?.trim() || "unknown";
}
