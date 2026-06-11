/**
 * Cross-form isolation — context separation, token collision, snapshot contamination.
 */
import assert from "node:assert/strict";
import {
  createFormUxExecutionToken,
  isExecutionTokenValid,
  resetFormUxExecutionTokens,
} from "@/lib/form-ux-migration/form-ux-execution-token";
import {
  assertFormUxIsolationBoundary,
  getOrCreateFormUxExecutionContext,
  recordSnapshotInContext,
  resetFormUxExecutionContexts,
  tryCrossFormSnapshotContamination,
} from "@/lib/form-ux-migration/form-ux-execution-context";
import { orchestrateFieldEvaluation } from "@/lib/form-ux-migration/form-ux-orchestrator";
import { setFormUxPlatformPhaseForTests } from "@/lib/form-ux-migration/form-ux-platform-config";
import { resetRolloutStateLocks } from "@/lib/form-ux-migration/rollout-state-lock";
import { clearRolloutStateStore } from "@/lib/form-ux-migration/rollout-state-store";

function resetAll(): void {
  resetFormUxExecutionTokens();
  resetFormUxExecutionContexts();
  resetRolloutStateLocks();
  clearRolloutStateStore();
  setFormUxPlatformPhaseForTests(3);
}

resetAll();

const ricambioCtx = getOrCreateFormUxExecutionContext("ricambio");
const lavorazioniCtx = getOrCreateFormUxExecutionContext("lavorazioni");

assert.notEqual(ricambioCtx.formId, lavorazioniCtx.formId);
assert.equal(ricambioCtx.domain, "ricambio");
assert.equal(lavorazioniCtx.domain, "lavorazioni");

recordSnapshotInContext("ricambio", "hash-ricambio", Date.now());
assert.equal(getOrCreateFormUxExecutionContext("ricambio").snapshotCache.size, 1);
assert.equal(getOrCreateFormUxExecutionContext("lavorazioni").snapshotCache.size, 0);

assert.equal(
  tryCrossFormSnapshotContamination("ricambio", "lavorazioni", "stolen-hash"),
  false,
);
assert.equal(
  getOrCreateFormUxExecutionContext("lavorazioni").snapshotCache.has("stolen-hash"),
  false,
);

assert.throws(() => assertFormUxIsolationBoundary("ricambio", "lavorazioni"));

for (let i = 0; i < 5; i++) {
  createFormUxExecutionToken("ricambio", "prezzo-listino");
  createFormUxExecutionToken("lavorazioni", "qty");
}
const ricambioToken = createFormUxExecutionToken("ricambio", "prezzo-listino");
const lavorazioniToken = createFormUxExecutionToken("lavorazioni", "qty");

assert.equal(ricambioToken.seq, lavorazioniToken.seq);
assert.ok(isExecutionTokenValid("ricambio", "prezzo-listino", ricambioToken));
assert.ok(isExecutionTokenValid("lavorazioni", "qty", lavorazioniToken));
assert.ok(!isExecutionTokenValid("lavorazioni", "qty", ricambioToken));

const ricambioEval = orchestrateFieldEvaluation({
  formId: "ricambio",
  fieldId: "prezzo-listino",
  kind: "number",
  token: ricambioToken,
  onCompute: () => {},
});

const lavorazioniEval = orchestrateFieldEvaluation({
  formId: "lavorazioni",
  fieldId: "qty",
  kind: "number",
  token: lavorazioniToken,
  onCompute: () => {},
});

assert.ok(ricambioEval.ok);
assert.ok(lavorazioniEval.ok);
assert.equal(getOrCreateFormUxExecutionContext("lavorazioni").snapshotCache.size, 0);

resetAll();
setFormUxPlatformPhaseForTests(null);
console.log("cross-form-isolation.test.ts OK");
