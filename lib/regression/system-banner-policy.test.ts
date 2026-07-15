import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const bannerFiles = [
  "src/components/notification-opt-in-banner.tsx",
  "src/components/pwa-install-banner.tsx",
  "src/components/pwa-ios-install-hint.tsx",
  "src/components/pwa-update-banner.tsx",
  "src/components/pwa-offline-block-banner.tsx",
];

for (const rel of bannerFiles) {
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
  assert.match(src, /SystemBannerShell/, `${rel} must use SystemBannerShell`);
  assert.match(src, /dsSystemBanner/, `${rel} must use dsSystemBanner tokens`);
  assert.doesNotMatch(src, /BANNER_SHELL|HINT_SHELL/, `${rel} must not keep local banner shell tokens`);
}

const designSystem = fs.readFileSync(path.join(ROOT, "lib/ui/design-system.ts"), "utf8");
assert.match(designSystem, /dsSystemBannerShellTop/);
assert.doesNotMatch(designSystem, /dsSystemBannerShellBottom/, "all system banners must be top sticky");
assert.match(designSystem, /bg-\[#09090b\]/, "system banner must use fixed dark shell");

const systemBanner = fs.readFileSync(path.join(ROOT, "components/design-system/system-banner.tsx"), "utf8");
assert.doesNotMatch(systemBanner, /absolute right-0/, "dismiss must not overlap action buttons");
assert.match(systemBanner, /dsSystemBannerAside/, "actions and dismiss share dedicated aside column");

console.log("system-banner-policy.test.ts OK");
