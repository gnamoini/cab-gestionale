/**
 * v5.7 stability freeze — API contraction + static boundary enforcement.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  ALLOWED_COGNITIVE_CLUSTER_PUBLIC_API,
  COGNITIVE_CLUSTER_V56_PUBLIC_EXPORTS,
} from "@/lib/selector-core/selector-api-surface-registry";
import {
  assertCognitiveClusterApiBoundary,
  assertIndexBarrelRespectsFreeze,
  runUnifiedPolicyCheck,
} from "@/lib/selector-core/selector-api-usage-enforcer";
import { getExplanation } from "@/lib/selector-core/selector-explainability";
import { measureApiSurfaceReduction } from "@/lib/selector-core/selector-cognitive-surface-metrics";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

// 1. Registry frozen to 3 cluster entrypoints
assert.equal(ALLOWED_COGNITIVE_CLUSTER_PUBLIC_API.length, 3);
assert.deepEqual([...ALLOWED_COGNITIVE_CLUSTER_PUBLIC_API], [
  "loadLatestSelectorSnapshot",
  "resolveSelectorEngineConfig",
  "getExplanation",
]);

// 2. Barrel respects freeze
const indexSource = read("lib/selector-core/index.ts");
assertIndexBarrelRespectsFreeze(indexSource);
assert.doesNotMatch(indexSource, /routeCausalExplanation/);
assert.doesNotMatch(indexSource, /getUserExplanationBundle/);
assert.doesNotMatch(indexSource, /buildUnifiedSelectorCausalModel/);
assert.match(indexSource, /Cognitive cluster barrel/);

// 3. Import graph boundary (CI strict mode)
const strictUnified = runUnifiedPolicyCheck({ mode: "STRICT_CI" });
assert.equal(strictUnified.shouldFail, false);
assert.equal(strictUnified.enforcementReport.shouldFail, false);
assertCognitiveClusterApiBoundary();

// 4. getExplanation default = v5.6 forensic envelope
const unknown = getExplanation("missing-v57-trace");
assert.equal(unknown.valid, true);
assert.ok(unknown.causalModel);
assert.ok(unknown.causalIndex);
assert.ok(Array.isArray(unknown.summary));

// 5. Intent routing via unified entrypoint
const uxExp = getExplanation("missing-v57-trace", "UX");
assert.equal(uxExp.valid, true);
assert.equal(uxExp.causalModel.events.length, 0);

const debugExp = getExplanation("missing-v57-trace", "DEBUG");
assert.equal(debugExp.valid, true);
assert.ok(debugExp.summary.some((line) => line.includes("intent=DEBUG")));
assert.ok(debugExp.causalModel.events.length >= uxExp.causalModel.events.length);

const auditExp = getExplanation("missing-v57-trace", "AUDIT");
assert.equal(auditExp.valid, true);
assert.ok(auditExp.summary.some((line) => line.includes("intent=AUDIT")));

// 6. Surface reduction metrics
const reduction = measureApiSurfaceReduction(
  COGNITIVE_CLUSTER_V56_PUBLIC_EXPORTS,
  ALLOWED_COGNITIVE_CLUSTER_PUBLIC_API,
);
assert.ok(reduction.apiSurfaceDelta < 0);
assert.equal(reduction.complexityRegression, false);
assert.ok(reduction.hiddenInternalRatio > 0);

// 7. Registry + enforcer modules present
assert.match(read("lib/selector-core/selector-api-surface-registry.ts"), /ALLOWED_COGNITIVE_CLUSTER_PUBLIC_API/);
assert.match(read("lib/selector-core/selector-api-usage-enforcer.ts"), /scanForbiddenExternalImports/);

console.log("selector-snapshot-v57-stability-freeze.test.ts OK");
