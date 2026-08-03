import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  PWA_UPDATE_BOOTSTRAP_MS,
  shouldNotifyServiceWorkerUpdateAfterBootstrap,
} from "@/lib/pwa/sw-update";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

assert.equal(PWA_UPDATE_BOOTSTRAP_MS, 2_000);
assert.equal(shouldNotifyServiceWorkerUpdateAfterBootstrap(0, 1_999), false);
assert.equal(shouldNotifyServiceWorkerUpdateAfterBootstrap(0, 2_000), true);

const swUpdate = read("lib/pwa/sw-update.ts");
assert.doesNotMatch(swUpdate, /if\s*\(\s*registration\.waiting\s*\)\s*\{\s*onUpdateAvailable\(\)/);
assert.match(swUpdate, /shouldNotifyServiceWorkerUpdateAfterBootstrap/);
assert.match(swUpdate, /refreshServiceWorkerUpdateCheck/);
assert.match(swUpdate, /markPwaSessionActive/);
assert.match(swUpdate, /bootstrapServiceWorkerUpdateFlow/);
assert.match(swUpdate, /settlePendingServiceWorkerInstall/);
assert.match(swUpdate, /notifyExistingWaiting/);
assert.doesNotMatch(swUpdate, /tryAutoApplyOnColdStart/);
assert.doesNotMatch(swUpdate, /SKIP_WAITING[\s\S]{0,120}cold/i);

const bridge = read("src/components/pwa-service-worker-bridge.tsx");
assert.match(bridge, /subscribedAtMs/);
assert.match(bridge, /visibilitychange/);
assert.match(bridge, /pageshow/);
assert.match(bridge, /setInterval/);
assert.match(bridge, /bootstrapServiceWorkerUpdateFlow/);
assert.doesNotMatch(bridge, /requestAnimationFrame/);

const banner = read("src/components/pwa-update-banner.tsx");
assert.match(banner, /PWA_UPDATE_EVENT/);
assert.match(banner, /getPwaUpdateBlockReason/);

const client = read("lib/pwa/sw-client.ts");
assert.match(client, /PWA_UPDATE_APPLY_REQUESTED_KEY/);
assert.match(client, /consumePwaUpdateApplyRequested/);
assert.match(client, /if \(!consumePwaUpdateApplyRequested\(\)\) return false/);

const guard = read("lib/pwa/pwa-update-guard.ts");
assert.match(guard, /registerPwaUpdateGuard/);
assert.match(guard, /usePwaUpdateGuard/);

const dataStaleBanner = read("components/gestionale/data-stale-banner.tsx");
assert.doesNotMatch(dataStaleBanner, /sw-update/);
assert.doesNotMatch(dataStaleBanner, /pwa-update-guard/);
assert.doesNotMatch(dataStaleBanner, /skipWaiting/);
assert.doesNotMatch(banner, /gestionale-dirty/);
assert.doesNotMatch(banner, /flushGestionaleDirty/);

console.log("pwa-update-ux-policy.test.ts OK");
