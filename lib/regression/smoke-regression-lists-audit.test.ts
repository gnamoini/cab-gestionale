/**
 * Tier smoke regression: core + extended = full partition, no overlap.
 * Spec Playwright mutanti devono usare marker SSOT (AUDIT / E2E / smoke-doc).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  REGRESSION_ALL,
  REGRESSION_CORE,
  REGRESSION_EXTENDED,
} from "@/lib/regression/smoke-regression-lists";

const ROOT = process.cwd();

const coreSet = new Set(REGRESSION_CORE);
const extSet = new Set(REGRESSION_EXTENDED);

assert.equal(REGRESSION_ALL.length, REGRESSION_CORE.length + REGRESSION_EXTENDED.length);
assert.equal(coreSet.size, REGRESSION_CORE.length, "duplicate in REGRESSION_CORE");
assert.equal(extSet.size, REGRESSION_EXTENDED.length, "duplicate in REGRESSION_EXTENDED");

for (const f of REGRESSION_CORE) {
  assert.ok(!extSet.has(f), `core/extended overlap: ${f}`);
}

const MUTATING_SMOKE_SPECS: { file: string; markers: RegExp[] }[] = [
  {
    file: "e2e/smoke/13-lavorazioni-scheda-ingresso.spec.ts",
    markers: [/buildSchedaIngressoAuditFixture|uniqueAuditToken|AUDIT-/],
  },
  {
    file: "e2e/smoke/14-magazzino-nuovo-ricambio.spec.ts",
    markers: [/uniqueRicambioCodice|E2E-/],
  },
  {
    file: "e2e/smoke/05-document-lifecycle.spec.ts",
    markers: [/smoke-doc/],
  },
];

for (const spec of MUTATING_SMOKE_SPECS) {
  const abs = path.join(ROOT, spec.file);
  assert.ok(fs.existsSync(abs), `missing mutating smoke spec: ${spec.file}`);
  const src = fs.readFileSync(abs, "utf8");
  assert.ok(
    spec.markers.some((re) => re.test(src)),
    `${spec.file} must reference smoke data markers (AUDIT/E2E/smoke-doc)`,
  );
}

console.log(
  `smoke-regression-lists-audit.test.ts OK (core=${REGRESSION_CORE.length}, extended=${REGRESSION_EXTENDED.length})`,
);
