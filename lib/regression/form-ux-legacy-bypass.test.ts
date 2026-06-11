/**
 * Legacy bypass detection — warn phase 2, redirect phase 3.
 */
import assert from "node:assert/strict";
import {
  setFormUxBoundaryPhaseForTests,
} from "@/lib/form-ux-migration/form-ux-enforcement-policy";
import {
  recordLegacyBypassAttempt,
  resetFormUxLegacyGuard,
} from "@/lib/form-ux-migration/form-ux-legacy-guard";
import {
  clearFormUxMigrationEvents,
  getFormUxBoundaryViolationEvents,
} from "@/lib/form-ux-migration/telemetry";

function resetAll(): void {
  resetFormUxLegacyGuard();
  clearFormUxMigrationEvents();
  setFormUxBoundaryPhaseForTests(null);
}

resetAll();

setFormUxBoundaryPhaseForTests(2);
const warnAction = recordLegacyBypassAttempt({
  path: "direct_resolveFormSubmitPayload",
  formId: "ricambio",
});
assert.equal(warnAction, "warn");
assert.equal(getFormUxBoundaryViolationEvents().length, 1);
assert.equal(getFormUxBoundaryViolationEvents()[0]!.violationType, "direct_submit_bypass");

clearFormUxMigrationEvents();
setFormUxBoundaryPhaseForTests(3);
const redirectAction = recordLegacyBypassAttempt({
  path: "direct_atomicRolloutTransaction",
  formId: "ricambio",
});
assert.equal(redirectAction, "redirect");

setFormUxBoundaryPhaseForTests(4);
const blockAction = recordLegacyBypassAttempt({
  path: "direct_executeRolloutRollback",
  formId: "ricambio",
});
assert.equal(blockAction, "block");

resetAll();
console.log("form-ux-legacy-bypass.test.ts OK");
