/**
 * Global Flex System — absolute final state invariants.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  FLEX_ABSOLUTE_FINAL_RULES,
  FLEX_HARD_LOCK_RULES_FROZEN,
  FLEX_IMMUTABLE_INVARIANTS,
  FlexSystemAbsoluteFinalContract,
  resolveFlexSystemState,
  verifyFlexSystemAbsoluteFinalState,
} from "@/lib/ui/flex-system-policy";
import { buildFlexSystemAuditReport } from "@/lib/ui/responsive-layout-audit";
import {
  FLEX_CLOSED_GOVERNANCE_LOOP,
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
assert.equal(Object.isFrozen(FLEX_HARD_LOCK_RULES_FROZEN), true);
assert.equal(FLEX_HARD_LOCK_RULES_FROZEN.length, 13);

assert.ok(FLEX_ABSOLUTE_FINAL_RULES.length > FLEX_HARD_LOCK_RULES_FROZEN.length);
assert.equal(FlexSystemAbsoluteFinalContract.absoluteFinalState, true);
assert.deepEqual([...FLEX_CLOSED_GOVERNANCE_LOOP], [
  "FLEX_BASELINE_APPROVED=1",
  "npm run flex:baseline:generate",
  "CI: flex:eslint:gate + flex:freeze:gate",
  "release-gate PASS",
]);

const finalState = verifyFlexSystemAbsoluteFinalState();
assert.equal(finalState.valid, true, finalState.errors.join("; "));

assert.equal(resolveFlexSystemState(getSuggestedSchema("/lavorazioni")), "SAFE");

const report = buildFlexSystemAuditReport({
  pathname: "/lavorazioni",
  hasPageOverflow: false,
  findings: [],
});
assert.equal(report.mode, "hard-lock");
assert.match(report.baselineLabel, /^frozen \(\d+ entries\)$/);

const freezeGate = fs.readFileSync(path.join(ROOT, "scripts/flex-freeze-gate.ts"), "utf8");
assert.match(freezeGate, /Flex system absolute final gate/);
assert.match(freezeGate, /verifyFlexSystemAbsoluteFinalState/);
assert.match(freezeGate, /FLEX_SYSTEM_ABSOLUTE_FINAL_STATE/);

const uiOsDecision = fs.readFileSync(path.join(ROOT, "lib/ui-os/ui-render-decision.ts"), "utf8");
const flexGateIdx = uiOsDecision.indexOf("validateFlexSystemPolicy");
const driftGateIdx = uiOsDecision.indexOf("shadowReport.driftScore > DRIFT_BLOCK_THRESHOLD");
assert.ok(flexGateIdx > 0 && driftGateIdx > flexGateIdx, "flex gate must precede drift gate");

console.log("flex-system-absolute-final.test.ts OK");
