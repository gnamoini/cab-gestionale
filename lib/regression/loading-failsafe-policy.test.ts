/**
 * Loading failsafe policy — gate/hub/list timeout constants.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const loadingFailsafe = read("lib/ui/loading-failsafe.ts");
const sectionGate = read("components/gestionale/gestionale-section-gate.tsx");
const rbacGuard = read("components/gestionale/rbac-page-guard.tsx");
const fatturazionePage = read("app/(gestionale)/fatturazione/page.tsx");
const shellSync = read("lib/ui/use-gestionale-shell-layout-sync.ts");

assert.match(loadingFailsafe, /SECTION_LOADING_FAILSAFE_MS = 8_000/);
assert.match(loadingFailsafe, /LIST_QUERY_LOADING_FAILSAFE_MS = 10_000/);
assert.match(loadingFailsafe, /HUB_QUERY_LOADING_FAILSAFE_MS = 10_000/);
assert.match(loadingFailsafe, /export function useLoadingFailsafe/);
assert.match(loadingFailsafe, /export function usePendingQueryTimeout/);

assert.match(sectionGate, /useLoadingFailsafe\(perm\.isLoading, SECTION_LOADING_FAILSAFE_MS\)/);
assert.match(sectionGate, /LoadingErrorState/);

assert.match(rbacGuard, /RBAC_LOADING_FAILSAFE_MS = 8_000/);

assert.match(fatturazionePage, /Suspense fallback=\{null\}/);
assert.doesNotMatch(fatturazionePage, /LoadingSuspenseFallback/);

assert.match(shellSync, /useState<GestionaleShellLayoutState>\(SSR_SAFE_SHELL_LAYOUT_STATE\)/);
assert.match(shellSync, /SSR_SAFE_SHELL_LAYOUT_STATE/);
assert.match(shellSync, /useLayoutEffect\(\(\) => \{\s*sync\(\)/);
assert.doesNotMatch(shellSync, /readInitialShellLayoutState/);

const shellLayout = read("lib/ui/gestionale-shell-layout.ts");
assert.match(shellLayout, /CSS_VAR_WRITE_THRESHOLD_PX/);
assert.doesNotMatch(
  shellLayout,
  /setProperty\(CAB_HOST_LAYOUT_WIDTH_VAR/,
  "host layout width must not be written to documentElement (feedback loop)",
);

console.log("loading-failsafe-policy.test.ts OK");
