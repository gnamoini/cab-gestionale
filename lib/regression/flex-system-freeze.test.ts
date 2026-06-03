/**
 * Global Flex System — production freeze layer invariants.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  computeFlexBaselineChecksum,
  verifyFlexBaselineIntegrity,
  type FlexBaselineFile,
} from "@/lib/lint/flex-baseline-fingerprint";
import { scanFlexViolations } from "@/lib/lint/scan-flex-violations";
import {
  FLEX_BASELINE_PATH,
  FLEX_FREEZE_MANIFEST_PATH,
  FLEX_SYSTEM_ABSOLUTE_FINAL_STATE,
  FLEX_SYSTEM_FREEZE_MODE,
  FLEX_SYSTEM_GOVERNANCE_MODE,
  FLEX_SYSTEM_HARD_LOCK_MODE,
} from "@/lib/ui/flex-system-freeze";
import {
  buildFlexFreezeManifest,
  verifyFlexFreezeManifest,
  type FlexFreezeManifest,
} from "@/lib/ui/flex-freeze-manifest";

const ROOT = process.cwd();

assert.equal(FLEX_SYSTEM_ABSOLUTE_FINAL_STATE, true);
assert.equal(FLEX_SYSTEM_HARD_LOCK_MODE, FLEX_SYSTEM_ABSOLUTE_FINAL_STATE);
assert.equal(FLEX_SYSTEM_GOVERNANCE_MODE, FLEX_SYSTEM_ABSOLUTE_FINAL_STATE);
assert.equal(FLEX_SYSTEM_FREEZE_MODE, FLEX_SYSTEM_ABSOLUTE_FINAL_STATE);

const baselinePath = path.join(ROOT, FLEX_BASELINE_PATH);
assert.ok(fs.existsSync(baselinePath));
const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8")) as FlexBaselineFile;

const integrity = verifyFlexBaselineIntegrity(baseline);
assert.equal(integrity.valid, true, integrity.errors.join("; "));

assert.equal(baseline.entryCount, baseline.entries.length);
assert.equal(baseline.checksum, computeFlexBaselineChecksum(baseline.entries));

const manifestPath = path.join(ROOT, FLEX_FREEZE_MANIFEST_PATH);
assert.ok(fs.existsSync(manifestPath));
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as FlexFreezeManifest;

const manifestCheck = verifyFlexFreezeManifest(manifest, baseline);
assert.equal(manifestCheck.valid, true, manifestCheck.errors.join("; "));

assert.equal(manifest.baselineChecksum, baseline.checksum);

assert.deepEqual(buildFlexFreezeManifest(baseline), {
  ...manifest,
  governanceVersion: 1,
  freezeVersion: 1,
});

const current = scanFlexViolations(ROOT);
assert.equal(current.length, baseline.entryCount, "scan count must match frozen baseline");

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
assert.ok(pkg.scripts["flex:freeze:gate"]);
assert.ok(pkg.scripts["flex:eslint:gate"]);

const releaseGate = fs.readFileSync(path.join(ROOT, "scripts/release-gate.ts"), "utf8");
assert.match(releaseGate, /flex:eslint:gate/);
assert.match(releaseGate, /flex:freeze:gate/);

const workflow = fs.readFileSync(path.join(ROOT, ".github/workflows/release-gate.yml"), "utf8");
assert.match(workflow, /flex:eslint:gate/);
assert.match(workflow, /flex:freeze:gate/);

import { UI_OS_FLEX_INTEGRATION, validateFlexSystemPolicy } from "@/lib/ui/flex-system-policy";
import { getSuggestedSchema } from "@/lib/ui-os/ui-schema";

assert.deepEqual([...UI_OS_FLEX_INTEGRATION.validationOrder], ["schema", "contract", "flex", "drift"]);
assert.equal(validateFlexSystemPolicy(getSuggestedSchema("/lavorazioni")).safe, true);

const uiOsDecision = fs.readFileSync(path.join(ROOT, "lib/ui-os/ui-render-decision.ts"), "utf8");
const flexGateIdx = uiOsDecision.indexOf("validateFlexSystemPolicy");
const driftGateIdx = uiOsDecision.indexOf("shadowReport.driftScore > DRIFT_BLOCK_THRESHOLD");
assert.ok(flexGateIdx > 0 && driftGateIdx > flexGateIdx, "flex gate must precede drift gate");

console.log("flex-system-freeze.test.ts OK");
