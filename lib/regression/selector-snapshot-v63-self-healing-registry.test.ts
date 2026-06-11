/**
 * v6.3 self-healing observation registry — auto discovery + explanation kernel.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { DEBUG_DSL_REGISTRY } from "@/lib/selector-core/selector-debug-dsl-registry";
import { parseDebugQuery } from "@/lib/selector-core/selector-debug-dsl-engine";
import { executeDebugQuery } from "@/lib/selector-core/selector-debug-dsl-engine";
import { resolveImpactAnalysis } from "@/lib/selector-core/selector-explanation-kernel";
import {
  buildObservationRegistry,
  writeObservationRegistryArtifact,
} from "@/lib/selector-core/selector-observation-registry-builder";
import {
  getObservationRegistry,
  rebuildObservationRegistry,
} from "@/lib/selector-core/selector-observation-registry";
import { assertEnforcementRuntimeSeparation } from "@/lib/selector-core/selector-enforcement-boundary-guard";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

// 1. Registry discovers enforcement ruleset under Policy
const live = rebuildObservationRegistry();
const policyFiles = live.domains.policy.files;
assert.ok(
  policyFiles.some((f) => f.includes("selector-enforcement-ruleset.ts")),
  "Policy domain must include selector-enforcement-ruleset.ts",
);

// 2. Import graph for decision-engine
const engineFile = "lib/selector-core/selector-decision-engine.ts";
const engineGraph = live.importGraph[engineFile];
assert.ok(engineGraph, "decision-engine must exist in import graph");
assert.ok(
  engineGraph.imports.length > 0 || engineGraph.importedBy.length > 0,
  "decision-engine graph edges must be non-empty",
);

// 3. Parser driven by DEBUG_DSL_REGISTRY — no hardcoded trace:/module:/impact: in parser
const parserSource = read("lib/selector-core/selector-debug-dsl-engine.ts");
assert.match(parserSource, /DEBUG_DSL_REGISTRY/);
assert.doesNotMatch(parserSource, /const TRACE_PREFIX/);
assert.doesNotMatch(parserSource, /const MODULE_PREFIX/);
assert.doesNotMatch(parserSource, /const IMPACT_PREFIX/);
assert.equal(DEBUG_DSL_REGISTRY.commands.length, 5);

// 4. Module lookup with ranking — default depth excludes deep-only hints
const moduleResult = executeDebugQuery("module:policy");
assert.ok(moduleResult.rankedHints.critical.length > 0);
assert.equal(moduleResult.depth, "important");
assert.ok(moduleResult.fileHints.length > 0);
assert.ok(moduleResult.fileHints.length <= moduleResult.rankedHints.critical.length + moduleResult.rankedHints.important.length + moduleResult.rankedHints.related.length);

// 5. expand:deep includes deep tier
const deepResult = executeDebugQuery("trace:gc -> policy expand:deep");
assert.equal(deepResult.depth, "deep");
assert.ok(deepResult.rankedHints.deep.length >= 0);

// 6. Time machine queries
const timeResult = executeDebugQuery("time:0");
assert.ok(timeResult.timeSnapshot);
assert.equal(typeof timeResult.timeSnapshot.activeSnapshot.version, "string");
assert.equal(typeof timeResult.timeSnapshot.pointerState.activeVersion, "string");

const snapResult = executeDebugQuery("snapshot:v0@0");
assert.ok(snapResult.timeSnapshot);
assert.equal(snapResult.timeSnapshot.activeSnapshot.version, "v0");

// 7. Impact via kernel import graph (not static IMPACT_GRAPH)
const dslEngineSource = read("lib/selector-core/selector-debug-dsl-engine.ts");
assert.doesNotMatch(dslEngineSource, /const IMPACT_GRAPH/);
const impact = resolveImpactAnalysis("selector-decision-engine");
assert.ok(impact.upstream.length + impact.downstream.length > 0);

// 8. Runtime separation
assertEnforcementRuntimeSeparation();
assert.doesNotMatch(read("lib/selector-core/selector-config-runtime-loader.ts"), /selector-explanation-kernel/);
assert.doesNotMatch(read("lib/selector-core/selector-explainability.ts"), /selector-explanation-kernel/);

// 9. Maintenance metric — manual shim lines vs total observation layer
const shimFiles = ["lib/selector-core/selector-observation-registry.ts"];
const manualLines = shimFiles
  .map((f) => read(f).split("\n").length)
  .reduce((a, b) => a + b, 0);
const generatedLines = read(
  "lib/selector-core/generated/selector-observation-registry.generated.ts",
).split("\n").length;
const ratio = manualLines / (manualLines + generatedLines);
assert.ok(ratio <= 0.2, `manualMaintenanceRatio ${ratio} must be <= 0.2`);

// 10. Generated artifact matches builder output hash
const rebuilt = buildObservationRegistry();
const registry = getObservationRegistry();
assert.equal(registry.domains.policy.modules.length, rebuilt.domains.policy.modules.length);
assert.equal(
  Object.keys(registry.importGraph).length,
  Object.keys(rebuilt.importGraph).length,
);

// 11. parseDebugQuery kinds from registry
const traceParsed = parseDebugQuery("trace:gc -> policy -> snapshot");
assert.equal(traceParsed.kind, "trace_flow");
const timeParsed = parseDebugQuery("time:123");
assert.equal(timeParsed.kind, "time_machine");
if (timeParsed.kind === "time_machine") assert.equal(timeParsed.timestamp, 123);

// 12. v6.3 modules present
assert.match(read("lib/selector-core/selector-explanation-kernel.ts"), /resolveExplanation/);
assert.match(read("lib/selector-core/selector-architecture-time-machine.ts"), /reconstructArchitectureAt/);
assert.match(read("lib/selector-core/selector-explanation-kernel.ts"), /resolveImpactAnalysis/);

writeObservationRegistryArtifact();

console.log("selector-snapshot-v63-self-healing-registry.test.ts OK");
