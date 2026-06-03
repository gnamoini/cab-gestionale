/**
 * Global Flex System — governance mode invariants.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  verifyFlexBaselineIntegrity,
  type FlexBaselineFile,
} from "@/lib/lint/flex-baseline-fingerprint";
import {
  FLEX_IMMUTABLE_INVARIANTS,
  FLEX_GOVERNANCE_RULES,
  UI_OS_GOVERNANCE_CONTRACT,
  FlexSystemGovernanceContract,
} from "@/lib/ui/flex-system-policy";
import {
  buildFlexSystemAuditReport,
  resolveFlexSystemAuditStatus,
} from "@/lib/ui/responsive-layout-audit";
import {
  FLEX_BASELINE_PATH,
  FLEX_FREEZE_MANIFEST_PATH,
  FLEX_GOVERNANCE_UPDATE_STEPS,
  FLEX_SYSTEM_ABSOLUTE_FINAL_STATE,
  FLEX_SYSTEM_FREEZE_MODE,
  FLEX_SYSTEM_GOVERNANCE_MODE,
  FLEX_SYSTEM_HARD_LOCK_MODE,
} from "@/lib/ui/flex-system-freeze";
import { verifyFlexFreezeManifest, type FlexFreezeManifest } from "@/lib/ui/flex-freeze-manifest";

const ROOT = process.cwd();

assert.equal(FLEX_SYSTEM_ABSOLUTE_FINAL_STATE, true);
assert.equal(FLEX_SYSTEM_HARD_LOCK_MODE, FLEX_SYSTEM_ABSOLUTE_FINAL_STATE);
assert.equal(FLEX_SYSTEM_GOVERNANCE_MODE, FLEX_SYSTEM_ABSOLUTE_FINAL_STATE);
assert.equal(FLEX_SYSTEM_FREEZE_MODE, FLEX_SYSTEM_ABSOLUTE_FINAL_STATE);

assert.equal(FLEX_IMMUTABLE_INVARIANTS.baseline, FLEX_BASELINE_PATH);
assert.equal(FLEX_IMMUTABLE_INVARIANTS.manifest, FLEX_FREEZE_MANIFEST_PATH);
assert.equal(FLEX_IMMUTABLE_INVARIANTS.allowlist, "FLEX_OVERFLOW_ALLOWLIST");
assert.equal(Object.keys(FLEX_IMMUTABLE_INVARIANTS).length, 3);

assert.ok(FLEX_GOVERNANCE_RULES.length >= 5);
assert.equal(FlexSystemGovernanceContract.governanceMode, true);
assert.deepEqual([...FLEX_GOVERNANCE_UPDATE_STEPS], [
  "FLEX_BASELINE_APPROVED=1",
  "npm run flex:baseline:generate",
  "CI: flex:eslint:gate + flex:freeze:gate",
  "release-gate PASS",
]);

assert.equal(UI_OS_GOVERNANCE_CONTRACT.flexUnsafeForcesLegacy, true);
assert.equal(UI_OS_GOVERNANCE_CONTRACT.driftCannotBypassFlex, true);
assert.equal(UI_OS_GOVERNANCE_CONTRACT.maxDriftForOsRender, 20);
assert.deepEqual([...UI_OS_GOVERNANCE_CONTRACT.validationOrder], [
  "schema",
  "contract",
  "flex",
  "drift",
]);

const baseline = JSON.parse(
  fs.readFileSync(path.join(ROOT, FLEX_BASELINE_PATH), "utf8"),
) as FlexBaselineFile;
const integrity = verifyFlexBaselineIntegrity(baseline);
assert.equal(integrity.valid, true, integrity.errors.join("; "));

const manifest = JSON.parse(
  fs.readFileSync(path.join(ROOT, FLEX_FREEZE_MANIFEST_PATH), "utf8"),
) as FlexFreezeManifest;
assert.ok(manifest.baselineChecksum, "manifest must include baselineChecksum");
assert.equal(manifest.baselineChecksum, baseline.checksum);

const manifestCheck = verifyFlexFreezeManifest(manifest, baseline);
assert.equal(manifestCheck.valid, true, manifestCheck.errors.join("; "));

assert.equal(resolveFlexSystemAuditStatus({ runtimeUnsafe: 0, hasPageOverflow: false }), "OK");
assert.equal(resolveFlexSystemAuditStatus({ runtimeUnsafe: 2, hasPageOverflow: false }), "WARNING");
assert.equal(resolveFlexSystemAuditStatus({ runtimeUnsafe: 0, hasPageOverflow: true }), "BLOCKED");
assert.equal(resolveFlexSystemAuditStatus({ runtimeUnsafe: 3, hasPageOverflow: true }), "BLOCKED");

const report = buildFlexSystemAuditReport({
  pathname: "/lavorazioni",
  hasPageOverflow: false,
  findings: [],
});
assert.equal(report.route, "/lavorazioni");
assert.equal(report.mode, "hard-lock");
assert.match(report.baselineLabel, /^frozen \(\d+ entries\)$/);
assert.equal(report.newViolations, 0);
assert.equal(report.status, "OK");

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
assert.ok(pkg.scripts["flex:eslint:gate"]);
assert.ok(pkg.scripts["flex:freeze:gate"]);

const releaseGate = fs.readFileSync(path.join(ROOT, "scripts/release-gate.ts"), "utf8");
assert.match(releaseGate, /flex:eslint:gate/);
assert.match(releaseGate, /flex:freeze:gate/);

const workflow = fs.readFileSync(path.join(ROOT, ".github/workflows/release-gate.yml"), "utf8");
assert.match(workflow, /flex:eslint:gate/);
assert.match(workflow, /flex:freeze:gate/);

const uiOsDecision = fs.readFileSync(path.join(ROOT, "lib/ui-os/ui-render-decision.ts"), "utf8");
const flexGateIdx = uiOsDecision.indexOf("validateFlexSystemPolicy");
const driftGateIdx = uiOsDecision.indexOf("shadowReport.driftScore > DRIFT_BLOCK_THRESHOLD");
assert.ok(flexGateIdx > 0 && driftGateIdx > flexGateIdx, "flex gate must precede drift gate");

console.log("flex-system-governance.test.ts OK");
