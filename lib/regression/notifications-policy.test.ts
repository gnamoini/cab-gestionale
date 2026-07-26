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
const realtimePackSrc = fs.readFileSync(
  path.join(ROOT, "src/components/gestionale-realtime-bridge-pack.tsx"),
  "utf8",
);
const adminNotifPackSrc = fs.readFileSync(
  path.join(ROOT, "src/components/admin-notification-bridge-pack.tsx"),
  "utf8",
);
const pwaBridgePackSrc = fs.readFileSync(
  path.join(ROOT, "src/components/pwa-bridge-pack.tsx"),
  "utf8",
);
const bellSrc = fs.readFileSync(
  path.join(ROOT, "components/dashboard/admin-notifications-bell.tsx"),
  "utf8",
);
const magBridgeSrc = fs.readFileSync(
  path.join(ROOT, "src/components/admin-magazzino-notification-bridge.tsx"),
  "utf8",
);
const realtimeSrc = fs.readFileSync(
  path.join(ROOT, "src/components/gestionale-realtime-bridge.tsx"),
  "utf8",
);
const desktopDispatchSrc = fs.readFileSync(
  path.join(ROOT, "lib/notifications/admin-dashboard-desktop.ts"),
  "utf8",
);
const desktopNotifSrc = fs.readFileSync(
  path.join(ROOT, "lib/lavorazioni/desktop-notifications.ts"),
  "utf8",
);
const lavBridgeSrc = fs.readFileSync(
  path.join(ROOT, "src/components/admin-lavorazioni-notification-bridge.tsx"),
  "utf8",
);
const centerBellSrc = fs.readFileSync(
  path.join(ROOT, "components/gestionale/notification-center-bell.tsx"),
  "utf8",
);
const bridgesPromptSrc = fs.readFileSync(
  path.join(ROOT, "src/components/notification-opt-in-banner.tsx"),
  "utf8",
);

assert.ok(ADMIN_NOTIFICATION_STORE_MAX_ITEMS >= 50 && ADMIN_NOTIFICATION_STORE_MAX_ITEMS <= 500);

assert.match(bridgesSrc, /PwaBridgePack/);
assert.match(bridgesSrc, /RealtimePack/);
assert.match(bridgesSrc, /AdminNotifPack/);

assert.match(realtimePackSrc, /GestionaleNotificationsBridge/);

for (const bridge of [
  "AdminLavorazioniNotificationBridge",
  "AdminMagazzinoNotificationBridge",
  "AdminDipendentiPresenzeReminderBridge",
]) {
  assert.match(adminNotifPackSrc, new RegExp(bridge), `missing bridge: ${bridge}`);
}

const catalogSrc = fs.readFileSync(
  path.join(ROOT, "lib/notifications/notification-event-catalog.ts"),
  "utf8",
);
assert.match(catalogSrc, /NOTIFICATION_EVENT_CATALOG/);
assert.match(catalogSrc, /lavorazione_completata/);

assert.match(dispatchSrc, /dashboard_promemoria/);
assert.match(
  dispatchSrc,
  /if \(event\.entity === "dashboard_promemoria"\) return null/,
  "dashboard_promemoria must not emit cab-sync toasts (local UI toasts only)",
);

assert.match(bellSrc, /<Drawer[\s\S]*?gestionaleLogPanelAsideClass/);
assert.match(bellSrc, /toAdminNotificationLogViewModel/);
assert.match(bellSrc, /LogEntry/);
assert.doesNotMatch(bellSrc, /useGlobalDropdownPortal/);
assert.doesNotMatch(bellSrc, /createPortal/);
assert.doesNotMatch(bellSrc, /placement: "bottom-end"/);
assert.doesNotMatch(bellSrc, /useDropdownOutsideDismiss/);
assert.doesNotMatch(bellSrc, /absolute right-0/);
assert.doesNotMatch(bellSrc, /100vw/);

assert.match(dispatchSrc, /isCabSyncToastSuppressed/);
assert.match(magBridgeSrc, /markCabSyncToastSuppressed/);
assert.match(realtimeSrc, /Impostazioni aggiornate da un altro utente/);

assert.match(magBridgeSrc, /publishNotification/);
assert.match(lavBridgeSrc, /publishNotification/);
assert.match(lavBridgeSrc, /isStaffInboxEligible/);
assert.doesNotMatch(lavBridgeSrc, /fanoutClientPortalLavorazioneNotification/);

const mountSrc = fs.readFileSync(
  path.join(ROOT, "components/gestionale/notification-center-mount.tsx"),
  "utf8",
);
assert.match(mountSrc, /isClientInboxEligible/);
assert.match(mountSrc, /isStaffInboxEligible/);

const triggersMigrationSrc = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20260906130000_client_portal_notifications_db_triggers.sql"),
  "utf8",
);
assert.match(triggersMigrationSrc, /cab_fanout_client_portal_lavorazione_notification_core/);
assert.match(triggersMigrationSrc, /trg_lavorazioni_client_portal_ingresso/);
assert.match(triggersMigrationSrc, /trg_lavorazioni_client_portal_completata/);
assert.match(triggersMigrationSrc, /after insert on public\.lavorazioni/);
assert.match(triggersMigrationSrc, /after update of stato on public\.lavorazioni/);
assert.match(triggersMigrationSrc, /on conflict \(dedup_key\) do nothing/);

const migrationSrc = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20260906120000_client_portal_notifications.sql"),
  "utf8",
);
assert.match(migrationSrc, /client_portal_ingresso/);
assert.match(migrationSrc, /notification_cliente_inbox_eligible/);
assert.match(migrationSrc, /jsonb_array_elements_text/);

const visibilityFixMigrationSrc = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20260910160000_notification_visibility_user_scope_fix.sql"),
  "utf8",
);
assert.match(
  visibilityFixMigrationSrc,
  /p_n\.scope_type = 'user' and p_n\.scope_value = auth\.uid\(\)::text/,
  "staff must only see own user-scoped notifications",
);
assert.doesNotMatch(
  visibilityFixMigrationSrc,
  /notification_staff_inbox_eligible\(\)\s+and\s+\(\s*public\.rbac_role\(\) in \('admin', 'manager'\)/,
  "staff must not blanket-see all notifications as admin/manager",
);
assert.match(
  visibilityFixMigrationSrc,
  /p_n\.scope_type = 'role'[\s\S]*public\.rbac_role\(\) in \('admin', 'manager'\)/,
  "admin/manager override must stay role-scoped only",
);

assert.match(centerBellSrc, /<Drawer[\s\S]*?gestionaleLogPanelAsideClass/);
assert.match(centerBellSrc, /toInboxNotificationLogViewModel/);
assert.match(centerBellSrc, /Carica altre/);
assert.match(centerBellSrc, /useNotificationCenter/);
assert.match(centerBellSrc, /dispatchAdminDashboardTestSystemNotification/);
assert.match(centerBellSrc, /dispatchInboxSystemNotification/);
assert.match(centerBellSrc, /shouldPreferPwaPushOverDesktopPrompt/);
assert.match(centerBellSrc, /usePwaPushOptIn/);
assert.match(centerBellSrc, /NotificationSettingsModal/);
assert.match(centerBellSrc, /Impostazioni notifiche/);

const policySrc = fs.readFileSync(
  path.join(ROOT, "lib/notifications/application/policies/notification-policies.ts"),
  "utf8",
);
assert.match(
  policySrc,
  /admin_dashboard_test[\s\S]{0,500}ONLINE:\s*\[[^\]]*"push"/,
  "admin_dashboard_test must include push while ONLINE",
);
assert.match(
  policySrc,
  /DEFAULT_PRESENCE[\s\S]{0,200}ONLINE:\s*\[[^\]]*"push"/,
  "DEFAULT_PRESENCE must include push while ONLINE",
);

const showLocalSrc = fs.readFileSync(path.join(ROOT, "lib/pwa/show-local-system-notification.ts"), "utf8");
assert.match(showLocalSrc, /registration\.showNotification/);

assert.doesNotMatch(
  desktopDispatchSrc,
  /requestDesktopNotificationPermissionOnce/,
  "dispatch must not auto-request browser permission",
);
assert.match(desktopDispatchSrc, /dispatchAdminDashboardDesktopNotification/);
const onceMarker = "export async function requestDesktopNotificationPermissionOnce";
const interactiveMarker = "export async function requestDesktopNotificationPermissionInteractive";
const onceFnStart = desktopNotifSrc.indexOf(onceMarker);
const interactiveFnStart = desktopNotifSrc.indexOf(interactiveMarker);
assert.ok(onceFnStart >= 0 && interactiveFnStart > onceFnStart);
const onceFnBody = desktopNotifSrc.slice(onceFnStart, interactiveFnStart);
assert.doesNotMatch(onceFnBody, /Notification\.requestPermission/, "once helper must not call requestPermission");
assert.match(
  desktopNotifSrc.slice(interactiveFnStart),
  /Notification\.requestPermission/,
);
assert.match(pwaBridgePackSrc, /NotificationOptInBanner/);
const optInHookSrc = fs.readFileSync(
  path.join(ROOT, "src/hooks/use-notification-opt-in.ts"),
  "utf8",
);
assert.match(optInHookSrc, /requestDesktopNotificationPermissionInteractive/);
assert.match(optInHookSrc, /enablePush/);
assert.match(bridgesPromptSrc, /useNotificationOptIn/);
const optInCopySrc = fs.readFileSync(
  path.join(ROOT, "lib/notifications/notification-opt-in-copy.ts"),
  "utf8",
);
assert.match(optInCopySrc, /Sì, attiva/);
assert.match(optInCopySrc, /No, grazie/);
assert.match(bridgesPromptSrc, /notificationOptInAcceptLabel/);
assert.match(bridgesPromptSrc, /notificationOptInDeclineLabel/);
assert.match(bridgesPromptSrc, /notificationOptInContextLabel/);
assert.match(bellSrc, /NotificationsPanelFooter/);
assert.match(bellSrc, /Abilita notifiche/);
assert.match(bellSrc, />\s*Test\s*</);
assert.match(bellSrc, /buildAdminDashboardTestNotification/);

console.log("notifications-policy.test.ts OK");
