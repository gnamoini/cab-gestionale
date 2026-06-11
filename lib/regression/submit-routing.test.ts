/**
 * Submit routing — Phase 1 identical to resolveFormSubmitPayload; Phase 3 pilot routing.
 */
import assert from "node:assert/strict";
import {
  clearAllFormUxFieldRegistries,
  registerFormUxFieldSnapshot,
} from "@/lib/form-ux-migration/form-ux-field-registry";
import { setFormUxPlatformPhaseForTests } from "@/lib/form-ux-migration/form-ux-platform-config";
import { FORM_UX_ROLLOUT } from "@/lib/form-ux-migration/rollout-config";
import {
  routeFormSubmitPayload,
  routeBeginSubmitTransaction,
} from "@/lib/form-ux-migration/form-ux-submit-router";
import { resolveFormSubmitPayload } from "@/lib/form-ux-migration/resolve-form-submit-payload";
import { resetFormUxExecutionTokens } from "@/lib/form-ux-migration/form-ux-execution-token";
import { clearRolloutStateStore } from "@/lib/form-ux-migration/rollout-state-store";
import {
  clearFormUxMigrationEvents,
  getFormUxCrossFormEvents,
} from "@/lib/form-ux-migration/telemetry";

const originalPilot = FORM_UX_ROLLOUT.ricambio.fields["prezzo-listino"];

function resetAll(): void {
  resetFormUxExecutionTokens();
  clearRolloutStateStore();
  clearAllFormUxFieldRegistries();
  clearFormUxMigrationEvents();
  setFormUxPlatformPhaseForTests(null);
  FORM_UX_ROLLOUT.ricambio.fields["prezzo-listino"] = originalPilot!;
}

resetAll();

clearAllFormUxFieldRegistries();
registerFormUxFieldSnapshot("ricambio", "prezzo-listino", {
  legacy: "10",
  ssot: "10.0",
  normalizedLegacy: "10",
  normalizedSsot: "10",
});

const legacyState = { prezzoFornitoreOriginale: "10", marca: "Test" };

setFormUxPlatformPhaseForTests(1);
const direct = resolveFormSubmitPayload("ricambio", { ...legacyState });
const routed = routeFormSubmitPayload("ricambio", { ...legacyState });

assert.deepEqual(routed, direct);
assert.equal(getFormUxCrossFormEvents().length, 0);

setFormUxPlatformPhaseForTests(3);
clearFormUxMigrationEvents();
const token = routeBeginSubmitTransaction("ricambio");
const phase3 = routeFormSubmitPayload("ricambio", { ...legacyState }, token);
assert.equal(phase3.prezzoFornitoreOriginale, "10");

setFormUxPlatformPhaseForTests(3);
const lavorazioniState = { qty: "5" };
const lavorazioniOut = routeFormSubmitPayload("lavorazioni", lavorazioniState);
assert.deepEqual(lavorazioniOut, lavorazioniState);

setFormUxPlatformPhaseForTests(2);
clearFormUxMigrationEvents();
routeFormSubmitPayload("ricambio", { ...legacyState });
assert.ok(
  getFormUxCrossFormEvents().some((e) => e.eventType === "orchestrator_submit"),
);

resetAll();
console.log("submit-routing.test.ts OK");
