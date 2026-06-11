/**
 * v6.2 observation layer + Cursor debug DSL — static navigation, zero runtime coupling.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  SelectorObservationIndex,
  resolveDocMapForDomain,
  resolveObservationDomainSlug,
} from "@/lib/selector-core/selector-observation-registry";
import { traceObservation } from "@/lib/selector-core/selector-explanation-kernel";
import {
  executeDebugQuery,
  parseDebugQuery,
  resolveImpactAnalysis,
  resolveTraceFlow,
} from "@/lib/selector-core/selector-debug-dsl-engine";
import { assertEnforcementRuntimeSeparation } from "@/lib/selector-core/selector-enforcement-boundary-guard";
import {
  debugObservation,
  __resetDebugObservationForTests,
} from "@/lib/selector-core/selector-debug-observation";
import { validatePhase, unifiedPolicyCheckPhase } from "@/lib/selector-core/selector-build-orchestrator";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

// 1. Observation index — key domains present
assert.ok(SelectorObservationIndex.policy.ruleset);
assert.ok(SelectorObservationIndex.snapshot.pointer);
assert.ok(SelectorObservationIndex.gc.policy);
assert.equal(resolveObservationDomainSlug("convergence"), "policy");

// 2. traceObservation policy path
const policyTrace = traceObservation({ type: "policy", traceId: "v62-test-trace" });
assert.ok(policyTrace.recommendedFiles.some((f) => f.includes("selector-enforcement-ruleset")));
assert.ok(policyTrace.recommendedFiles.some((f) => f.includes("selector-api-usage-enforcer")));
assert.match(policyTrace.explanationHint, /getExplanation/);

// 3. parseDebugQuery trace flow
const parsed = parseDebugQuery("trace:gc → policy → snapshot");
assert.equal(parsed.kind, "trace_flow");
if (parsed.kind === "trace_flow") {
  assert.deepEqual(parsed.steps, ["gc", "policy", "snapshot"]);
}

// 4. executeDebugQuery module lookup
const moduleResult = executeDebugQuery("module:convergence");
assert.ok(moduleResult.fileHints.length > 0);
assert.ok(moduleResult.testHints.length > 0);
assert.ok(moduleResult.confidence >= 0.8);

// 5. impact analysis
const impact = resolveImpactAnalysis("selector-decision-engine");
assert.ok(impact.upstream.length > 0);
assert.ok(impact.downstream.length > 0);
assert.ok(impact.riskZones.length > 0);
const impactResult = executeDebugQuery("impact:selector-decision-engine");
assert.ok(impactResult.fileHints.length > 0);

// 6. trace flow resolution
const flow = resolveTraceFlow(["gc", "policy", "snapshot"]);
assert.deepEqual(flow.steps, ["gc", "policy", "snapshot"]);
assert.ok(flow.fileHints.length > 0);

// 7. doc map uses real paths
const policyDocs = resolveDocMapForDomain("policy");
assert.ok(policyDocs.code.some((p) => p.endsWith("selector-enforcement-ruleset.ts")));
assert.ok(policyDocs.tests.some((p) => p.includes("v60-kernel-collapse")));

// 8. runtime separation
assertEnforcementRuntimeSeparation();

// 9. orchestrator build-time hooks only
const orchestratorSource = read("lib/selector-core/selector-build-orchestrator.ts");
assert.match(orchestratorSource, /debugObservation\.emit/);
assert.match(orchestratorSource, /unifiedPolicyCheck/);
assert.doesNotMatch(read("lib/selector-core/selector-config-runtime-loader.ts"), /selector-debug-observation/);
assert.doesNotMatch(read("lib/selector-core/selector-decision-engine.ts"), /selector-debug-observation/);
assert.doesNotMatch(read("lib/selector-core/selector-explainability.ts"), /selector-debug-observation/);

// 10. emitter env-gated
__resetDebugObservationForTests();
validatePhase();
assert.equal(debugObservation.list().length, 0);
process.env.SELECTOR_DEBUG_OBSERVATION = "true";
__resetDebugObservationForTests();
validatePhase();
assert.ok(debugObservation.list().some((e) => e.module === "gc-policy"));
unifiedPolicyCheckPhase();
assert.ok(debugObservation.list().some((e) => e.module === "unifiedPolicyCheck"));
delete process.env.SELECTOR_DEBUG_OBSERVATION;
__resetDebugObservationForTests();

// 11. observation modules exist
assert.match(read("lib/selector-core/selector-observation-registry.ts"), /SelectorObservationIndex/);
assert.match(read("lib/selector-core/selector-debug-dsl-engine.ts"), /executeDebugQuery/);
assert.match(read("scripts/selector-debug-query.ts"), /executeDebugQuery/);

console.log("selector-snapshot-v62-observation-debug-dsl.test.ts OK");
