/**
 * Boundary gate — API, runInsideBoundaryGate, delega platform layer.
 */
import assert from "node:assert/strict";
import {
  gateFieldEvaluation,
  gateFormSubmit,
  gateBeginSubmit,
  resetFormUxBoundaryGate,
} from "@/lib/form-ux-migration/form-ux-boundary-gate";
import {
  createFormUxExecutionToken,
  resetFormUxExecutionTokens,
} from "@/lib/form-ux-migration/form-ux-execution-token";
import {
  resetFormUxLegacyGuard,
  runInsideBoundaryGate,
} from "@/lib/form-ux-migration/form-ux-legacy-guard";
import { resetFormUxExecutionContexts } from "@/lib/form-ux-migration/form-ux-execution-context";
import {
  clearAllFormUxFieldRegistries,
  registerFormUxFieldSnapshot,
} from "@/lib/form-ux-migration/form-ux-field-registry";
import { resetRolloutStateLocks } from "@/lib/form-ux-migration/rollout-state-lock";
import { clearRolloutStateStore } from "@/lib/form-ux-migration/rollout-state-store";
import { clearFormUxMigrationEvents } from "@/lib/form-ux-migration/telemetry";

function resetAll(): void {
  resetFormUxBoundaryGate();
  resetFormUxLegacyGuard();
  resetFormUxExecutionTokens();
  resetFormUxExecutionContexts();
  resetRolloutStateLocks();
  clearRolloutStateStore();
  clearAllFormUxFieldRegistries();
  clearFormUxMigrationEvents();
}

resetAll();

registerFormUxFieldSnapshot("ricambio", "prezzo-listino", {
  legacy: "10",
  ssot: "10",
  normalizedLegacy: "10",
  normalizedSsot: "10",
});

const token = createFormUxExecutionToken("ricambio", "prezzo-listino");
const evalResult = runInsideBoundaryGate(() =>
  gateFieldEvaluation({
    formId: "ricambio",
    fieldId: "prezzo-listino",
    kind: "number",
    token,
    legacyState: { prezzoFornitoreOriginale: "10" },
    onCompute: () => {},
  }),
);

assert.ok(evalResult.ok);

const submitToken = gateBeginSubmit("ricambio");
const payload = gateFormSubmit("ricambio", { prezzoFornitoreOriginale: "10", marca: "X" }, submitToken);
assert.equal(payload.prezzoFornitoreOriginale, "10");

resetAll();
console.log("form-ux-boundary-gate.test.ts OK");
