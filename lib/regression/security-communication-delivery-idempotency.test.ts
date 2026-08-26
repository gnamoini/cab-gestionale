import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const retryRoute = fs.readFileSync(
  path.join(ROOT, "app/api/communications/[id]/retry/route.ts"),
  "utf8",
);
const migration = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20261226121300_communication_delivery_idempotency.sql"),
  "utf8",
);

assert.match(retryRoute, /delivery_operation_id/);
assert.match(retryRoute, /deliveryOperationId/);
assert.match(retryRoute, /rendered_payload/);
assert.doesNotMatch(retryRoute, /text:\s*""/);
assert.match(migration, /communication_delivery_dedup/);

console.log("security-communication-delivery-idempotency.test: OK");
