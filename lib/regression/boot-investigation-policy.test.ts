/**
 * Boot investigation instrumentation policy (feature-flag gated, lazy shell edges).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
function read(rel: string) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const mod = read("lib/observability/boot-investigation.ts");
assert.match(mod, /NEXT_PUBLIC_BOOT_INVESTIGATION === "1"/);
assert.match(mod, /export function logBoot/);
assert.match(mod, /export function trackRedirect/);
assert.match(mod, /export function trackStoreUpdate/);
assert.match(mod, /export function trackQueryEvent/);
assert.match(mod, /export function countRender/);
assert.match(mod, /export function exportInvestigationReport/);
assert.match(mod, /LOOP_SUSPECT/);
assert.match(mod, /LOOP_CONFIRMED/);
assert.match(mod, /__cabBootInvestigation/);

const gate = read("lib/observability/boot-investigation-gate.ts");
assert.doesNotMatch(gate, /from ["']@\/lib\/observability\/boot-investigation["']/);

assert.match(read("components/app-providers-gestionale.tsx"), /ObservabilityDiagnosticsPack/);
assert.match(read("src/providers/query-provider.tsx"), /loadBootInvestigationMod/);
assert.match(read("context/auth-context.tsx"), /lazyTrackStoreUpdate\("auth\.status"/);
assert.match(read("src/middleware/proxy-handler.ts"), /lazyLogBootServer\("REDIRECT"/);

console.log("boot-investigation-policy.test.ts OK");
