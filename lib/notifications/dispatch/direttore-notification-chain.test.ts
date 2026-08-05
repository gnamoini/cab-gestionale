import assert from "node:assert/strict";
import { isStaffAdminRole } from "@/lib/notifications/staff-admin";
import { isStaffInboxEligible } from "@/lib/notifications/staff-inbox-eligible";
import { resolvePageAccess } from "@/src/lib/rbac/resolve-page-access";
import {
  resolveNotificationRecipientsFromSnapshot,
  type CompanyRbacSnapshot,
} from "@/lib/notifications/dispatch/resolve-notification-recipients";
import { getNotificationRegistryEntry } from "@/lib/notifications/notification-event-catalog";
import { roleKeyToRecipientTier } from "@/lib/notifications/registry/role-recipient-tier";

function makeSnapshot(): CompanyRbacSnapshot {
  return {
    users: [
      { id: "director", role_key: "manager", company_id: "c1" },
      { id: "admin", role_key: "admin", company_id: "c1" },
      { id: "peer", role_key: "operatore", company_id: "c1" },
    ],
    rolePageAccessByRole: new Map([
      ["manager", { lavorazioni: "read", dashboard: "read" }],
      ["admin", { lavorazioni: "write", dashboard: "write" }],
      ["operatore", { lavorazioni: "write" }],
    ]),
    userOverridesByUserId: new Map(),
  };
}

// 1. Ruolo → tier
assert.equal(roleKeyToRecipientTier("manager"), "admin");

// 2. Recipient resolver
const entry = getNotificationRegistryEntry("lavorazioni.created")!;
const recipients = resolveNotificationRecipientsFromSnapshot({
  snapshot: makeSnapshot(),
  entry,
  actorId: "peer",
  notifyAuthor: false,
});
assert.ok(recipients.includes("director"), "Direttore must be in fan-out for lavorazioni.created");
assert.ok(recipients.includes("admin"));

// 3. Staff inbox eligible (manager with dashboard read)
const directorResolved = resolvePageAccess({
  userId: "director",
  roleKey: "manager",
  rolePageAccess: { lavorazioni: "read", dashboard: "read" },
  userPageOverrides: {},
});
assert.ok(
  isStaffInboxEligible({ ruolo: "manager" }, { resolved: directorResolved }),
  "Direttore must be staff inbox eligible",
);

// 4. UI isStaffAdminRole
assert.ok(isStaffAdminRole("manager"));
assert.ok(isStaffAdminRole("admin"));
assert.ok(!isStaffAdminRole("operatore"));

console.log("direttore-notification-chain.test.ts OK");
