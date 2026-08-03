/**
 * Policy: DataStaleBanner montato in app-shell-main (dentro main scroll), non in app-providers.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const providers = fs.readFileSync(
  path.join(ROOT, "components/app-providers-gestionale.tsx"),
  "utf8",
);
const shellMain = fs.readFileSync(
  path.join(ROOT, "components/gestionale/app-shell-main.tsx"),
  "utf8",
);
const banner = fs.readFileSync(
  path.join(ROOT, "components/gestionale/data-stale-banner.tsx"),
  "utf8",
);

assert.doesNotMatch(providers, /DeferredDataStaleBanner/);
assert.match(shellMain, /DeferredDataStaleBanner/);
assert.match(banner, /placement="inShell"/);
assert.doesNotMatch(banner, /usePathname/);
assert.doesNotMatch(banner, /getActiveSyncContexts/);
assert.doesNotMatch(banner, /document\.body\.style\.overflow/);
assert.doesNotMatch(banner, /createPortal/);

console.log("data-stale-banner-mount-policy.test.ts OK");
