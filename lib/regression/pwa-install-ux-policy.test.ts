import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  PWA_DISPLAY_MODE_STANDALONE_QUERY,
  resolvePwaDisplayMode,
} from "@/lib/pwa/pwa-display-mode";
import {
  clearPwaDeferredInstallPrompt,
  getPwaInstallRuntime,
  handlePwaAppInstalled,
  resetPwaInstallRuntimeForTests,
  setPwaDeferredInstallPrompt,
} from "@/lib/pwa/pwa-install-runtime";
import {
  computeInstallDismissUntil,
  isInstallPromptDismissed,
  PWA_INSTALL_STATE_NS,
  PWA_INSTALL_DISMISS_TTL_MS,
  readInstallDismissedUntil,
} from "@/lib/pwa/pwa-install-state";
import { resolvePwaInstallMenuAvailable, resolvePwaInstallUiVariant } from "@/lib/pwa/pwa-install";
import { detectPwaPlatform, isIosSafariLike } from "@/lib/pwa/pwa-platform";

const ROOT = process.cwd();

const IOS_SAFARI_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const ANDROID_CHROME_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
const DESKTOP_CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const IPAD_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function mockMatchMedia(map: Record<string, boolean>) {
  return (query: string) => ({ matches: map[query] ?? false });
}

// --- platform ---
assert.equal(detectPwaPlatform(IOS_SAFARI_UA), "ios");
assert.equal(detectPwaPlatform(ANDROID_CHROME_UA), "android");
assert.equal(detectPwaPlatform(DESKTOP_CHROME_UA), "desktop");
assert.equal(detectPwaPlatform(IPAD_UA, 5), "ios");
assert.ok(isIosSafariLike(IOS_SAFARI_UA));

// --- display mode ---
assert.equal(
  resolvePwaDisplayMode({
    matchMedia: mockMatchMedia({ [PWA_DISPLAY_MODE_STANDALONE_QUERY]: true }),
    navigatorStandalone: false,
  }),
  "standalone",
);

assert.equal(
  resolvePwaDisplayMode({
    matchMedia: mockMatchMedia({}),
    navigatorStandalone: true,
  }),
  "standalone",
  "iOS navigator.standalone fallback",
);

assert.equal(
  resolvePwaDisplayMode({
    matchMedia: mockMatchMedia({ [PWA_DISPLAY_MODE_STANDALONE_QUERY]: true }),
    navigatorStandalone: false,
  }),
  "standalone",
  "matchMedia standalone prima di navigator.standalone",
);

// --- dismiss TTL ---
const now = 1_700_000_000_000;
assert.equal(PWA_INSTALL_DISMISS_TTL_MS, 7 * 24 * 60 * 60 * 1000);
const until = computeInstallDismissUntil(now);
assert.ok(isInstallPromptDismissed(now, String(until)));
assert.ok(!isInstallPromptDismissed(until + 1, String(until)));
assert.equal(readInstallDismissedUntil(now + 1, String(until)), until);

assert.equal(
  resolvePwaInstallUiVariant({
    platform: "ios",
    displayMode: "browser",
    hasDeferredPrompt: false,
    dismissed: true,
    installMarked: false,
    engagementElapsed: true,
  }),
  "none",
  "banner nascosto dopo dismiss",
);

assert.equal(
  resolvePwaInstallMenuAvailable({
    platform: "android",
    displayMode: "browser",
    hasDeferredPrompt: true,
    installMarked: false,
  }),
  true,
  "menu install disponibile anche senza banner",
);

assert.equal(
  resolvePwaInstallMenuAvailable({
    platform: "ios",
    displayMode: "browser",
    hasDeferredPrompt: false,
    installMarked: false,
  }),
  true,
);

// --- install UI variant ---
assert.equal(
  resolvePwaInstallUiVariant({
    platform: "desktop",
    displayMode: "standalone",
    hasDeferredPrompt: true,
    dismissed: false,
    installMarked: false,
    engagementElapsed: true,
  }),
  "none",
);

assert.equal(
  resolvePwaInstallUiVariant({
    platform: "android",
    displayMode: "browser",
    hasDeferredPrompt: true,
    dismissed: false,
    installMarked: false,
    engagementElapsed: false,
  }),
  "none",
  "engagement gate",
);

assert.equal(
  resolvePwaInstallUiVariant({
    platform: "android",
    displayMode: "browser",
    hasDeferredPrompt: true,
    dismissed: false,
    installMarked: false,
    engagementElapsed: true,
  }),
  "native",
);

assert.equal(
  resolvePwaInstallUiVariant({
    platform: "ios",
    displayMode: "browser",
    hasDeferredPrompt: false,
    dismissed: false,
    installMarked: false,
    engagementElapsed: true,
  }),
  "ios-hint",
);

assert.equal(
  resolvePwaInstallUiVariant({
    platform: "ios",
    displayMode: "browser",
    hasDeferredPrompt: false,
    dismissed: true,
    installMarked: false,
    engagementElapsed: true,
  }),
  "none",
);

// --- runtime singleton ---
resetPwaInstallRuntimeForTests();
const fakePrompt = {
  prompt: async () => {},
  userChoice: Promise.resolve({ outcome: "accepted" as const, platform: "web" }),
} as import("@/lib/pwa/pwa-install").BeforeInstallPromptEvent;

setPwaDeferredInstallPrompt(fakePrompt);
assert.ok(getPwaInstallRuntime().deferredPrompt);
assert.ok(getPwaInstallRuntime().availableAt);

clearPwaDeferredInstallPrompt();
assert.equal(getPwaInstallRuntime().deferredPrompt, null);

handlePwaAppInstalled();
assert.equal(getPwaInstallRuntime().installed, true);
assert.equal(getPwaInstallRuntime().deferredPrompt, null);

// --- policy grep ---
const installState = read("lib/pwa/pwa-install-state.ts");
assert.match(installState, new RegExp(PWA_INSTALL_STATE_NS.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

const bridge = read("src/components/pwa-install-bridge.tsx");
assert.match(bridge, /beforeinstallprompt/);
assert.match(bridge, /handlePwaAppInstalled/);
assert.match(bridge, /clearStalePwaInstallDetectionState/);

const providers = read("components/app-providers-core.tsx");
assert.match(providers, /PwaInstallBanner/);
assert.match(providers, /PwaIosInstallHint/);
assert.match(providers, /PwaInstallBridge/);
assert.match(providers, /PwaDisplayModeBridge/);
assert.doesNotMatch(providers, /useAuth/);

const profileActions = read("components/profile/profile-actions-section.tsx");
assert.match(profileActions, /PwaInstallFooterButton/);
assert.match(profileActions, /variant="profile-action"/);

const installFooterBtn = read("components/legal/pwa-install-footer-button.tsx");
assert.match(installFooterBtn, /Installa app/);

const phase3Files = [
  "lib/pwa/pwa-platform.ts",
  "lib/pwa/pwa-display-mode.ts",
  "lib/pwa/pwa-install-state.ts",
  "lib/pwa/pwa-install.ts",
  "lib/pwa/pwa-install-runtime.ts",
  "src/hooks/use-pwa-display-mode.ts",
  "src/hooks/use-pwa-install-prompt.ts",
  "src/components/pwa-install-bridge.tsx",
  "src/components/pwa-install-banner.tsx",
  "src/components/pwa-ios-install-hint.tsx",
  "src/components/pwa-display-mode-bridge.tsx",
];

for (const rel of phase3Files) {
  const src = read(rel);
  assert.doesNotMatch(src, /@\/lib\/auth|useAuth|@\/lib\/db/, `${rel} no auth`);
  assert.doesNotMatch(src, /sw-worker-entry|sw-register/, `${rel} no SW imports`);
}

const hookInstall = read("src/hooks/use-pwa-install-prompt.ts");
assert.doesNotMatch(hookInstall, /beforeinstallprompt/, "hook non registra listener");
assert.match(hookInstall, /queryPwaRelatedAppInstalledOnDevice/);
assert.doesNotMatch(hookInstall, /isPwaInstallCompletedInStorage\(\)/);

// beforeinstallprompt solo nel bridge
const searchDirs = ["src", "components", "lib/pwa"];
for (const dir of searchDirs) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) continue;
  const stack = [abs];
  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules") continue;
        stack.push(full);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entry.name)) continue;
      const rel = path.relative(ROOT, full).replace(/\\/g, "/");
      if (rel === "src/components/pwa-install-bridge.tsx") continue;
      if (rel.includes("lib/regression/")) continue;
      const src = fs.readFileSync(full, "utf8");
      assert.doesNotMatch(
        src,
        /addEventListener\(["']beforeinstallprompt/,
        `${rel} non deve registrare beforeinstallprompt`,
      );
    }
  }
}

assert.match(read("lib/pwa/pwa-display-mode.ts"), /PWA_DISPLAY_MODE_STANDALONE_QUERY/);

console.log("pwa-install-ux-policy: ok");
