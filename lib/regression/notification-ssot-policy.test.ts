import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const blockers: string[] = [];

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const serviceSrc = read("lib/notifications/application/notification-service.ts");
if (/from\s+["']@\/lib\/notifications\/delivery\//.test(serviceSrc)) {
  blockers.push("NotificationService must not import delivery layer");
}

const migrationGlob = fs.readdirSync(path.join(ROOT, "supabase/migrations"));
for (const file of migrationGlob) {
  if (!file.endsWith(".sql")) continue;
  const src = read(path.join("supabase/migrations", file));
  if (/trg_notifications_enqueue_push_delivery/.test(src) && file.includes("20261019120000")) {
    if (!/drop trigger if exists trg_notifications_enqueue_push_delivery/.test(src)) {
      blockers.push(`${file}: must drop legacy push enqueue trigger`);
    }
  }
  if (file > "20261019120000" && /cab_enqueue_push_delivery/.test(src)) {
    blockers.push(`${file}: must not reintroduce cab_enqueue_push_delivery`);
  }
}

const publishSrc = read("lib/notifications/publish-notification.ts");
if (!/legacyNotificationToCommand/.test(publishSrc)) {
  blockers.push("publish-notification must use legacy adapter");
}

if (!fs.existsSync(path.join(ROOT, "docs/investigation/PUSH_NOTIFICATION_ARCHITECTURE_RCA.md"))) {
  blockers.push("missing RCA doc");
}

if (!fs.existsSync(path.join(ROOT, "docs/adr/ADR-002-notification-ssot-architecture.md"))) {
  blockers.push("missing ADR-002");
}

const workerSrc = read("lib/notifications/delivery/worker/delivery-worker.server.ts");
assert.match(workerSrc, /aggregateRawBatch/);
assert.match(workerSrc, /buildDeliveryPlans/);

if (blockers.length) {
  console.error("governance.notification.ssot — FAIL");
  for (const b of blockers) console.error(`  - ${b}`);
  process.exit(1);
}

console.log("governance.notification.ssot — PASS");
