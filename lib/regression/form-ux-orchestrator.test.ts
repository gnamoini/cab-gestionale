/**
 * Form UX orchestrator — registry lookup, atomic delegation, phase gating.
 */
import assert from "node:assert/strict";
import {
  resetFormUxExecutionTokens,
  createFormUxExecutionToken,
} from "@/lib/form-ux-migration/form-ux-execution-token";
import { resetFormUxExecutionContexts } from "@/lib/form-ux-migration/form-ux-execution-context";
import {
  getFormUxRegistry,
  getFormUxRegistryEntry,
  isFormUxRolloutEnabled,
} from "@/lib/form-ux-migration/form-ux-registry";
import {
  orchestrateFieldEvaluation,
  beginOrchestratedSubmit,
} from "@/lib/form-ux-migration/form-ux-orchestrator";
import {
  getFormUxPlatformPhaseResolved,
  setFormUxPlatformPhaseForTests,
} from "@/lib/form-ux-migration/form-ux-platform-config";
import { resetRolloutStateLocks } from "@/lib/form-ux-migration/rollout-state-lock";
import { clearRolloutStateStore } from "@/lib/form-ux-migration/rollout-state-store";
import {
  clearFormUxMigrationEvents,
  getFormUxCrossFormEvents,
} from "@/lib/form-ux-migration/telemetry";

function resetAll(): void {
  resetFormUxExecutionTokens();
  resetFormUxExecutionContexts();
  resetRolloutStateLocks();
  clearRolloutStateStore();
  clearFormUxMigrationEvents();
  setFormUxPlatformPhaseForTests(null);
}

resetAll();

assert.equal(getFormUxPlatformPhaseResolved(), 1);
assert.ok(getFormUxRegistry().size >= 6);
assert.equal(getFormUxRegistryEntry("ricambio")?.domain, "ricambio");
assert.equal(getFormUxRegistryEntry("scheda-ingresso")?.domain, "lavorazioni");
assert.equal(isFormUxRolloutEnabled("ricambio"), true);
assert.equal(isFormUxRolloutEnabled("lavorazioni"), false);

const token = createFormUxExecutionToken("ricambio", "prezzo-listino");
const evalResult = orchestrateFieldEvaluation({
  formId: "ricambio",
  fieldId: "prezzo-listino",
  kind: "number",
  token,
  legacyState: { prezzoFornitoreOriginale: "10" },
  onCompute: () => {},
});

assert.ok(evalResult.ok);
assert.equal(getFormUxCrossFormEvents().length, 0);

setFormUxPlatformPhaseForTests(2);
clearFormUxMigrationEvents();
const token2 = createFormUxExecutionToken("ricambio", "prezzo-listino");
orchestrateFieldEvaluation({
  formId: "ricambio",
  fieldId: "prezzo-listino",
  kind: "number",
  token: token2,
  onCompute: () => {},
});
assert.ok(
  getFormUxCrossFormEvents().some(
    (e) => e.eventType === "orchestrator_eval" && e.shadowMode === true,
  ),
);

const submitToken = beginOrchestratedSubmit("ricambio");
assert.equal(submitToken.id, "ricambio.__submit__");

resetAll();
console.log("form-ux-orchestrator.test.ts OK");
