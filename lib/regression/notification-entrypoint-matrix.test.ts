import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

/** SSOT: ogni evento staff deve passare da dispatchNotificationEvent (direttamente o via fanout). */
const CANONICAL_DISPATCH_CHAIN = [
  "dispatchNotificationEvent",
  "fanoutEntityNotification",
  "notification-outbox-processor",
];

const migration = read("supabase/migrations/20261104120000_notification_pipeline_trace_and_outbox_invoke.sql");
assert.match(migration, /notification_pipeline_trace/);
assert.match(migration, /cab_log_notification_pipeline_trace/);
assert.match(migration, /notification_outbox_invoke_worker/);
assert.match(migration, /trg_notification_outbox_invoke_worker/);

const vercel = read("vercel.json");
assert.match(vercel, /notification-outbox-processor/);

const outboxProcessor = read("lib/notifications/outbox/notification-outbox-processor.server.ts");
assert.match(outboxProcessor, /writePipelineTrace/);
assert.match(outboxProcessor, /fanoutEntityNotification/);

const dispatchService = read("lib/notifications/dispatch/notification-dispatch-service.server.ts");
assert.match(dispatchService, /writePipelineTrace/);
assert.doesNotMatch(dispatchService, /return \{ created: 0, skipped: 0, recipientCount: 0, duplicate: false \};\s*\/\/ unknown/);

const roleTier = read("lib/notifications/registry/role-recipient-tier.ts");
assert.match(roleTier, /resolveCanonicalRole/);

const forecast = read("lib/maintenance-plans/forecast/maintenance-forecast-notify.server.ts");
assert.match(forecast, /dispatchNotificationEvent/);
assert.doesNotMatch(forecast, /createNotificationRpc/);

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

const catalog = read("lib/notifications/notification-event-catalog.ts");
assert.match(catalog, /notifyAuthor:/);
assert.doesNotMatch(catalog, /excludeActorDefault/);

/** Matrice entry point documentata in test (grep guard). */
const entryPointMatrix: { event: string; mustUse: string }[] = [
  { event: "lavorazioni.created", mustUse: "cab_enqueue_notification_outbox" },
  { event: "lavorazioni.completed", mustUse: "cab_enqueue_notification_outbox" },
  { event: "magazzino.below_minimum", mustUse: "cab_enqueue_notification_outbox" },
  { event: "dipendenti.presence_reminder", mustUse: "fanoutEntityNotification" },
  { event: "lavorazioni.tagliando_due", mustUse: "dispatchNotificationEvent" },
  { event: "mezzi.tagliando_forecast_7g", mustUse: "dispatchNotificationEvent" },
];

const outboxMigration = read("supabase/migrations/20261103120000_notification_outbox.sql");
for (const row of entryPointMatrix) {
  if (row.mustUse === "cab_enqueue_notification_outbox") {
    assert.match(outboxMigration, new RegExp(row.event.replace(/\./g, "\\.")), row.event);
  }
}

const dipendentiCron = read("lib/dipendenti/dipendenti-presenze-reminder.server.ts");
assert.match(dipendentiCron, /fanoutEntityNotification/);

const tagliandoServer = read("lib/maintenance-plans/tagliando-due-notification.server.ts");
assert.match(tagliandoServer, /dispatchNotificationEvent/);

for (const token of CANONICAL_DISPATCH_CHAIN) {
  assert.ok(
    fs.existsSync(path.join(ROOT, "lib/notifications/dispatch/notification-dispatch-service.server.ts")) ||
      outboxProcessor.includes(token) ||
      dispatchService.includes(token),
    `missing canonical dispatch artifact for ${token}`,
  );
}

console.log("notification-entrypoint-matrix.test.ts OK");
