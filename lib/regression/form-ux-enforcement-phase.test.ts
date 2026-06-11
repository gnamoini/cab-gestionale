/**
 * Enforcement policy matrix — phases 1–4 and downgrade safety.
 */
import assert from "node:assert/strict";
import {
  evaluateBoundaryPolicy,
  getFormUxBoundaryPhase,
  setFormUxBoundaryPhaseForTests,
} from "@/lib/form-ux-migration/form-ux-enforcement-policy";

function resetAll(): void {
  setFormUxBoundaryPhaseForTests(null);
}

resetAll();

assert.equal(getFormUxBoundaryPhase(), 2);

setFormUxBoundaryPhaseForTests(1);
assert.equal(
  evaluateBoundaryPolicy({
    operation: "submit",
    formId: "ricambio",
    interceptedPath: "test",
    isLegacyBypass: true,
  }).action,
  "passive",
);

setFormUxBoundaryPhaseForTests(2);
assert.equal(
  evaluateBoundaryPolicy({
    operation: "evaluation",
    formId: "ricambio",
    interceptedPath: "test",
    isLegacyBypass: true,
  }).action,
  "warn",
);

setFormUxBoundaryPhaseForTests(3);
const unregistered = evaluateBoundaryPolicy({
  operation: "submit",
  formId: "unknown-form" as "ricambio",
  interceptedPath: "test",
  isLegacyBypass: false,
});
assert.equal(unregistered.allowLegacy, false);
assert.equal(unregistered.requireRegistry, true);

setFormUxBoundaryPhaseForTests(4);
assert.equal(
  evaluateBoundaryPolicy({
    operation: "rollback_dispatch",
    formId: "ricambio",
    interceptedPath: "test",
    isLegacyBypass: true,
  }).action,
  "block",
);

setFormUxBoundaryPhaseForTests(2);
assert.equal(getFormUxBoundaryPhase(), 2);

resetAll();
console.log("form-ux-enforcement-phase.test.ts OK");
