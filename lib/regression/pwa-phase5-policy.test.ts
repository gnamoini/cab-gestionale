import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { GESTIONALE_TOAST } from "@/src/lib/ux/gestionale-toast-messages";
import {
  PWA_OFFLINE_WRITE_BLOCKED,
  PWA_OFFLINE_WRITE_MESSAGE,
} from "@/lib/pwa/pwa-connectivity";
import {
  appendPushNotificationIdToHref,
  PWA_PUSH_OPEN_MESSAGE_TYPE,
  resolvePushHrefFromNotification,
  resolvePushNotificationUrl,
} from "@/lib/pwa/push-routing";
import { buildPushNotificationPayload } from "@/lib/pwa/push-payload";
import { supportsPwaAppBadge } from "@/lib/pwa/pwa-notification-badge";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

// --- connectivity write guard ---
assert.equal(
  PWA_OFFLINE_WRITE_MESSAGE,
  GESTIONALE_TOAST.offlineWriteBlocked,
  "offline write message SSOT",
);

const connectivity = read("lib/pwa/pwa-connectivity.ts");
assert.match(connectivity, /onlineManager/);
assert.doesNotMatch(connectivity, /addEventListener\("online"/);
assert.doesNotMatch(connectivity, /createContext/);

const useServiceMutation = read("src/hooks/use-service-mutation.ts");
assert.match(useServiceMutation, /assertOnlineForWrite/);

const connectivityGate = read("src/components/pwa-connectivity-gate.tsx");
assert.doesNotMatch(connectivityGate, /createContext/);

const appProviders = read("components/app-providers-core.tsx");
assert.match(appProviders, /PwaConnectivityGate/);
assert.doesNotMatch(appProviders, /PwaPushOpenBridge/);
assert.doesNotMatch(appProviders, /PwaNotificationBadgeBridge/);

const offlineBanner = read("src/components/pwa-offline-block-banner.tsx");
assert.match(offlineBanner, /z-\[86\]/);
assert.match(offlineBanner, /PWA_OFFLINE_WRITE_MESSAGE/);

const queryProvider = read("src/providers/query-provider.tsx");
assert.match(queryProvider, /networkMode:\s*"online"/);

// no offline queue
for (const rel of ["lib/pwa/pwa-connectivity.ts", "src/hooks/use-service-mutation.ts"]) {
  const source = read(rel);
  assert.doesNotMatch(source, /indexedDB|mutation queue|offline queue/i);
}

// --- push mobile lifecycle ---
const pushPayload = read("lib/pwa/push-payload.ts");
assert.match(pushPayload, /notificationId/);

const pushHandlers = read("lib/pwa/push-sw-handlers.ts");
assert.match(pushHandlers, /postMessage/);
assert.match(pushHandlers, /notificationId/);

const pushOpenBridge = read("src/components/pwa-push-open-bridge.tsx");
assert.match(pushOpenBridge, /PWA_PUSH_OPEN_MESSAGE_TYPE/);
assert.match(pushOpenBridge, /markNotificationReadById|markRead/);

const pushRouting = read("lib/pwa/push-routing.ts");
assert.match(pushRouting, /\/lavorazioni-clienti/);

const built = buildPushNotificationPayload({
  notificationId: "00000000-0000-4000-8000-000000000001",
  title: "T",
  body: "B",
  dedup_key: "dedup-key-12345678",
  type: "lavorazione_created",
  entity_id: "00000000-0000-4000-8000-000000000099",
});
assert.equal(built.notificationId, "00000000-0000-4000-8000-000000000001");
assert.match(built.href, /\/lavorazioni/);

assert.match(
  resolvePushHrefFromNotification({
    type: "client_portal_ingresso",
    entity_id: "abc-123",
    href: null,
  }),
  /\/lavorazioni-clienti\/abc-123/,
);

const edgeFn = read("supabase/functions/push-notification-send/index.ts");
assert.match(edgeFn, /notificationId/);

const deviceState = read("lib/pwa/push-device-state.ts");
assert.match(deviceState, /cab-pwa-push-state-v1/);
assert.ok(!fs.existsSync(path.join(ROOT, "lib/pwa/push-preferences.ts")));

// --- notification PWA layer ---
const badgeBridge = read("src/components/pwa-notification-badge.tsx");
assert.match(badgeBridge, /notificationsUnread/);
assert.match(badgeBridge, /syncPwaAppBadge/);
assert.doesNotMatch(pushHandlers, /setAppBadge/);

const badgeLib = read("lib/pwa/pwa-notification-badge.ts");
assert.match(badgeLib, /setAppBadge/);

const notifHook = read("src/hooks/gestionale/use-notification-center.ts");
assert.match(notifHook, /markReadById/);

const notifState = read("lib/pwa/pwa-notification-state.ts");
assert.match(notifState, /requestOpenNotificationCenter/);

const notifBell = read("components/gestionale/notification-center-bell.tsx");
assert.match(notifBell, /subscribeNotificationCenterOpen/);

// --- sync finalization ---
const syncFinal = read("lib/pwa/pwa-sync-finalization.ts");
assert.match(syncFinal, /runPwaReconnectSyncWithoutCooldown/);
assert.match(syncFinal, /runPwaNotificationSync/);
assert.doesNotMatch(syncFinal, /invalidatePwaEverything/);

const reconnect = read("lib/pwa/pwa-reconnect-sync.ts");
assert.match(reconnect, /source:\s*"reconnect"/);
assert.match(reconnect, /claimPwaSyncCooldown/);

const syncBridge = read("src/components/pwa-sync-finalization-bridge.tsx");
assert.match(syncBridge, /visibilitychange/);
assert.match(syncBridge, /pageshow/);
assert.doesNotMatch(syncBridge, /addEventListener\("online"/);

const deferred = read("src/components/deferred-gestionale-bridges.tsx");
assert.match(deferred, /PwaPushOpenBridge/);
assert.match(deferred, /PwaNotificationBadgeBridge/);
assert.match(deferred, /PwaSyncFinalizationBridge/);

// --- mobile ---
const mobile = read("lib/pwa/pwa-mobile.ts");
assert.match(mobile, /isMobilePwaContext/);
assert.ok(typeof supportsPwaAppBadge() === "boolean");

assert.equal(PWA_PUSH_OPEN_MESSAGE_TYPE, "PWA_PUSH_OPEN");
assert.match(
  appendPushNotificationIdToHref("/dashboard", "nid-1"),
  /pwaNotificationId=nid-1/,
);

assert.equal(resolvePushNotificationUrl("https://evil.example/phish"), "/dashboard");

// --- regression immutati ---
const installFiles = [
  "lib/pwa/pwa-install.ts",
  "lib/pwa/sw-runtime.ts",
  "lib/pwa/sw-cache.ts",
  "app/manifest.ts",
];
for (const file of installFiles) {
  assert.ok(fs.existsSync(path.join(ROOT, file)), `${file} exists`);
}

console.log("pwa-phase5-policy: ok");
