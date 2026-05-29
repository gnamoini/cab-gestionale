/** Rate limit in-memory per POST anteprima PDF (per istanza server). */
const WINDOW_MS = 60_000;
const MAX_POSTS_PER_WINDOW = 30;
const hits = new Map<string, number[]>();

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return forwarded || realIp || "unknown";
}

export function isPdfPreviewPostRateLimited(request: Request): boolean {
  const key = clientKey(request);
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const prev = hits.get(key) ?? [];
  const recent = prev.filter((t) => t >= windowStart);
  if (recent.length >= MAX_POSTS_PER_WINDOW) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  return false;
}
