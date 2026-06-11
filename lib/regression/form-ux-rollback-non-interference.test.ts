/**
 * Rollback non-interference — deferred during transaction; submit payload unchanged.
 */
import assert from "node:assert/strict";
import { atomicFormSubmitTransaction } from "@/lib/form-ux-migration/atomic-rollout-transaction";
import { resetEnforcementGuardrails } from "@/lib/form-ux-migration/enforcement-guardrails";
import {
  beginSubmitTransaction,
  resetFormUxExecutionTokens,
} from "@/lib/form-ux-migration/form-ux-execution-token";
import {
  clearAllFormUxFieldRegistries,
  registerFormUxFieldSnapshot,
} from "@/lib/form-ux-migration/form-ux-field-registry";
import { FORM_UX_ROLLOUT } from "@/lib/form-ux-migration/rollout-config";
import {
  executeRolloutRollback,
  resetDeferredRolloutQueue,
} from "@/lib/form-ux-migration/rollout-rollback-executor";
import {
  isRolloutTransactionActive,
  resetRolloutStateLocks,
  withRolloutStateLock,
} from "@/lib/form-ux-migration/rollout-state-lock";
import {
  clearRolloutStateStore,
  readRolloutState,
  writeRolloutState,
} from "@/lib/form-ux-migration/rollout-state-store";

const originalPilot = FORM_UX_ROLLOUT.ricambio.fields["prezzo-listino"];

function resetAll(): void {
  resetEnforcementGuardrails();
  resetFormUxExecutionTokens();
  resetRolloutStateLocks();
  resetDeferredRolloutQueue();
  clearRolloutStateStore();
  clearAllFormUxFieldRegistries();
  FORM_UX_ROLLOUT.ricambio.fields["prezzo-listino"] = originalPilot!;
}

resetAll();

FORM_UX_ROLLOUT.ricambio.fields["prezzo-listino"] = {
  ...originalPilot!,
  enforcement: "hard-ssot",
  submitPrecedence: "ssot-wins",
};
writeRolloutState("ricambio", "prezzo-listino", "hard-ssot");

registerFormUxFieldSnapshot("ricambio", "prezzo-listino", {
  legacy: "10",
  ssot: "12.5",
  normalizedLegacy: "10",
  normalizedSsot: "12.5",
});

const token = beginSubmitTransaction("ricambio");
const legacyState = { prezzoFornitoreOriginale: "10", marca: "X" };

const result = atomicFormSubmitTransaction({
  formId: "ricambio",
  token,
  legacyState,
  reportDivergences: () => {},
});

assert.ok(result.ok);
assert.equal(result.value?.payload.prezzoFornitoreOriginale, "12.5");

let deferredDuringLock = false;
withRolloutStateLock("ricambio", "prezzo-listino", () => {
  assert.ok(isRolloutTransactionActive("ricambio", "prezzo-listino"));
  executeRolloutRollback({
    formId: "ricambio",
    fieldId: "prezzo-listino",
    kind: "number",
    currentState: "hard-ssot",
    fromState: "hard-ssot",
    action: "downgrade_one",
    reason: "enforcement_downgrade",
    rollbackReason: "test_defer",
  });
  deferredDuringLock = readRolloutState("ricambio", "prezzo-listino") === "hard-ssot";
});

assert.ok(deferredDuringLock);

resetAll();
console.log("form-ux-rollback-non-interference.test.ts OK");
