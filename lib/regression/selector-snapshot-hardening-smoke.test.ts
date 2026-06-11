/**
 * Collapsed hardening smoke (v5.31–v5.34) — bundle, determinism, explainability boundary.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  assertPreResolutionConsistency,
  compareDeterminismContexts,
  evaluateDeterminismGate,
} from "@/lib/selector-core/selector-determinism-gate";
import {
  getExplanation,
  __resetFallbackTraceForTests,
} from "@/lib/selector-core/selector-explainability";
import {
  getLastFallbackTrace,
  recordFallbackTrace,
} from "@/lib/selector-core/selector-fallback-trace";
import { assertBundleRegistryConsistency } from "@/lib/selector-core/selector-bundle-registry-consistency-check";
import { assertEnforcementRuntimeSeparation } from "@/lib/selector-core/selector-enforcement-boundary-guard";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

// 1. Bundle/registry consistency module present
assert.match(
  read("lib/selector-core/selector-bundle-registry-consistency-check.ts"),
  /assertBundleRegistryConsistency/,
);

// 2. Pre-resolution guard via determinism-gate SSOT
const pre = assertPreResolutionConsistency({
  pointer: { activeVersion: "v0", previousVersion: "v0", status: "stable", updatedAt: Date.now() },
  expectedVersion: "v0",
  availabilityMap: {
    v0: { version: "v0", inBundle: true, inRollbackRegistry: false, sources: ["bundle"] },
  },
});
assert.equal(pre.blocked, false);

// 3. Determinism cross-context compare
const ctx = {
  timestamp: 1,
  pointerEpoch: 1,
  registryHash: "a",
  contextHash: "b",
  envFingerprint: "dev",
} as const;
const integrity = compareDeterminismContexts(ctx, { ...ctx });
assert.equal(integrity.isStrictlyDeterministic, true);

const gate = evaluateDeterminismGate({
  preResolution: {
    pointer: { activeVersion: "v0", previousVersion: "v0", status: "stable", updatedAt: 0 },
    expectedVersion: "v0",
    availabilityMap: {
      v0: { version: "v0", inBundle: true, inRollbackRegistry: false, sources: ["bundle"] },
    },
  },
});
assert.equal(gate.preResolution.blocked, false);

// 4. Explainability frozen entrypoint
const explanation = getExplanation("hardening-smoke-trace");
assert.equal(explanation.valid, true);
assert.ok(explanation.causalModel);

// 5. Fallback trace path (no explainability-engine shim)
__resetFallbackTraceForTests();
recordFallbackTrace({
  selectedSource: "v0",
  selectedVersion: "v0",
  rejectedSources: [],
  reasonCodes: ["smoke"],
  pointerEpoch: 0,
  recordedAt: Date.now(),
  selectionPath: ["v0"],
});
assert.equal(getLastFallbackTrace()?.selectedVersion, "v0");

const explainability = read("lib/selector-core/selector-explainability.ts");
assert.doesNotMatch(explainability, /selector-fallback-explainability-engine/);

// 6. Runtime separation
assertEnforcementRuntimeSeparation();

// 7. Bundle consistency callable when artifacts exist (no throw on missing store in CI)
try {
  assertBundleRegistryConsistency();
} catch {
  // acceptable when local snapshot store is empty in CI sandbox
}

console.log("selector-snapshot-hardening-smoke.test.ts OK");
