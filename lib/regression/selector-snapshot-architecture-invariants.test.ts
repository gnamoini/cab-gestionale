/**
 * Collapsed architecture invariants (v5.4–v5.6) — causal SSOT, no legacy shims, policy kernel.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  buildUnifiedSelectorCausalModel,
  createEmptyCausalModel,
  hashCausalModel,
  queryCausalModel,
  serializeCausalModel,
} from "@/lib/selector-core/selector-core-causal-model";
import {
  LEGACY_SHIM_MODULES,
  RULESET_VERSION,
} from "@/lib/selector-core/selector-enforcement-ruleset";
import { assertEnforcementRuntimeSeparation } from "@/lib/selector-core/selector-enforcement-boundary-guard";
import { runUnifiedPolicyCheck } from "@/lib/selector-core/selector-api-usage-enforcer";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function exists(rel: string): boolean {
  return fs.existsSync(path.join(ROOT, rel));
}

// 1. Ruleset version + empty legacy shim registry
assert.equal(RULESET_VERSION, "v6.0");
assert.equal(LEGACY_SHIM_MODULES.length, 0);

// 2. v5.5 shim files removed
const removedShims = [
  "lib/selector-core/selector-unified-causal-index.ts",
  "lib/selector-core/selector-causal-decision-graph.ts",
  "lib/selector-core/selector-temporal-lineage-graph.ts",
  "lib/selector-core/selector-explainability-facade.ts",
  "lib/selector-core/selector-fallback-explainability-engine.ts",
  "lib/selector-core/selector-pre-resolution-guard.ts",
  "lib/selector-core/selector-determinism-integrity-check.ts",
  "lib/selector-core/selector-system-complexity-audit.ts",
];
for (const shim of removedShims) {
  assert.equal(exists(shim), false, `${shim} must be removed`);
}

// 3. Causal SSOT exports functional
const empty = createEmptyCausalModel();
assert.equal(empty.events.length, 0);
const model = buildUnifiedSelectorCausalModel({});
assert.ok(hashCausalModel(model).length > 0);
assert.equal(queryCausalModel(model, { type: "decision" }).length, 0);
assert.ok(serializeCausalModel(model).includes("events"));

// 4. Runtime loader does not import shims or enforcement
const loader = read("lib/selector-core/selector-config-runtime-loader.ts");
assert.doesNotMatch(loader, /selector-unified-causal-index/);
assert.doesNotMatch(loader, /selector-fallback-explainability-engine/);
assert.doesNotMatch(loader, /selector-api-usage-enforcer/);

// 5. Decision engine uses fallback-trace directly
const engine = read("lib/selector-core/selector-decision-engine.ts");
assert.match(engine, /selector-fallback-trace/);
assert.doesNotMatch(engine, /selector-fallback-explainability-engine/);

// 6. Barrel freeze — no causal internals exported
const indexSource = read("lib/selector-core/index.ts");
assert.doesNotMatch(indexSource, /buildUnifiedSelectorCausalModel/);
assert.doesNotMatch(indexSource, /routeCausalExplanation/);
assert.match(indexSource, /Cognitive cluster barrel/);

// 7. Unified policy check passes on real index
assert.equal(runUnifiedPolicyCheck({ mode: "STRICT_CI" }).shouldFail, false);

// 8. Runtime/build separation intact
assertEnforcementRuntimeSeparation();

console.log("selector-snapshot-architecture-invariants.test.ts OK");
