/**
 * Tier smoke regression: core + extended = full partition, no overlap.
 */
import assert from "node:assert/strict";
import {
  REGRESSION_ALL,
  REGRESSION_CORE,
  REGRESSION_EXTENDED,
} from "@/lib/regression/smoke-regression-lists";

const coreSet = new Set(REGRESSION_CORE);
const extSet = new Set(REGRESSION_EXTENDED);

assert.equal(REGRESSION_ALL.length, REGRESSION_CORE.length + REGRESSION_EXTENDED.length);
assert.equal(coreSet.size, REGRESSION_CORE.length, "duplicate in REGRESSION_CORE");
assert.equal(extSet.size, REGRESSION_EXTENDED.length, "duplicate in REGRESSION_EXTENDED");

for (const f of REGRESSION_CORE) {
  assert.ok(!extSet.has(f), `core/extended overlap: ${f}`);
}

console.log(
  `smoke-regression-lists-audit.test.ts OK (core=${REGRESSION_CORE.length}, extended=${REGRESSION_EXTENDED.length})`,
);
