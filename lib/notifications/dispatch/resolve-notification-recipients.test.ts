import assert from "node:assert/strict";
import {
  resolveNotificationRecipientsFromSnapshot,
  type CompanyRbacSnapshot,
} from "@/lib/notifications/dispatch/resolve-notification-recipients";
import { getNotificationRegistryEntry } from "@/lib/notifications/notification-event-catalog";
import { roleKeyToRecipientTier } from "@/lib/notifications/registry/role-recipient-tier";

function makeSnapshot(overrides?: Partial<CompanyRbacSnapshot>): CompanyRbacSnapshot {
  return {
    users: [
      { id: "actor", role_key: "operatore", company_id: "c1" },
      { id: "peer", role_key: "operatore", company_id: "c1" },
      { id: "admin", role_key: "admin", company_id: "c1" },
      { id: "director", role_key: "manager", company_id: "c1" },
      { id: "warehouse", role_key: "magazziniere", company_id: "c1" },
      { id: "no-access", role_key: "operatore", company_id: "c1" },
    ],
    rolePageAccessByRole: new Map([
      ["operatore", { lavorazioni: "write" }],
      ["admin", { lavorazioni: "write" }],
      ["manager", { lavorazioni: "write" }],
    ]),
    userOverridesByUserId: new Map([["no-access", { lavorazioni: "none" }]]),
    ...overrides,
  };
}

const entry = getNotificationRegistryEntry("lavorazioni.created")!;

assert.equal(roleKeyToRecipientTier("magazziniere"), "officina");
assert.equal(roleKeyToRecipientTier("tecnico"), "officina");
assert.equal(roleKeyToRecipientTier("manager"), "admin");

const recipients = resolveNotificationRecipientsFromSnapshot({
  snapshot: makeSnapshot(),
  entry,
  actorId: "actor",
  notifyAuthor: false,
});

assert.ok(recipients.includes("peer"));
assert.ok(recipients.includes("admin"));
assert.ok(recipients.includes("director"));
assert.ok(recipients.includes("warehouse"));
assert.ok(!recipients.includes("actor"));
assert.ok(!recipients.includes("no-access"));

const withAuthor = resolveNotificationRecipientsFromSnapshot({
  snapshot: makeSnapshot(),
  entry,
  actorId: "actor",
  notifyAuthor: true,
});
assert.ok(withAuthor.includes("actor"));

const directorCreates = resolveNotificationRecipientsFromSnapshot({
  snapshot: makeSnapshot(),
  entry,
  actorId: "director",
  notifyAuthor: false,
});
assert.ok(directorCreates.includes("admin"));
assert.ok(!directorCreates.includes("director"));

console.log("resolve-notification-recipients.test.ts OK");
