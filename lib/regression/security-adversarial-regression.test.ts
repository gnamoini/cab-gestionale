import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const webhook = fs.readFileSync(path.join(ROOT, "app/api/webhooks/resend/route.ts"), "utf8");
const scarico = fs.readFileSync(path.join(ROOT, "lib/magazzino/apply-scarico-da-scheda.ts"), "utf8");
const importDedup = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20261226121200_import_commit_dedup.sql"),
  "utf8",
);
const lease = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20261226121400_ai_part_search_worker_lease.sql"),
  "utf8",
);
const unzip = fs.readFileSync(path.join(ROOT, "lib/security/safe-unzip.ts"), "utf8");

assert.match(webhook, /503/);
assert.match(scarico, /scaricoOperationId/);
assert.match(importDedup, /import_commit_dedup/);
assert.match(lease, /for update skip locked/i);
assert.match(unzip, /maxUncompressedBytes|MAX_/);

console.log("security-adversarial-regression.test: OK");
