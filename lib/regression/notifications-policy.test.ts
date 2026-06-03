import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ADMIN_NOTIFICATION_STORE_MAX_ITEMS } from "@/lib/lavorazioni/admin-notification-store";

const ROOT = process.cwd();
const dispatchSrc = fs.readFileSync(
  path.join(ROOT, "lib/sync/gestionale-notification-dispatch.ts"),
  "utf8",
);
const bridgesSrc = fs.readFileSync(
  path.join(ROOT, "src/components/deferred-gestionale-bridges.tsx"),
  "utf8",
);

assert.ok(ADMIN_NOTIFICATION_STORE_MAX_ITEMS >= 50 && ADMIN_NOTIFICATION_STORE_MAX_ITEMS <= 500);

for (const bridge of [
  "GestionaleNotificationsBridge",
  "AdminLavorazioniNotificationBridge",
  "AdminMagazzinoNotificationBridge",
  "AdminDipendentiPresenzeReminderBridge",
  "AdminDashboardPromemoriaReminderBridge",
]) {
  assert.match(bridgesSrc, new RegExp(bridge), `missing bridge: ${bridge}`);
}

assert.match(dispatchSrc, /bunder_documents/);
assert.match(dispatchSrc, /dashboard_promemoria/);
assert.match(
  dispatchSrc,
  /if \(event\.entity === "dashboard_promemoria"\) return null/,
  "dashboard_promemoria must not emit cab-sync toasts (local UI toasts only)",
);

console.log("notifications-policy.test.ts OK");
