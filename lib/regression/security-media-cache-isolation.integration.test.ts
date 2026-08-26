/**
 * SEC-10 integration: cache isolation on staging (opt-in).
 * Run: SECURITY_INTEGRATION=1 npx tsx lib/regression/security-media-cache-isolation.integration.test.ts
 */
import assert from "node:assert/strict";

if (process.env.SECURITY_INTEGRATION !== "1") {
  console.log("security-media-cache-isolation.integration.test: SKIP (set SECURITY_INTEGRATION=1)");
  process.exit(0);
}

const base = process.env.SECURITY_INTEGRATION_BASE_URL?.trim();
const sessionA = process.env.SECURITY_INTEGRATION_SESSION_A?.trim();
const sessionB = process.env.SECURITY_INTEGRATION_SESSION_B?.trim();
const privatePath = process.env.SECURITY_INTEGRATION_MEDIA_PATH?.trim();

assert.ok(base, "SECURITY_INTEGRATION_BASE_URL required");
assert.ok(sessionA, "SECURITY_INTEGRATION_SESSION_A required");
assert.ok(privatePath, "SECURITY_INTEGRATION_MEDIA_PATH required");

async function fetchMedia(cookie: string | undefined) {
  const url = `${base.replace(/\/$/, "")}/api/media/image?path=${encodeURIComponent(privatePath!)}`;
  const res = await fetch(url, {
    headers: cookie ? { cookie } : {},
    redirect: "manual",
  });
  const cache = res.headers.get("cache-control") ?? "";
  return { status: res.status, cache };
}

const a = await fetchMedia(sessionA);
assert.equal(a.status, 200, "session A should read private media");
assert.match(a.cache, /private/i, "Cache-Control must be private for session A");
assert.doesNotMatch(a.cache, /public,\s*max-age=31536000,\s*immutable/i);

if (sessionB) {
  const b = await fetchMedia(sessionB);
  assert.ok(b.status === 403 || b.status === 401, "session B must not read A private media");
}

console.log("security-media-cache-isolation.integration.test: OK");
