import assert from "node:assert/strict";
import { test } from "node:test";
import { runFullBenchmarkComparison } from "@/lib/domain/technical-knowledge-base/benchmark/run-benchmark";

test("benchmark TDE: THR = 0 on seed dataset", () => {
  const { tde } = runFullBenchmarkComparison();
  assert.equal(tde.thr, 0, `THR must be 0, got ${tde.thr}`);
  assert.ok(tde.kbCoverage >= 0.66, `coverage ${tde.kbCoverage}`);
});

test("benchmark TDE: OAR acceptable on seed", () => {
  const { tde } = runFullBenchmarkComparison();
  assert.ok(tde.oar >= 0.5, `OAR ${tde.oar}`);
});

console.log("benchmark.test.ts OK");
