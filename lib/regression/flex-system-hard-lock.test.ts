/**
 * Global Flex System — post-governance hard lock invariants.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  FLEX_IMMUTABLE_INVARIANTS,
  FLEX_HARD_LOCK_RULES,
  FlexSystemHardLockContract,
  resolveFlexSystemState,
  verifyFlexSystemGovernanceContract,
} from "@/lib/ui/flex-system-policy";
import {
  buildFlexSystemAuditReport,
  resolveFlexSystemAuditStatus,
} from "@/lib/ui/responsive-layout-audit";
import {
  FLEX_HARD_LOCK_UPDATE_PROTOCOL,
  FLEX_SYSTEM_ABSOLUTE_FINAL_STATE,
  FLEX_SYSTEM_FREEZE_MODE,
  FLEX_SYSTEM_GOVERNANCE_MODE,
  FLEX_SYSTEM_HARD_LOCK_MODE,
} from "@/lib/ui/flex-system-freeze";
import { getSuggestedSchema } from "@/lib/ui-os/ui-schema";

const ROOT = process.cwd();

assert.equal(FLEX_SYSTEM_ABSOLUTE_FINAL_STATE, true);
assert.equal(FLEX_SYSTEM_HARD_LOCK_MODE, FLEX_SYSTEM_ABSOLUTE_FINAL_STATE);
assert.equal(FLEX_SYSTEM_GOVERNANCE_MODE, FLEX_SYSTEM_ABSOLUTE_FINAL_STATE);
assert.equal(FLEX_SYSTEM_FREEZE_MODE, FLEX_SYSTEM_ABSOLUTE_FINAL_STATE);

assert.equal(Object.isFrozen(FLEX_IMMUTABLE_INVARIANTS), true);
assert.equal(Object.keys(FLEX_IMMUTABLE_INVARIANTS).length, 3);

assert.ok(FLEX_HARD_LOCK_RULES.length >= 9);
assert.equal(FlexSystemHardLockContract.hardLockMode, true);
assert.deepEqual([...FLEX_HARD_LOCK_UPDATE_PROTOCOL], [
  "FLEX_BASELINE_APPROVED=1",
  "npm run flex:baseline:generate",
  "CI: flex:eslint:gate + flex:freeze:gate",
  "release-gate PASS",
]);

const contract = verifyFlexSystemGovernanceContract();
assert.equal(contract.valid, true, contract.errors.join("; "));

assert.equal(resolveFlexSystemState(getSuggestedSchema("/lavorazioni")), "SAFE");
assert.equal(resolveFlexSystemState(getSuggestedSchema("/report")), "SAFE");

assert.equal(resolveFlexSystemAuditStatus({ runtimeUnsafe: 0, hasPageOverflow: false }), "OK");
assert.equal(resolveFlexSystemAuditStatus({ runtimeUnsafe: 2, hasPageOverflow: false }), "WARNING");
assert.equal(resolveFlexSystemAuditStatus({ runtimeUnsafe: 0, hasPageOverflow: true }), "BLOCKED");

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

const freezeGate = fs.readFileSync(path.join(ROOT, "scripts/flex-freeze-gate.ts"), "utf8");
assert.match(freezeGate, /Flex system absolute final gate/);
assert.match(freezeGate, /verifyFlexSystemAbsoluteFinalState/);
assert.match(freezeGate, /FLEX_SYSTEM_ABSOLUTE_FINAL_STATE/);

const uiOsDecision = fs.readFileSync(path.join(ROOT, "lib/ui-os/ui-render-decision.ts"), "utf8");
const flexGateIdx = uiOsDecision.indexOf("validateFlexSystemPolicy");
const driftGateIdx = uiOsDecision.indexOf("shadowReport.driftScore > DRIFT_BLOCK_THRESHOLD");
assert.ok(flexGateIdx > 0 && driftGateIdx > flexGateIdx, "flex gate must precede drift gate");

console.log("flex-system-hard-lock.test.ts OK");
