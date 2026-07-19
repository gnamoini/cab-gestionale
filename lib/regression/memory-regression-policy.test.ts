import assert from "node:assert/strict";
import fs, { existsSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const script = read("scripts/bench/memory-regression-benchmark.ts");
assert.match(script, /getQueryCache\(\)\.getAll\(\)/);
assert.match(script, /detachedNodeCount/);
assert.match(script, /heapUsedAfterGcMb/);
assert.match(script, /--expose-gc/);
assert.match(script, /--cycles=/);
assert.match(script, /heapSlopeMbPerCycle/);
assert.match(script, /NEXT_PUBLIC_BENCH_EXPOSE_QUERY/);

const envHelper = read("scripts/bench/benchmark-environment.ts");
assert.match(envHelper, /buildBenchmarkEnvironment/);
assert.match(envHelper, /gitCommit/);

const skeleton = read("scripts/bench/skeleton-runtime-benchmark.ts");
assert.match(skeleton, /benchmark-environment/);
assert.match(skeleton, /measureCls/);

const uxGate = read("scripts/bench/ux-regression-gate.ts");
assert.match(uxGate, /blankAfterLoadingMs/);
assert.match(uxGate, /skeletonToInteractiveMs/);

const queryProvider = read("src/providers/query-provider.tsx");
assert.match(queryProvider, /__GESTIONALE_QUERY_CLIENT__/);

const matrix = read("docs/performance-regression-matrix.md");
assert.match(matrix, /control:cert/);
assert.match(matrix, /bench:memory/);

const pkg = read("package.json");
assert.match(pkg, /"bench:memory"/);
assert.match(pkg, /"bench:memory:trend"/);
assert.match(pkg, /"bench:ux-gate"/);

assert.ok(existsSync(path.join(ROOT, "scripts/bench/benchmark-environment.ts")));
assert.ok(existsSync(path.join(ROOT, "scripts/bench/benchmark-auth.ts")));
assert.ok(existsSync(path.join(ROOT, "scripts/bench/ux-regression-gate.ts")));
assert.ok(existsSync(path.join(ROOT, "docs/performance/post-v3-results.md")));

console.log("memory-regression-policy.test.ts OK");
