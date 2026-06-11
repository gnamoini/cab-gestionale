/**
 * v5.8 policy decoupling — dual-mode enforcement + runtime/policy separation.
 * v6.0 — unifiedPolicyCheckPhase replaces standalone apiEnforcementPhase in active pipeline.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  buildApiEnforcerReport,
  type ImportViolation,
} from "@/lib/selector-core/selector-api-enforcer-report";
import {
  resolveEnforcerMode,
  runApiEnforcement,
  runUnifiedPolicyCheck,
} from "@/lib/selector-core/selector-api-usage-enforcer";
import {
  __resetLegacyShimCountsForTests,
  getLegacyShimSeverity,
  warnLegacyShimImport,
} from "@/lib/selector-core/selector-api-surface-registry";
import { assertEnforcementRuntimeSeparation } from "@/lib/selector-core/selector-enforcement-boundary-guard";
import { unifiedPolicyCheckPhase } from "@/lib/selector-core/selector-build-orchestrator";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

// 1. Default local mode is ADVISORY_DEV (explicit override for deterministic test)
assert.equal(resolveEnforcerMode("ADVISORY_DEV"), "ADVISORY_DEV");
assert.equal(resolveEnforcerMode("STRICT_CI"), "STRICT_CI");

// 2. ADVISORY never sets shouldFail on clean tree
const advisoryReport = runApiEnforcement({ mode: "ADVISORY_DEV" });
assert.equal(advisoryReport.shouldFail, false);
assert.ok(Array.isArray(advisoryReport.internalUsage));

// 3. STRICT_CI on clean tree passes
const strictReport = runApiEnforcement({ mode: "STRICT_CI" });
assert.equal(strictReport.shouldFail, false);
assert.equal(strictReport.violations.length, 0);
assert.equal(strictReport.barrelViolations.length, 0);

// 4. Simulated barrel violation: STRICT fails, ADVISORY does not
const mockBarrelViolation = buildApiEnforcerReport({
  mode: "STRICT_CI",
  violations: [],
  internalUsage: [],
  legacyShimUsage: [],
  safeBypassCandidates: [],
  barrelViolations: ["routeCausalExplanation"],
});
assert.equal(mockBarrelViolation.shouldFail, true);

const mockAdvisoryBarrel = buildApiEnforcerReport({
  mode: "ADVISORY_DEV",
  violations: [],
  internalUsage: [],
  legacyShimUsage: [],
  safeBypassCandidates: [],
  barrelViolations: ["routeCausalExplanation"],
});
assert.equal(mockAdvisoryBarrel.shouldFail, false);

// 5. Runtime / enforcer separation
assertEnforcementRuntimeSeparation();

// 6. unifiedPolicyCheckPhase advisory-safe (does not touch snapshot artifacts)
const phase = unifiedPolicyCheckPhase();
assert.equal(phase.phase, "unifiedPolicyCheck");
assert.equal(phase.ok, true);
assert.ok(phase.result?.report);
assert.doesNotMatch(
  read("lib/selector-core/selector-build-orchestrator.ts"),
  /unifiedPolicyCheckPhase[\s\S]{0,400}validateSnapshot/,
);

// 7. Shim severity scaling (>10 → fail severity, STRICT shouldFail when aggregated)
__resetLegacyShimCountsForTests();
for (let i = 0; i < 11; i++) {
  warnLegacyShimImport("selector-unified-causal-index");
}
assert.equal(getLegacyShimSeverity("selector-unified-causal-index"), "fail");

const shimFailReport = buildApiEnforcerReport({
  mode: "STRICT_CI",
  violations: [],
  internalUsage: [],
  legacyShimUsage: [],
  safeBypassCandidates: [],
  barrelViolations: [],
});
assert.equal(shimFailReport.shouldFail, true);

const shimAdvisoryReport = buildApiEnforcerReport({
  mode: "ADVISORY_DEV",
  violations: [],
  internalUsage: [],
  legacyShimUsage: [],
  safeBypassCandidates: [],
  barrelViolations: [],
});
assert.equal(shimAdvisoryReport.shouldFail, false);

__resetLegacyShimCountsForTests();

// 8. External real violation classified correctly
const externalViolation: ImportViolation = {
  file: "components/example.tsx",
  importPath: "@/lib/selector-core/selector-core-causal-model",
  matchedForbidden: "selector-core-causal-model",
};
const externalStrict = buildApiEnforcerReport({
  mode: "STRICT_CI",
  violations: [externalViolation],
  internalUsage: [],
  legacyShimUsage: [],
  safeBypassCandidates: [],
  barrelViolations: [],
});
assert.equal(externalStrict.shouldFail, true);

// 9. New modules present + v6.0 unified check
assert.match(read("lib/selector-core/selector-enforcement-ruleset.ts"), /computeRulesetHash/);
assert.match(read("lib/selector-core/selector-api-usage-enforcer.ts"), /isAllowedInternalLegacyImport/);
assert.match(read("lib/selector-core/selector-api-enforcer-report.ts"), /safeBypassCandidates/);
assert.match(read("lib/selector-core/selector-build-orchestrator.ts"), /unifiedPolicyCheckPhase/);
assert.match(read("lib/selector-core/selector-distributed-checkpoint-manager.ts"), /unifiedPolicyCheck/);
assert.equal(runUnifiedPolicyCheck({ mode: "STRICT_CI" }).shouldFail, false);

console.log("selector-snapshot-v58-policy-decoupling.test.ts OK");
