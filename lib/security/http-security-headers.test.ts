/**
 * Policy header HTTP — verifica SSOT usato da next.config.ts.
 */
import assert from "node:assert/strict";
import {
  buildContentSecurityPolicy,
  getHttpSecurityHeaders,
} from "@/lib/security/http-security-headers";

const headers = getHttpSecurityHeaders();
const byKey = Object.fromEntries(headers.map((h) => [h.key, h.value]));

assert.equal(byKey["Strict-Transport-Security"], "max-age=63072000; includeSubDomains; preload");
assert.equal(byKey["X-Content-Type-Options"], "nosniff");
assert.equal(byKey["X-Frame-Options"], "SAMEORIGIN");
assert.equal(byKey["Referrer-Policy"], "strict-origin-when-cross-origin");
assert.equal(byKey["X-DNS-Prefetch-Control"], "on");
assert.match(byKey["Permissions-Policy"], /camera=\(self\)/);
assert.ok(byKey["Content-Security-Policy"], "CSP must be set");

const csp = buildContentSecurityPolicy();
assert.match(csp, /default-src 'self'/);
assert.match(csp, /connect-src 'self'/);
assert.match(csp, /supabase\.co/);
assert.match(csp, /object-src 'none'/);
assert.match(csp, /frame-ancestors 'self'/);
assert.doesNotMatch(csp, /script-src[^;]*\*/);
if (process.env.NODE_ENV === "production") {
  assert.doesNotMatch(csp, /unsafe-eval/);
} else {
  assert.match(csp, /script-src[^;]*'unsafe-eval'/);
}

console.log("http-security-headers.test.ts OK");
