import assert from "node:assert/strict";
import { test } from "node:test";
import { inboxNotificationHref } from "@/lib/notifications/inbox-notification-message";
import type { InboxNotificationRow } from "@/lib/notifications/notification-types";

function row(partial: Partial<InboxNotificationRow> & Pick<InboxNotificationRow, "type">): InboxNotificationRow {
  return {
    id: "n-1",
    created_at: "2026-07-05T15:00:00.000Z",
    scope_type: "global",
    scope_value: null,
    scope_module: null,
    priority: "medium",
    priority_rank: 2,
    title: "Titolo",
    body: "Corpo",
    href: null,
    entity_type: null,
    entity_id: null,
    dedup_key: "dedup-key-12345678",
    created_by: null,
    read_at: null,
    dismissed_at: null,
    is_unread: true,
    ...partial,
  };
}

test("inboxNotificationHref prefers type route over stale stored href", () => {
  assert.equal(
    inboxNotificationHref(row({ type: "dipendenti_presenze_reminder", href: "/dashboard" })),
    "/dipendenti",
  );
});

test("inboxNotificationHref uses stored href when type has no route", () => {
  assert.equal(
    inboxNotificationHref(row({ type: "admin_dashboard_test", href: "/custom-test" })),
    "/custom-test",
  );
});

test("inboxNotificationHref resolves dipendenti presenze without stored href", () => {
  assert.equal(inboxNotificationHref(row({ type: "dipendenti_presenze_reminder" })), "/dipendenti");
});

test("inboxNotificationHref resolves lavorazione entity focus", () => {
  assert.equal(
    inboxNotificationHref(row({ type: "lavorazione_created", entity_id: "lav-42" })),
    "/lavorazioni?focusLav=lav-42",
  );
});

test("inboxNotificationHref normalizes stored href without leading slash", () => {
  assert.equal(inboxNotificationHref(row({ type: "dipendenti_presenze_reminder", href: "dipendenti" })), "/dipendenti");
});
