/**
 * v5.9 policy–runtime convergence lock — ruleset SSOT + drift detection.
 * v6.0 — updated for unified policy check (no fingerprint JSON artifact).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  computeRulesetHash,
  getCanonicalEnforcementRuleset,
  RULESET_VERSION,
} from "@/lib/selector-core/selector-enforcement-ruleset";
import { getRulesetHash } from "@/lib/selector-core/selector-api-surface-registry";
import { assertEnforcementRuntimeSeparation } from "@/lib/selector-core/selector-enforcement-boundary-guard";
import { unifiedPolicyCheckPhase } from "@/lib/selector-core/selector-build-orchestrator";
import {
  assertUnifiedPolicyCiGate,
  computeRuntimeExportFingerprint,
  extractCognitiveClusterExports,
  runPolicyRuntimeConvergenceCheck,
  runUnifiedPolicyCheck,
  shouldFailConvergenceGate,
} from "@/lib/selector-core/selector-api-usage-enforcer";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

// 1. Ruleset hash deterministic
const hashA = computeRulesetHash();
const hashB = computeRulesetHash();
assert.equal(hashA, hashB);
assert.equal(getRulesetHash(), hashA);
assert.equal(getCanonicalEnforcementRuleset().version, RULESET_VERSION);

// 2. Mirrors derive from ruleset (no duplicate array literals in mirrors)
const registrySource = read("lib/selector-core/selector-api-surface-registry.ts");
const enforcerSource = read("lib/selector-core/selector-api-usage-enforcer.ts");
assert.match(registrySource, /selector-enforcement-ruleset/);
assert.match(enforcerSource, /selector-enforcement-ruleset/);
assert.match(enforcerSource, /isAllowedInternalLegacyImport/);
assert.doesNotMatch(registrySource, /export const ALLOWED_COGNITIVE_CLUSTER_PUBLIC_API = \[/);
assert.doesNotMatch(enforcerSource, /export const ALLOWED_INTERNAL_LEGACY = \[/);

// 3. Baseline convergence on real index via unified check
const unified = runUnifiedPolicyCheck({ mode: "STRICT_CI" });
const baseline = runPolicyRuntimeConvergenceCheck({
  enforcerReport: unified.enforcementReport,
});
assert.equal(baseline.isConverged, true);
assert.notEqual(baseline.severity, "HIGH");
assert.equal(baseline.driftPoints.length, 0);

// 4. Simulated HIGH drift — forbidden barrel export
const driftIndex = read("lib/selector-core/index.ts") + "\nexport { routeCausalExplanation } from \"x\";";
const driftResult = runPolicyRuntimeConvergenceCheck({
  indexSource: driftIndex,
  enforcerReport: unified.enforcementReport,
});
assert.equal(driftResult.severity, "HIGH");
assert.ok(driftResult.driftPoints.some((p) => p.includes("routeCausalExplanation")));

// 5. CI gate baseline passes
const gateResult = assertUnifiedPolicyCiGate({ mode: "STRICT_CI" }).convergenceReport;
assert.equal(gateResult.isConverged, true);
assert.equal(shouldFailConvergenceGate(driftResult), true);
assert.equal(assertUnifiedPolicyCiGate({ mode: "STRICT_CI" }).shouldFail, false);

// 6. unifiedPolicyCheckPhase ok; no runtime loader import in phase module
const phase = unifiedPolicyCheckPhase();
assert.equal(phase.ok, true);
assert.ok(phase.result?.report);
const orchestratorSource = read("lib/selector-core/selector-build-orchestrator.ts");
assert.doesNotMatch(
  orchestratorSource,
  /unifiedPolicyCheckPhase[\s\S]{0,500}validateSnapshotOrThrow/,
);

// 7. Runtime separation intact
assertEnforcementRuntimeSeparation();

// 8. Export fingerprint extracts cluster API from index
const indexSource = read("lib/selector-core/index.ts");
const clusterExports = extractCognitiveClusterExports(indexSource);
assert.ok(clusterExports.includes("getExplanation"));
assert.ok(clusterExports.includes("loadLatestSelectorSnapshot"));
assert.ok(clusterExports.includes("resolveSelectorEngineConfig"));
assert.equal(typeof computeRuntimeExportFingerprint(indexSource), "string");

// 9. v6.0 pipeline — no fingerprint JSON artifact
assert.match(orchestratorSource, /unifiedPolicyCheck/);
assert.doesNotMatch(enforcerSource, /selector-policy-convergence\.fingerprint\.json/);
assert.match(enforcerSource, /runPolicyRuntimeConvergenceCheck/);

console.log("selector-snapshot-v59-policy-runtime-convergence.test.ts OK");
