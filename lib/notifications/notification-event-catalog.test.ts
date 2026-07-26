import assert from "node:assert/strict";
import {
  NOTIFICATION_EVENT_CATALOG,
  CONFIGURABLE_NOTIFICATION_EVENT_IDS,
  getNotificationEventDefinition,
  getNotificationRegistryEntry,
} from "@/lib/notifications/notification-event-catalog";
import { GESTIONALE_PAGES } from "@/src/lib/permissions/gestionale-pages";
import { isNotificationEventEnabled } from "@/lib/notifications/preferences/notification-preference-resolver";
import { buildNotificationSettingsViewModel } from "@/lib/notifications/preferences/build-settings-view-model";
import { resolvePageAccess } from "@/src/lib/rbac/resolve-page-access";

const pageKeys = new Set(GESTIONALE_PAGES.map((p) => p.key));

assert.ok(NOTIFICATION_EVENT_CATALOG.length >= 8);

for (const entry of NOTIFICATION_EVENT_CATALOG) {
  assert.ok(entry.notificationEventId.length > 3, `missing notificationEventId for ${entry.type}`);
  assert.ok(pageKeys.has(entry.pageKey), `invalid pageKey ${entry.pageKey} for ${entry.notificationEventId}`);
  assert.ok(["info", "warning", "critical"].includes(entry.severity));
  assert.ok(["optional", "mandatory"].includes(entry.notificationMode));
  assert.equal(typeof entry.excludeActorDefault, "boolean");
  assert.equal(typeof entry.defaultEnabled, "boolean");
}

const ids = NOTIFICATION_EVENT_CATALOG.map((e) => e.notificationEventId);
assert.equal(new Set(ids).size, ids.length, "notificationEventId must be unique");

assert.equal(getNotificationRegistryEntry("lavorazioni.created")?.domainEvent, "work_order.created");
assert.equal(getNotificationEventDefinition("client_portal_ingresso")?.recipients.cliente, true);
assert.equal(getNotificationEventDefinition("lavorazione_created")?.notificationEventId, "lavorazioni.created");
assert.equal(getNotificationEventDefinition("magazzino_sotto_scorta")?.severity, "warning");
assert.equal(getNotificationEventDefinition("tagliando_previsto_7g")?.severity, "critical");

assert.ok(!CONFIGURABLE_NOTIFICATION_EVENT_IDS.includes("system.dashboard_test"));

const entry = getNotificationRegistryEntry("lavorazioni.completed")!;
assert.equal(
  isNotificationEventEnabled({
    notificationEventId: entry.notificationEventId,
    userId: "u1",
    companyId: "c1",
    entry,
    overrides: new Map([["u1:c1:lavorazioni.completed", false]]),
  }),
  false,
);
assert.equal(
  isNotificationEventEnabled({
    notificationEventId: entry.notificationEventId,
    userId: "u1",
    companyId: "c1",
    entry: { ...entry, notificationMode: "mandatory" },
    overrides: new Map([["u1:c1:lavorazioni.completed", false]]),
  }),
  true,
);

const resolved = resolvePageAccess({
  userId: "u1",
  roleKey: "operatore",
  rolePageAccess: { lavorazioni: "write", magazzino: "read" },
  userPageOverrides: {},
});
const vm = buildNotificationSettingsViewModel({
  resolved,
  companyId: "c1",
  preferenceRows: [],
});
assert.ok(vm.pages.some((p) => p.key === "lavorazioni"));
assert.ok(vm.pages.every((p) => p.events.length > 0));

console.log("notification-event-catalog.test.ts OK");
