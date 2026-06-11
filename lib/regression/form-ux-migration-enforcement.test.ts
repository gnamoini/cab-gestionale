/**
 * Form UX Migration — enforcement layer and submit reconciliation tests.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { downgradeEnforcementLevel } from "@/lib/form-ux-migration/enforcement-levels";
import {
  recordEnforcementEvaluation,
  resetEnforcementGuardrails,
} from "@/lib/form-ux-migration/enforcement-guardrails";
import {
  clearAllFormUxFieldRegistries,
  registerFormUxFieldSnapshot,
} from "@/lib/form-ux-migration/form-ux-field-registry";
import { FORM_UX_ROLLOUT } from "@/lib/form-ux-migration/rollout-config";
import { executeRolloutRollback } from "@/lib/form-ux-migration/rollout-rollback-executor";
import { resetRolloutControllerCache } from "@/lib/form-ux-migration/rollout-controller";
import {
  clearRolloutStateStore,
  readRolloutState,
  writeRolloutState,
} from "@/lib/form-ux-migration/rollout-state-store";
import { resolveFieldEnforcement } from "@/lib/form-ux-migration/resolve-field-enforcement";
import { resolveFormSubmitPayload } from "@/lib/form-ux-migration/resolve-form-submit-payload";
import { runEnforcementEvaluation } from "@/lib/form-ux-migration/run-enforcement-evaluation";
import {
  clearFormUxMigrationEvents,
  getFormUxMigrationEvents,
} from "@/lib/form-ux-migration/telemetry";
import { resetShadowEvaluationDedup } from "@/lib/form-ux-migration/run-shadow-evaluation";

const ROOT = process.cwd();

// Module existence
assert.ok(fs.existsSync(path.join(ROOT, "lib/form-ux-migration/enforcement-guardrails.ts")));
assert.ok(fs.existsSync(path.join(ROOT, "lib/form-ux-migration/resolve-form-submit-payload.ts")));
assert.ok(fs.existsSync(path.join(ROOT, "lib/form-ux-migration/rollout-state-store.ts")));
assert.ok(fs.existsSync(path.join(ROOT, "lib/form-ux-migration/rollout-rollback-executor.ts")));
assert.ok(!fs.existsSync(path.join(ROOT, "lib/form-ux-migration/enforcement-rollback-store.ts")));
assert.ok(fs.existsSync(path.join(ROOT, "components/form-ux-migration/use-form-ux-field-evaluation.ts")));

// downgradeEnforcementLevel
assert.equal(downgradeEnforcementLevel("hard-ssot"), "soft-ssot");
assert.equal(downgradeEnforcementLevel("warn"), "off");

// resolveFieldEnforcement for pilot field
const pilot = resolveFieldEnforcement("ricambio", "prezzo-listino");
assert.equal(pilot.enforcement, "warn");
assert.equal(pilot.critical, true);
assert.equal(pilot.stateKey, "prezzoFornitoreOriginale");

// warn enforcement: submit payload unchanged
clearAllFormUxFieldRegistries();
registerFormUxFieldSnapshot("ricambio", "prezzo-listino", {
  legacy: "10",
  ssot: "10.0",
  normalizedLegacy: "10",
  normalizedSsot: "10",
});
const legacyState = { prezzoFornitoreOriginale: "10", marca: "Test" };
const warnResult = resolveFormSubmitPayload("ricambio", legacyState);
assert.equal(warnResult.prezzoFornitoreOriginale, "10");

// hard-ssot: ssot wins on submit (config + stored progression)
const originalRollout = FORM_UX_ROLLOUT.ricambio.fields["prezzo-listino"];
FORM_UX_ROLLOUT.ricambio.fields["prezzo-listino"] = {
  ...originalRollout!,
  enforcement: "hard-ssot",
  submitPrecedence: "ssot-wins",
};
clearRolloutStateStore();
resetRolloutControllerCache();
writeRolloutState("ricambio", "prezzo-listino", "soft-ssot");

clearAllFormUxFieldRegistries();
registerFormUxFieldSnapshot("ricambio", "prezzo-listino", {
  legacy: "10",
  ssot: "12.5",
  normalizedLegacy: "10",
  normalizedSsot: "12.5",
});

const hardResult = resolveFormSubmitPayload("ricambio", {
  prezzoFornitoreOriginale: "10",
});
assert.equal(hardResult.prezzoFornitoreOriginale, "12.5");

const submitEvents = getFormUxMigrationEvents().filter(
  (e) => e.eventType === "submit_reconciliation",
);
assert.ok(submitEvents.length > 0);

FORM_UX_ROLLOUT.ricambio.fields["prezzo-listino"] = originalRollout!;
clearRolloutStateStore();
resetRolloutControllerCache();

// enforcement evaluation with warn
clearFormUxMigrationEvents();
resetShadowEvaluationDedup();
resetEnforcementGuardrails();

const evalResult = runEnforcementEvaluation({
  formId: "ricambio",
  fieldId: "prezzo-listino",
  kind: "number",
  legacyValue: "99",
  trigger: "blur",
});
assert.equal(evalResult.skipped, false);
assert.equal(evalResult.match, true);

const events = getFormUxMigrationEvents();
assert.ok(events.some((e) => e.eventType === "evaluation" && e.enforcement === "warn"));

// ROLLBACK_TRIGGERED via single executor
clearFormUxMigrationEvents();
clearRolloutStateStore();
writeRolloutState("ricambio", "prezzo-listino", "hard-ssot");
executeRolloutRollback({
  formId: "ricambio",
  fieldId: "prezzo-listino",
  kind: "number",
  currentState: "hard-ssot",
  fromState: "hard-ssot",
  action: "downgrade_one",
  reason: "enforcement_downgrade",
  rollbackReason: "submit_divergence",
});
assert.ok(
  getFormUxMigrationEvents().some((e) => e.eventType === "ROLLBACK_TRIGGERED"),
);
assert.equal(readRolloutState("ricambio", "prezzo-listino"), "soft-ssot");

// high mismatch rate triggers auto-rollback to off via executor
resetEnforcementGuardrails();
clearRolloutStateStore();
for (let i = 0; i < 11; i++) {
  recordEnforcementEvaluation("ricambio", "test-field", true, "hard-ssot", "number");
}
assert.equal(readRolloutState("ricambio", "test-field"), "off");

// ricambio-new-modal uses resolveFormSubmitPayload
const ricambioModal = fs.readFileSync(
  path.join(ROOT, "components/gestionale/magazzino/ricambio-new-modal.tsx"),
  "utf8",
);
assert.match(ricambioModal, /gateBeginSubmit\("ricambio"\)/);
assert.match(ricambioModal, /gateFormSubmit\("ricambio", currentDraft, submitToken\)/);
assert.match(ricambioModal, /data-form-ux-id="ricambio"/);
assert.match(ricambioModal, /ricambioFormImportantWarnings\(reconciledDraft\)/);

console.log("form-ux-migration-enforcement.test.ts OK");
