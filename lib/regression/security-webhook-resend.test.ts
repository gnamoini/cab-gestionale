/**
 * Resend webhook signature verification uses svix Webhook.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const src = fs.readFileSync(
  path.join(ROOT, "lib/communications/webhooks/verify-resend-signature.server.ts"),
  "utf8",
);

assert.match(src, /import\s+\{\s*Webhook\s*\}\s+from\s+"svix"/);
assert.match(src, /new Webhook\(secret\)/);
assert.match(src, /wh\.verify\(/);

const route = fs.readFileSync(path.join(ROOT, "app/api/webhooks/resend/route.ts"), "utf8");
assert.match(route, /503/);
assert.match(route, /if \(!secret\)/);

console.log("security-webhook-resend.test: OK");
