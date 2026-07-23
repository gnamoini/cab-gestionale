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
assert.match(swUpdate, /tryAutoApplyOnColdStart/);
assert.match(swUpdate, /markPwaSessionActive/);
assert.match(swUpdate, /bootstrapServiceWorkerUpdateFlow/);
assert.match(swUpdate, /settlePendingServiceWorkerInstall/);
assert.match(swUpdate, /beginPwaBootstrap/);

const bridge = read("src/components/pwa-service-worker-bridge.tsx");
assert.match(bridge, /subscribedAtMs/);
assert.match(bridge, /visibilitychange/);
assert.match(bridge, /bootstrapServiceWorkerUpdateFlow/);
assert.doesNotMatch(bridge, /requestAnimationFrame/);

const banner = read("src/components/pwa-update-banner.tsx");
assert.doesNotMatch(banner, /requestAnimationFrame/);
assert.doesNotMatch(banner, /readUpdateVisible/);
assert.match(banner, /PWA_UPDATE_EVENT/);

console.log("pwa-update-ux-policy.test.ts OK");
