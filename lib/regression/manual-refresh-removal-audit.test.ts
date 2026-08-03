/**
 * Policy: no manual user refresh UI or partial flush imports in UI layer.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function walkUiFiles(dir: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkUiFiles(full));
    } else if (/\.(tsx|ts)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const staleBanner = read("components/gestionale/data-stale-banner.tsx");
assert.match(staleBanner, /location\.reload/);
assert.doesNotMatch(staleBanner, /flush\(/);

const denyPatterns = [
  "GestionaleRefreshToolbarButton",
  "PageActionMenuRefreshButton",
  "runGestionalePageRefresh",
  "useDashboardRefresh",
  "useClientLavorazioniRefresh",
  "refresh-dashboard-queries",
];

const importDenyPatterns = [
  "flushGestionaleDirty",
  "syncClientPortalOperationalData",
  "run-gestionale-page-refresh",
];

const importAllowlistFiles = [
  "src/components/gestionale-realtime-bridge.tsx",
];

const uiRoots = [
  path.join(ROOT, "components"),
  path.join(ROOT, "src", "components"),
];

const allowlistSuffixes = [
  path.join("components", "ui", "page-action-menu"),
  path.join("components", "design-system", "shell-nav-icons.tsx"),
  path.join("components", "ui", "page-action-menu", "page-action-menu-icons.tsx"),
];

for (const file of uiRoots.flatMap((r) => walkUiFiles(r))) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  if (allowlistSuffixes.some((s) => rel.includes(s.replace(/\\/g, "/")))) continue;
  if (importAllowlistFiles.includes(rel)) continue;
  if (rel === "components/gestionale/page-header-toolbar.tsx") continue;

  const src = fs.readFileSync(file, "utf8");
  for (const pattern of denyPatterns) {
    assert.doesNotMatch(src, new RegExp(pattern), `${rel} must not reference ${pattern}`);
  }
  for (const pattern of importDenyPatterns) {
    assert.doesNotMatch(src, new RegExp(pattern), `${rel} must not import ${pattern}`);
  }
}

const ptr = read("lib/ui/use-pull-to-refresh.ts");
assert.match(ptr, /location\.reload/);
assert.doesNotMatch(ptr, /runGestionalePageRefresh/);

const pwaBanner = read("src/components/pwa-update-banner.tsx");
assert.doesNotMatch(pwaBanner, /gestionale-dirty/);
assert.doesNotMatch(pwaBanner, /flushGestionaleDirty/);
assert.doesNotMatch(staleBanner, /sw-update/);
assert.doesNotMatch(staleBanner, /pwa-update-guard/);
assert.doesNotMatch(staleBanner, /skipWaiting/);

console.log("manual-refresh-removal-audit.test.ts OK");
