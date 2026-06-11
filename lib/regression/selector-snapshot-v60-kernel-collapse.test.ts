/**
 * v6.0 deterministic kernel collapse — unified policy check + canonical artifacts.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  computeRulesetHash,
  deriveConvergenceReport,
  extractRuntimeSnapshotDescriptor,
  getCanonicalEnforcementRuleset,
  RULESET_VERSION,
} from "@/lib/selector-core/selector-enforcement-ruleset";
import { runUnifiedPolicyCheck } from "@/lib/selector-core/selector-api-usage-enforcer";
import {
  computeCanonicalArtifacts,
  readRuntimeSnapshotHash,
} from "@/lib/selector-core/selector-system-canonical-artifacts";
import { assertEnforcementRuntimeSeparation } from "@/lib/selector-core/selector-enforcement-boundary-guard";
import { SELECTOR_BUILD_PHASE_ORDER } from "@/lib/selector-core/selector-build-orchestrator";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function collectSourceFiles(dir: string, acc: string[] = []): string[] {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return acc;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const rel = path.join(dir, entry.name).replace(/\\/g, "/");
    if (entry.isDirectory()) {
      collectSourceFiles(rel, acc);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      acc.push(rel);
    }
  }
  return acc;
}

function assertNoFingerprintJsonReferences(): void {
  const hits: string[] = [];
  for (const rel of collectSourceFiles("lib/selector-core")) {
    const source = read(rel);
    if (source.includes("selector-policy-convergence.fingerprint")) {
      hits.push(rel);
    }
  }
  assert.equal(hits.length, 0, `fingerprint JSON referenced in: ${hits.join(", ")}`);
}

// 1. Baseline unified policy check
const unified = runUnifiedPolicyCheck({ mode: "STRICT_CI" });
assert.equal(unified.shouldFail, false);
assert.ok(unified.enforcementReport);
assert.ok(unified.convergenceReport);
assert.ok(unified.canonicalArtifacts);
assert.equal(unified.convergenceReport.isConverged, true);

// 2. Canonical artifacts deterministic
const artifactsA = computeCanonicalArtifacts({
  rulesetHash: unified.convergenceReport.rulesetHash,
  runtimeExportFingerprint: unified.convergenceReport.runtimeExportFingerprint,
  enforcementReport: unified.enforcementReport,
  convergenceReport: unified.convergenceReport,
  runtimeSnapshotHash: unified.canonicalArtifacts.runtimeSnapshotHash,
});
const artifactsB = computeCanonicalArtifacts({
  rulesetHash: unified.convergenceReport.rulesetHash,
  runtimeExportFingerprint: unified.convergenceReport.runtimeExportFingerprint,
  enforcementReport: unified.enforcementReport,
  convergenceReport: unified.convergenceReport,
  runtimeSnapshotHash: unified.canonicalArtifacts.runtimeSnapshotHash,
});
assert.deepEqual(artifactsA, artifactsB);
assert.equal(typeof readRuntimeSnapshotHash(), "string");

// 3. deriveConvergenceReport — mock drift → HIGH
const ruleset = getCanonicalEnforcementRuleset();
const indexSource = read("lib/selector-core/index.ts");
const driftIndex =
  indexSource + '\nexport { routeCausalExplanation } from "@/lib/selector-core/x";';
const driftDescriptor = extractRuntimeSnapshotDescriptor(driftIndex);
const driftReport = deriveConvergenceReport(
  ruleset,
  driftDescriptor,
  unified.enforcementReport,
);
assert.equal(driftReport.severity, "HIGH");
assert.ok(driftReport.driftPoints.some((p) => p.includes("routeCausalExplanation")));

// 4. No fingerprint JSON references in codebase
assertNoFingerprintJsonReferences();

// 5. Pipeline contains unifiedPolicyCheck, not separate enforcement phases as active order
assert.deepEqual(SELECTOR_BUILD_PHASE_ORDER, [
  "validate",
  "build",
  "sync",
  "verify",
  "unifiedPolicyCheck",
]);
const orchestratorSource = read("lib/selector-core/selector-build-orchestrator.ts");
assert.match(orchestratorSource, /unifiedPolicyCheckPhase/);
assert.doesNotMatch(orchestratorSource, /writeConvergenceFingerprint/);

// 6. Runtime separation intact
assertEnforcementRuntimeSeparation();

// 7. Ruleset version v6.0
assert.equal(RULESET_VERSION, "v6.0");
assert.equal(computeRulesetHash(), unified.canonicalArtifacts.rulesetHash);

// 8. Canonical artifacts module exists; convergence inlined in enforcer
assert.match(read("lib/selector-core/selector-system-canonical-artifacts.ts"), /computeCanonicalArtifacts/);
const enforcerSource = read("lib/selector-core/selector-api-usage-enforcer.ts");
assert.match(enforcerSource, /deriveConvergenceReport/);
assert.match(enforcerSource, /runPolicyRuntimeConvergenceCheck/);
assert.doesNotMatch(enforcerSource, /writeConvergenceFingerprint/);

console.log("selector-snapshot-v60-kernel-collapse.test.ts OK");
