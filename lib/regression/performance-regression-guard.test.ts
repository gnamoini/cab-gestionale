import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function exists(rel: string): boolean {
  return fs.existsSync(path.join(ROOT, rel));
}

for (const script of [
  "scripts/ops/performance-snapshot.mjs",
  "scripts/ops/performance-regression-check.mjs",
  "scripts/ops/react-render-audit.mjs",
  "scripts/ops/query-frequency-audit.mjs",
  "scripts/ops/export-performance-budgets.ts",
  "scripts/ops/lib/load-performance-budgets.mjs",
  "scripts/ops/lib/generate-regression-report.mjs",
]) {
  assert.ok(exists(script), `missing ${script}`);
}

assert.ok(exists("lib/performance/performance-budget-registry.ts"));
assert.ok(exists("lib/observability/react-render-audit.ts"));

const report = exists("docs/performance-regression-report.md")
  ? read("docs/performance-regression-report.md")
  : "";
if (report.length > 0) {
  for (const section of ["P0", "P1", "P2"]) {
    assert.match(report, new RegExp(section), `performance-regression-report.md missing ${section}`);
  }
}

const guardDoc = read("docs/performance-regression-guard.md");
assert.match(guardDoc, /ops:performance-snapshot/);
assert.match(guardDoc, /ops:performance-regression-check/);

const pkg = read("package.json");
assert.match(pkg, /ops:performance-snapshot/);
assert.match(pkg, /ops:performance-regression-check/);

const appShell = read("components/gestionale/app-shell.tsx");
assert.match(appShell, /ReactRenderAuditProfiler/);

console.log("performance-regression-guard.test.ts OK");
