/**
 * Verifica strutturale migration + policy notifiche v2 (senza DB live).
 * Uso: npx tsx scripts/verify-notifications-rbac.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const migration = read("supabase/migrations/20260801130000_notifications_core.sql");

for (const token of [
  "notification_type_registry",
  "notification_staff_inbox_eligible",
  "notification_visible_to_auth_user",
  "cab_create_notification",
  "cab_count_unread_notifications",
  "cab_list_notifications_inbox",
  "cab_mark_notification_read",
  "cab_mark_all_notifications_read",
  "cab_dismiss_notification",
  "ERR_GUEST_NOT_ALLOWED",
  "lavorazione_created",
  "magazzino_sotto_scorta",
  "dipendenti_presenze_reminder",
  "admin_dashboard_test",
]) {
  assert.match(migration, new RegExp(token), `migration missing: ${token}`);
}

assert.match(migration, /revoke all on public\.notifications/);
assert.match(migration, /grant select on public\.notifications to authenticated/);
assert.doesNotMatch(migration, /grant insert on public\.notifications to authenticated/);
assert.match(migration, /not in \('cliente', 'guest'\)/);

const flagSrc = read("lib/notifications/notifications-v2-flag.ts");
assert.match(flagSrc, /notificationsV2ReadsDb/);
assert.match(flagSrc, /notificationsV2WritesLegacy/);

const migrationV2 = read("supabase/migrations/20260901150000_notification_events_v2.sql");
assert.match(migrationV2, /lavorazione_completata/);
assert.match(migrationV2, /fatture_scadute_digest/);

const scopeMigration = read("supabase/migrations/20260915120700_notification_policy_scope_update.sql");
assert.match(scopeMigration, /lavorazione_created/);
assert.match(scopeMigration, /dipendenti_presenze_reminder/);

const catalogSrc = read("lib/notifications/notification-event-catalog.ts");
assert.match(catalogSrc, /NOTIFICATION_EVENT_CATALOG/);
assert.match(catalogSrc, /lavorazione_completata/);
assert.doesNotMatch(catalogSrc, /lavorazioni_ritardo_digest/);
assert.match(catalogSrc, /client_portal_ingresso/);
assert.match(catalogSrc, /client_portal_completata/);

const clientPortalMigration = read("supabase/migrations/20260915120800_client_portal_nuova_lavorazione_title.sql");
assert.match(clientPortalMigration, /Nuova lavorazione/);

const publishSrc = read("lib/notifications/publish-notification.ts");
assert.match(publishSrc, /fattureScaduteDigestDedupKey/);
assert.match(publishSrc, /tagliandoDaEseguireDedupKey/);

const staffSrc = read("lib/notifications/staff-inbox-eligible.ts");
assert.match(staffSrc, /guest/);
assert.match(staffSrc, /cliente/);

const centerSrc = read("components/gestionale/notification-center-bell.tsx");
assert.match(centerSrc, /useNotificationCenter/);
assert.match(centerSrc, /NotificationBellIcon/);

const mountSrc = read("components/gestionale/notification-center-mount.tsx");
assert.match(mountSrc, /isStaffInboxEligible/);

const shellSrc = read("components/gestionale/app-shell.tsx");
assert.match(shellSrc, /SidebarSessionPanel/);

const realtimeSrc = read("lib/notifications/realtime-inbox-coordinator.ts");
assert.match(realtimeSrc, /DEBOUNCE_MS/);
assert.match(realtimeSrc, /seenIds/);

console.log("verify-notifications-rbac: ok");
