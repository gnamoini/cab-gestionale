/**
 * Auto-rollback engine — signal-only evaluation + executor integration.
 */
import assert from "node:assert/strict";
import {
  detectIosFocusBlurLoop,
  evaluateAutoRollback,
  recordAutoRollbackEvaluation,
  recordFieldBlurEvent,
  recordFieldChangeEvent,
  resetAutoRollbackEngine,
} from "@/lib/form-ux-migration/auto-rollback-engine";
import {
  recordEnforcementEvaluation,
  recordSubmitDivergenceMetrics,
  resetEnforcementGuardrails,
} from "@/lib/form-ux-migration/enforcement-guardrails";
import {
  clearRolloutStateStore,
  readRolloutState,
} from "@/lib/form-ux-migration/rollout-state-store";
import {
  clearFormUxMigrationEvents,
  getFormUxMigrationEvents,
} from "@/lib/form-ux-migration/telemetry";

function resetAll(): void {
  resetAutoRollbackEngine();
  resetEnforcementGuardrails();
  clearRolloutStateStore();
  clearFormUxMigrationEvents();
}

resetAll();

// 5%+ mismatch in short window → signal triggered
for (let i = 0; i < 5; i++) {
  recordAutoRollbackEvaluation("ricambio", "test-field", true);
}
const mismatchEval = evaluateAutoRollback({
  formId: "ricambio",
  fieldId: "test-field",
  kind: "number",
  currentState: "warn",
});
assert.equal(mismatchEval.triggered, true);
assert.equal(mismatchEval.reason, "mismatch_rate");

resetAll();

// recordEnforcementEvaluation delegates rollback to executor → off in store
for (let i = 0; i < 11; i++) {
  recordEnforcementEvaluation("ricambio", "test-field", true, "warn", "number");
}
assert.equal(readRolloutState("ricambio", "test-field"), "off");
assert.ok(
  getFormUxMigrationEvents().some((e) => e.eventType === "AUTO_ROLLBACK_TRIGGERED"),
);

resetAll();

// Submit divergence metrics → evaluateAutoRollback signal
for (let i = 0; i < 3; i++) {
  recordSubmitDivergenceMetrics("ricambio", "div-field", true);
}
const divEval = evaluateAutoRollback({
  formId: "ricambio",
  fieldId: "div-field",
  kind: "number",
  currentState: "hard-ssot",
});
assert.equal(divEval.triggered, true);
assert.equal(divEval.reason, "submit_divergence");

resetAll();

// iOS focus/blur loop without change
for (let i = 0; i < 4; i++) {
  recordFieldBlurEvent("ricambio", "ios-field");
}
assert.equal(detectIosFocusBlurLoop("ricambio", "ios-field"), true);

recordFieldChangeEvent("ricambio", "ios-field");
assert.equal(detectIosFocusBlurLoop("ricambio", "ios-field"), false);

resetAutoRollbackEngine();
for (let i = 0; i < 4; i++) {
  recordFieldBlurEvent("ricambio", "ios-field");
}
assert.equal(
  evaluateAutoRollback({
    formId: "ricambio",
    fieldId: "ios-field",
    kind: "number",
    currentState: "warn",
  }).triggered,
  true,
);

resetAll();

console.log("auto-rollback-engine.test.ts OK");
