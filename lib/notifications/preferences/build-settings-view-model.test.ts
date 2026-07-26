import assert from "node:assert/strict";
import {
  buildNotificationSettingsViewModel,
  filterSettingsViewModelBySearch,
} from "@/lib/notifications/preferences/build-settings-view-model";
import { resolvePageAccess } from "@/src/lib/rbac/resolve-page-access";

const resolved = resolvePageAccess({
  userId: "u1",
  roleKey: "operatore",
  rolePageAccess: { lavorazioni: "write", magazzino: "read" },
  userPageOverrides: {},
});

const vm = buildNotificationSettingsViewModel({
  resolved,
  companyId: "c1",
  preferenceRows: [
    {
      user_id: "u1",
      company_id: "c1",
      notification_event_id: "lavorazioni.completed",
      enabled: false,
    },
  ],
});

const lavPage = vm.pages.find((p) => p.key === "lavorazioni");
assert.ok(lavPage);
assert.deepEqual(
  vm.pages.map((p) => p.key),
  ["lavorazioni", "magazzino"],
  "pages must follow GESTIONALE_PAGES nav order",
);
const completed = lavPage!.events.find((e) => e.notificationEventId === "lavorazioni.completed");
assert.ok(completed);
assert.equal(completed!.preferenceSource, "personalized");
assert.equal(completed!.enabled, false);
assert.equal(completed!.canRestore, true);

const filtered = filterSettingsViewModelBySearch(vm, "magazzino");
assert.ok(filtered.pages.every((p) => p.key === "magazzino"));
assert.equal(
  buildNotificationSettingsViewModel({
    resolved,
    companyId: "c1",
    preferenceRows: [],
    searchQuery: "zzznomatch",
  }).pages.length,
  0,
);

console.log("build-settings-view-model.test.ts OK");
