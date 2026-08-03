import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PWA_PUSH_ENABLED } from "@/lib/pwa/pwa-config";
import { PWA_QUERY_CLIENT_DEFAULTS } from "@/lib/pwa/pwa-query-policy";
import { GESTIONALE_CORE_QUERY_POLICY } from "@/lib/react-query/query-layer-policies";
import {
  resolvePushPermissionState,
  shouldShowPushOptInBanner,
} from "@/lib/pwa/push-permission-state";
import { buildPushNotificationPayload } from "@/lib/pwa/push-payload";
import { resolvePushNotificationUrl } from "@/lib/pwa/push-routing";
import { buildPwaShortcuts, PWA_SHORTCUT_PAGE_KEYS } from "@/lib/pwa/pwa-shortcuts";
import { isDesktopInstalledPwa } from "@/lib/pwa/pwa-desktop";
import { PWA_DISPLAY_MODE_STANDALONE_QUERY } from "@/lib/pwa/pwa-display-mode";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

// --- query / reconnect ---
const reconnectBridge = read("src/components/pwa-reconnect-bridge.tsx");
assert.match(reconnectBridge, /runPwaReconnectSync/);
assert.doesNotMatch(reconnectBridge, /reconnect-cache-manager/);
assert.doesNotMatch(reconnectBridge, /invalidatePwaEverything/);

const reconnectSync = read("lib/pwa/pwa-reconnect-sync.ts");
assert.match(reconnectSync, /consumeOperationalVersionPoll/);
assert.match(reconnectSync, /markDirtyForOperationalTables/);
assert.match(reconnectSync, /refetchActiveOperationalSnapshot/);
assert.doesNotMatch(reconnectSync, /dispatchGestionaleAction/);

const queryPolicy = read("lib/pwa/pwa-query-policy.ts");
assert.match(queryPolicy, /data-cache-tiers/);
assert.match(queryPolicy, /query-layer-policies/);
assert.equal(PWA_QUERY_CLIENT_DEFAULTS.staleTime, GESTIONALE_CORE_QUERY_POLICY.staleTime);
assert.equal(PWA_QUERY_CLIENT_DEFAULTS.refetchOnWindowFocus, false);

const queryProvider = read("src/providers/query-provider.tsx");
assert.match(queryProvider, /PWA_QUERY_CLIENT_DEFAULTS/);
assert.match(queryProvider, /refetchOnWindowFocus:\s*PWA_QUERY_CLIENT_DEFAULTS\.refetchOnWindowFocus/);
assert.doesNotMatch(queryProvider, /focusManager/);

const appProviders = read("components/app-providers-core.tsx");
const deferredPwa = read("src/components/deferred-pwa-bridges.tsx");
const pwaCorePack = read("src/components/pwa-core-bridge-pack.tsx");
assert.match(deferredPwa, /PwaCoreBridgePack|pwa-core-bridge-pack/);
assert.match(pwaCorePack, /PwaReconnectBridge/);
assert.match(pwaCorePack, /PwaInstallBridge/);
assert.match(pwaCorePack, /PwaInstallBanner/);
assert.doesNotMatch(appProviders, /PwaPush/);
assert.doesNotMatch(appProviders, /PwaReconnectBridge/);
assert.doesNotMatch(appProviders, /PwaInstallBridge/);
assert.doesNotMatch(appProviders, /PwaInstallBanner/);
assert.match(deferredPwa, /DeferredPwaBridges/);

const deferredBridges = read("src/components/deferred-gestionale-bridges.tsx");
const pwaBridgePack = read("src/components/pwa-bridge-pack.tsx");
assert.match(deferredBridges, /PwaBridgePack|pwa-bridge-pack/);
assert.match(pwaBridgePack, /NotificationOptInBanner/);
assert.doesNotMatch(deferredBridges, /DesktopNotificationPermissionPrompt/);

// --- push config / modules ---
assert.equal(PWA_PUSH_ENABLED, false);

const pushModules = [
  "lib/pwa/push-types.ts",
  "lib/pwa/push-permission-state.ts",
  "lib/pwa/push-payload.ts",
  "lib/pwa/push-routing.ts",
  "lib/pwa/push-client.ts",
  "lib/pwa/push-subscriptions.ts",
  "lib/pwa/push-send.ts",
  "lib/pwa/push-optin-state.ts",
  "lib/pwa/push-sw-handlers.ts",
];
for (const mod of pushModules) {
  assert.ok(fs.existsSync(path.join(ROOT, mod)), `${mod} exists`);
}

assert.equal(
  resolvePushPermissionState({
    pushEnabled: false,
    hasPushManager: true,
    hasServiceWorker: true,
    notificationPermission: "default",
    hasActiveSubscription: false,
    subscriptionRevoked: false,
  }),
  "unsupported",
);

assert.equal(
  resolvePushPermissionState({
    pushEnabled: true,
    hasPushManager: true,
    hasServiceWorker: true,
    notificationPermission: "denied",
    hasActiveSubscription: false,
    subscriptionRevoked: false,
  }),
  "denied",
);

assert.ok(shouldShowPushOptInBanner("default"));
assert.ok(!shouldShowPushOptInBanner("denied"));

const pushClientSource = read("lib/pwa/push-client.ts");
assert.match(pushClientSource, /NEXT_PUBLIC_VAPID_PUBLIC_KEY/);
assert.match(pushClientSource, /unsupported/);

const migration = read("supabase/migrations/20260915120900_push_subscriptions_delivery.sql");
assert.match(migration, /company_id/);
assert.match(migration, /unique \(company_id, endpoint\)/);
assert.match(migration, /push_delivery_queue/);
assert.match(migration, /next_attempt_at/);
assert.match(migration, /max_attempts int not null default 5/);
assert.match(migration, /dead_letter/);
assert.match(migration, /cab_claim_push_delivery_batch/);
assert.match(migration, /trg_notifications_enqueue_push_delivery/);

const edgeFn = read("supabase/functions/push-notification-send/index.ts");
assert.match(edgeFn, /cab_claim_push_delivery_batch/);
assert.match(edgeFn, /cab_complete_push_delivery/);
assert.match(edgeFn, /next_attempt_at|max_attempts/);
assert.match(edgeFn, /status === 404 \|\| status === 410/);

const pushWorker = read("lib/pwa/push-delivery-worker.server.ts");
assert.match(pushWorker, /runPushDeliveryProcess/);

const pushProcess = read("lib/pwa/push-delivery-process.server.ts");
assert.match(pushProcess, /cab_claim_push_delivery_batch/);
assert.match(pushProcess, /cab_complete_push_delivery/);
assert.match(pushProcess, /webpush\.sendNotification/);
assert.match(pushProcess, /status === 404 \|\| status === 410/);
assert.match(pushProcess, /push_disabled|vapid_not_configured/);

const pushCron = read("app/api/cron/push-delivery/route.ts");
assert.match(pushCron, /runDeliveryWorker/);
assert.match(pushCron, /CRON_SECRET/);

const outboxCron = read("app/api/cron/notification-outbox-processor/route.ts");
assert.match(outboxCron, /runNotificationOutboxProcessor/);

const pushPgCron = read("supabase/migrations/20260915121000_push_delivery_pg_cron.sql");
assert.match(pushPgCron, /cab_invoke_push_delivery_worker/);
assert.match(pushPgCron, /push_delivery_queue_invoke_worker/);
assert.match(pushPgCron, /net\.http_post/);

const runbook = read("docs/pwa-production-runbook.md");
assert.match(runbook, /PWA_PUSH_ENABLED/);
assert.match(runbook, /VAPID/);

const pwaConfig = read("lib/pwa/pwa-config.ts");
assert.match(pwaConfig, /resolvePwaPushClientEnabled/);
assert.ok(fs.existsSync(path.join(ROOT, "lib/pwa/push-enabled.ts")));

// --- SW push handlers ---
const swWorker = read("lib/pwa/sw-worker-entry.ts");
assert.match(swWorker, /registerPushSwHandlers/);

const pushHandlers = read("lib/pwa/push-sw-handlers.ts");
assert.match(pushHandlers, /addEventListener\("push"/);
assert.match(pushHandlers, /addEventListener\("notificationclick"/);

const buildSw = read("scripts/build-pwa-sw.ts");
assert.match(buildSw, /__PWA_CACHE_VERSION__/);

// sw-runtime / sw-cache unchanged policy references
const swRuntime = read("lib/pwa/sw-runtime.ts");
assert.match(swRuntime, /classifyRequest/);
const swCache = read("lib/pwa/sw-cache.ts");
assert.match(swCache, /PWA_PRECACHE_URLS/);

// --- manifest shortcuts ---
const manifestBuilder = read("lib/pwa/build-pwa-manifest.ts");
assert.match(manifestBuilder, /shortcuts:\s*buildPwaShortcuts\(GESTIONALE_PAGES\)/);

const shortcutsSource = read("lib/pwa/pwa-shortcuts.ts");
assert.match(shortcutsSource, /PwaShortcutPageSource/);
assert.doesNotMatch(shortcutsSource, /url:\s*"\/dashboard"/);
assert.doesNotMatch(shortcutsSource, /url:\s*"\/lavorazioni"/);

const shortcuts = buildPwaShortcuts(
  PWA_SHORTCUT_PAGE_KEYS.map((key) => ({
    key,
    href: `/${key}`,
    label: key,
  })),
);
assert.equal(shortcuts.length, PWA_SHORTCUT_PAGE_KEYS.length);

const manifestTs = read("app/manifest.ts");
assert.match(manifestTs, /buildPwaManifest/);

// --- payload / routing pure ---
const payload = buildPushNotificationPayload({
  title: " Test ",
  body: " Body ",
  href: "/lavorazioni/123",
  dedup_key: "dedup-key-12345678",
});
assert.equal(payload.title, "Test");
assert.equal(payload.href, "/lavorazioni/123");
assert.equal(resolvePushNotificationUrl("/magazzino"), "/magazzino");
assert.equal(resolvePushNotificationUrl("https://evil.example/phish"), "/dashboard");

// --- desktop helper ---
assert.equal(
  isDesktopInstalledPwa({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120",
    matchMedia: (q) => ({ matches: q === PWA_DISPLAY_MODE_STANDALONE_QUERY }),
  }),
  true,
);

// --- install Fase 3 untouched (no push imports) ---
const installFiles = [
  "lib/pwa/pwa-install.ts",
  "lib/pwa/pwa-install-state.ts",
  "lib/pwa/pwa-install-runtime.ts",
  "src/components/pwa-install-banner.tsx",
  "src/components/pwa-install-bridge.tsx",
];
for (const file of installFiles) {
  const source = read(file);
  assert.doesNotMatch(source, /push-subscription|PushManager|cab_upsert_push/);
}

console.log("pwa-phase4-policy: ok");
