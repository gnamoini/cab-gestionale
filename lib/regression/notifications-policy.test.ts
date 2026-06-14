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
const bridgesPromptSrc = fs.readFileSync(
  path.join(ROOT, "src/components/desktop-notification-permission-prompt.tsx"),
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

assert.doesNotMatch(
  desktopDispatchSrc,
  /requestDesktopNotificationPermissionOnce/,
  "dispatch must not auto-request browser permission",
);
assert.match(desktopDispatchSrc, /getDesktopNotificationPermissionState/);
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
assert.match(bridgesSrc, /DesktopNotificationPermissionPrompt/);
assert.match(bridgesPromptSrc, /requestDesktopNotificationPermissionInteractive/);
assert.match(bellSrc, /NotificationsPanelFooter/);
assert.match(bellSrc, />\s*Abilita\s*</);
assert.match(bellSrc, />\s*Test\s*</);
assert.match(bellSrc, /buildAdminDashboardTestNotification/);

console.log("notifications-policy.test.ts OK");
