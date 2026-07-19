/**
 * Sprint 2.5 shell bundle policy — AST edges, chunk displacement, firstLoadJsKb tier.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { auditShellBootInvestigationImports } from "@/lib/regression/shell-static-import-audit";

const ROOT = process.cwd();
const SNAPSHOT = path.join(ROOT, "test-results", "build-budget-snapshot.json");
const CHUNK_DISPLACEMENT = path.join(ROOT, "test-results", "chunk-displacement-sprint25.json");

const SPRINT25_PASS_KB = 1700;
const SPRINT25_WARN_KB = 1750;

function readJson(rel: string): unknown {
  const p = path.join(ROOT, rel);
  assert.ok(fs.existsSync(p), `missing ${rel}`);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

// AST — zero static/dynamic edges in critical graph
const astViolations = auditShellBootInvestigationImports();
assert.equal(
  astViolations.length,
  0,
  `boot-investigation critical graph violations:\n${astViolations.join("\n")}`,
);

// Gate file — zero import from boot-investigation.ts
const gateSrc = fs.readFileSync(path.join(ROOT, "lib/observability/boot-investigation-gate.ts"), "utf8");
assert.doesNotMatch(gateSrc, /from ["']@\/lib\/observability\/boot-investigation["']/);
assert.match(gateSrc, /NEXT_PUBLIC_BOOT_INVESTIGATION/);
assert.match(gateSrc, /NEXT_PUBLIC_PERF_DIAGNOSTICS/);

// App providers — Lite sync, diagnostics dynamic, DevUx dynamic
const providers = fs.readFileSync(path.join(ROOT, "components/app-providers-gestionale.tsx"), "utf8");
assert.match(providers, /ObservabilityProviderLite/);
assert.match(providers, /ObservabilityDiagnosticsPack/);
assert.doesNotMatch(providers, /from ["']@\/components\/observability\/boot-investigation-mount["']/);
assert.doesNotMatch(providers, /from ["']@\/components\/observability\/runtime-health-bridge["']/);
assert.match(providers, /dynamic\(/);
assert.match(providers, /dev-ux-enforcement-guard/);

// firstLoadJsKb tier (requires build snapshot)
if (fs.existsSync(SNAPSHOT)) {
  const snap = readJson("test-results/build-budget-snapshot.json") as { firstLoadJsKb?: number };
  const kb = snap.firstLoadJsKb ?? 9999;
  if (kb > SPRINT25_WARN_KB) {
    throw new Error(`Sprint 2.5 FAIL: firstLoadJsKb=${kb} > ${SPRINT25_WARN_KB}`);
  }
  if (kb > SPRINT25_PASS_KB) {
    console.warn(`Sprint 2.5 WARN: firstLoadJsKb=${kb} > ${SPRINT25_PASS_KB} (≤${SPRINT25_WARN_KB})`);
  } else {
    console.log(`Sprint 2.5 PASS: firstLoadJsKb=${kb} ≤ ${SPRINT25_PASS_KB}`);
  }
} else {
  console.warn("shell-bundle-sprint25-policy: no build-budget-snapshot.json — skipping KB gate");
}

// Chunk displacement (requires post-build audit)
if (fs.existsSync(CHUNK_DISPLACEMENT)) {
  const disp = readJson("test-results/chunk-displacement-sprint25.json") as { pass?: boolean };
  assert.equal(disp.pass, true, "chunk displacement must PASS");
} else {
  console.warn("shell-bundle-sprint25-policy: no chunk-displacement-sprint25.json — run bench:chunk-displacement");
}

console.log("shell-bundle-sprint25-policy.test.ts OK");
