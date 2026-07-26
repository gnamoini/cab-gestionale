import assert from "node:assert/strict";
import {
  resolveNotificationRecipientsFromSnapshot,
  type CompanyRbacSnapshot,
} from "@/lib/notifications/dispatch/resolve-notification-recipients";
import { getNotificationRegistryEntry } from "@/lib/notifications/notification-event-catalog";

function makeSnapshot(overrides?: Partial<CompanyRbacSnapshot>): CompanyRbacSnapshot {
  return {
    users: [
      { id: "actor", role_key: "operatore", company_id: "c1" },
      { id: "peer", role_key: "operatore", company_id: "c1" },
      { id: "admin", role_key: "admin", company_id: "c1" },
      { id: "no-access", role_key: "operatore", company_id: "c1" },
    ],
    rolePageAccessByRole: new Map([
      ["operatore", { lavorazioni: "write" }],
      ["admin", { lavorazioni: "write" }],
    ]),
    userOverridesByUserId: new Map([["no-access", { lavorazioni: "none" }]]),
    ...overrides,
  };
}

const entry = getNotificationRegistryEntry("lavorazioni.created")!;

const recipients = resolveNotificationRecipientsFromSnapshot({
  snapshot: makeSnapshot(),
  entry,
  actorId: "actor",
  excludeActor: true,
});

assert.ok(recipients.includes("peer"));
assert.ok(recipients.includes("admin"));
assert.ok(!recipients.includes("actor"));
assert.ok(!recipients.includes("no-access"));

const withActor = resolveNotificationRecipientsFromSnapshot({
  snapshot: makeSnapshot(),
  entry,
  actorId: "actor",
  excludeActor: false,
});
assert.ok(withActor.includes("actor"));

console.log("resolve-notification-recipients.test.ts OK");
