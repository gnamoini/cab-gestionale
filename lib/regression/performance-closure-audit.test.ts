import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PERFORMANCE_GOVERNANCE_SUITE } from "@/lib/control/suites/performance-governance.suite";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function exists(rel: string): boolean {
  return fs.existsSync(path.join(ROOT, rel));
}

for (const file of PERFORMANCE_GOVERNANCE_SUITE) {
  assert.ok(exists(file), `missing governance suite file: ${file}`);
}

assert.ok(exists("lib/regression/performance-closure-audit.test.ts"));
assert.ok(exists("scripts/ops/performance-closure-verify.mjs"));
assert.ok(exists("docs/adr/ADR-004-performance-governance.md"));
assert.ok(exists("docs/performance-governance-v6-budget.md"));
assert.ok(exists("docs/checklists/performance-feature-checklist.md"));

const pkg = read("package.json");
for (const script of [
  "ops:build-budget-gate",
  "ops:performance-closure-verify",
  "ops:performance-trend-report",
  "ops:performance-regression-check",
]) {
  assert.match(pkg, new RegExp(script), `package.json missing ${script}`);
}

const registry = read("lib/control/registry.ts");
for (const id of [
  "runtime.performance.policy",
  "runtime.performance.build-budget",
  "runtime.performance.regression",
  "runtime.performance.lint",
  "runtime.performance.lighthouse",
]) {
  assert.match(registry, new RegExp(id), `registry missing ${id}`);
}

const prefetch = read("src/lib/react-query/prefetch-gestionale-page.ts");
assert.match(prefetch, /prefetchCriticalPage/);
assert.match(prefetch, /prefetchDeferredPage/);

for (const route of ["lavorazioni", "dashboard", "magazzino", "report"]) {
  assert.ok(exists(`app/(gestionale)/${route}/loading.tsx`), `missing loading.tsx for ${route}`);
}

const shared = read("lib/regression/shared-components-perf-policy.test.ts");
assert.match(shared, /GestionaleModalGate|gestionale-modal-gate/);
assert.match(shared, /kanban-virtual-column-scroll|useVirtualizer/);

const agenda = read("lib/regression/agenda-perf-policy.test.ts");
assert.match(agenda, /fetchAgendaPageDefaultRangeServer|workshop-schedule-fetch-server/);

const lav = read("lib/regression/lavorazioni-perf-policy.test.ts");
assert.match(lav, /LavorazioneConcludiConfirmDialogLazy/);

const reportView = read("components/report/report-analytics-view.tsx");
assert.match(reportView, /enableMezzi:\s*false/);
assert.match(reportView, /enableMovimenti:\s*false/);

const eslint = read("eslint.config.mjs");
assert.match(eslint, /cab-perf\/no-select-star/);
assert.match(eslint, /cab-perf\/no-heavy-import-in-client/);

const snapshot = read("scripts/ops/performance-snapshot.mjs");
assert.match(snapshot, /build-budget-snapshot\.json/);
assert.doesNotMatch(snapshot, /queryCount: budget\.maxQueries/);

console.log("performance-closure-audit.test.ts OK");
