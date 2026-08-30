import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  clearStalePwaInstallDetectionState,
  isPwaAppInstalledOnDeviceSync,
  readPwaDisplayModeInBrowser,
} from "@/lib/pwa/pwa-installed-detection";
import { markPwaInstallCompleted } from "@/lib/pwa/pwa-install-state";
import { markPwaInstallRuntimeInstalled, resetPwaInstallRuntimeForTests } from "@/lib/pwa/pwa-install-runtime";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

assert.equal(isPwaAppInstalledOnDeviceSync("browser"), false);
assert.equal(isPwaAppInstalledOnDeviceSync("standalone"), true);
assert.equal(isPwaAppInstalledOnDeviceSync("minimal-ui"), true);

resetPwaInstallRuntimeForTests();
markPwaInstallRuntimeInstalled();
markPwaInstallCompleted();
clearStalePwaInstallDetectionState();
resetPwaInstallRuntimeForTests();

const hook = read("src/hooks/use-pwa-install-prompt.ts");
assert.match(hook, /queryPwaRelatedAppInstalledOnDevice/);
assert.match(hook, /const isAppInstalled = isStandalone \|\| relatedAppInstalled/);
assert.doesNotMatch(hook, /isPwaInstallCompletedInStorage\(\)/);

const bridge = read("src/components/pwa-install-bridge.tsx");
assert.match(bridge, /clearStalePwaInstallDetectionState/);

const footer = read("components/legal/pwa-install-footer-button.tsx");
assert.match(footer, /disabled=\{isAppInstalled/);

assert.equal(typeof readPwaDisplayModeInBrowser(), "string");

console.log("pwa-installed-detection.test.ts OK");
