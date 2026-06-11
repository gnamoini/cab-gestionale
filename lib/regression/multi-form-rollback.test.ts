/**
 * Multi-form rollback — rollback on form A does not affect form B during submit.
 */
import assert from "node:assert/strict";
import {
  coordinateFormScopedRollback,
  canPropagateRollbackAcrossForms,
} from "@/lib/form-ux-migration/cross-form-rollback-coordinator";
import { atomicFormSubmitTransaction } from "@/lib/form-ux-migration/atomic-rollout-transaction";
import {
  beginSubmitTransaction,
  resetFormUxExecutionTokens,
} from "@/lib/form-ux-migration/form-ux-execution-token";
import { resetRolloutStateLocks } from "@/lib/form-ux-migration/rollout-state-lock";
import {
  clearRolloutStateStore,
  readRolloutState,
  writeRolloutState,
} from "@/lib/form-ux-migration/rollout-state-store";
import { clearFormUxMigrationEvents } from "@/lib/form-ux-migration/telemetry";

function resetAll(): void {
  resetFormUxExecutionTokens();
  resetRolloutStateLocks();
  clearRolloutStateStore();
  clearFormUxMigrationEvents();
}

resetAll();

writeRolloutState("ricambio", "prezzo-listino", "hard-ssot");
writeRolloutState("lavorazioni", "qty", "warn");

assert.equal(canPropagateRollbackAcrossForms("ricambio", "lavorazioni"), false);

const lavorazioniBefore = readRolloutState("lavorazioni", "qty");

const ricambioToken = beginSubmitTransaction("ricambio");
const submitResult = atomicFormSubmitTransaction({
  formId: "ricambio",
  token: ricambioToken,
  legacyState: { prezzoFornitoreOriginale: "10", marca: "X" },
  reportDivergences: () => {},
});

assert.ok(submitResult.ok);

coordinateFormScopedRollback({
  formId: "ricambio",
  fieldId: "prezzo-listino",
  kind: "number",
  currentState: "hard-ssot",
  fromState: "hard-ssot",
  action: "downgrade_one",
  reason: "enforcement_downgrade",
  rollbackReason: "test",
});

assert.equal(readRolloutState("lavorazioni", "qty"), lavorazioniBefore);

const crossRollback = coordinateFormScopedRollback({
  formId: "lavorazioni",
  fieldId: "qty",
  kind: "number",
  currentState: "warn",
  fromState: "warn",
  action: "off",
  reason: "enforcement_downgrade",
  sourceFormId: "ricambio",
});

assert.equal(crossRollback, null);
assert.equal(readRolloutState("lavorazioni", "qty"), lavorazioniBefore);

resetAll();
console.log("multi-form-rollback.test.ts OK");
