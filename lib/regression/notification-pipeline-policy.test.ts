import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const bridgeFiles = [
  "src/components/admin-lavorazioni-notification-bridge.tsx",
  "src/components/admin-magazzino-notification-bridge.tsx",
  "src/components/admin-dipendenti-presenze-reminder-bridge.tsx",
];

for (const file of bridgeFiles) {
  const src = read(file);
  assert.doesNotMatch(src, /publishNotification\(/, `${file} must not publish notifications`);
  assert.doesNotMatch(src, /dispatchNotificationViaApi\(/, `${file} must not dispatch via API`);
}

const tagliandoClient = read("lib/maintenance-plans/tagliando-due-notification.client.ts");
assert.doesNotMatch(tagliandoClient, /publishNotification\(/);
assert.match(tagliandoClient, /\/api\/notifications\/tagliando-due/);

const outboxMigration = read("supabase/migrations/20261103120000_notification_outbox.sql");
assert.match(outboxMigration, /notification_outbox/);
assert.match(outboxMigration, /cab_enqueue_notification_outbox/);
assert.match(outboxMigration, /lavorazioni_outbox_created/);
assert.doesNotMatch(outboxMigration, /net\.http_post.*entity-fanout/);

const outboxProcessor = read("lib/notifications/outbox/notification-outbox-processor.server.ts");
assert.match(outboxProcessor, /fanoutEntityNotification/);
assert.match(outboxProcessor, /writePipelineTrace/);

const pipelineMigration = read("supabase/migrations/20261104120000_notification_pipeline_trace_and_outbox_invoke.sql");
assert.match(pipelineMigration, /notification_outbox_invoke_worker/);

const vercel = read("vercel.json");
assert.match(vercel, /notification-outbox-processor/);

const deferredBridges = read("src/components/deferred-gestionale-bridges.tsx");
assert.match(deferredBridges, /<AdminNotifPack \/>/);
assert.doesNotMatch(deferredBridges, /isAdmin \? <AdminNotifPack/);

const swHandlers = read("lib/pwa/push-sw-handlers.ts");
assert.match(swHandlers, /pushsubscriptionchange/);
assert.match(swHandlers, /clients\.matchAll/);
assert.match(swHandlers, /openWindow/);
assert.match(swHandlers, /PWA_PUSH_RECEIVED/);

const pushBridge = read("src/components/pwa-push-permission-bridge.tsx");
assert.match(pushBridge, /PWA_PUSH_SUBSCRIPTION_CHANGE/);

const realtime = read("lib/notifications/realtime-inbox-coordinator.ts");
assert.match(realtime, /notifications/);
assert.match(realtime, /invalidateQueries/);

console.log("notification-pipeline-policy.test.ts OK");
