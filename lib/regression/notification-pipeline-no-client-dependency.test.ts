import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const outboxInvoke = read(
  "supabase/migrations/20261104120000_notification_pipeline_trace_and_outbox_invoke.sql",
);
const outboxProcessor = read("lib/notifications/outbox/notification-outbox-processor.server.ts");
const bridges = read("src/components/deferred-gestionale-bridges.tsx");
const lavBridge = read("src/components/admin-lavorazioni-notification-bridge.tsx");

assert.match(outboxInvoke, /trg_notification_outbox_invoke_worker/);
assert.match(outboxInvoke, /cab_invoke_notification_outbox_worker/);
assert.doesNotMatch(outboxInvoke, /auth\.uid\(\)/);

assert.match(outboxProcessor, /cab_claim_notification_outbox_batch/);
assert.doesNotMatch(outboxProcessor, /getBrowserSupabase/);
assert.doesNotMatch(outboxProcessor, /window\./);

assert.doesNotMatch(bridges, /runNotificationOutboxProcessor/);
assert.doesNotMatch(lavBridge, /publishNotification/);
assert.doesNotMatch(lavBridge, /dispatchNotificationViaApi/);

const forbiddenClientDeps = [
  "auth.uid()",
  "notification_outbox_invoke_worker",
  "cab_dispatch_notifications_bulk",
];

for (const dep of forbiddenClientDeps) {
  assert.doesNotMatch(lavBridge, new RegExp(dep), `bridge must not depend on ${dep}`);
}

console.log("notification-pipeline-no-client-dependency.test.ts OK");
