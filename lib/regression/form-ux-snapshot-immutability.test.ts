/**
 * Frozen snapshot — post-freeze mutation does not alter compute inputs.
 */
import assert from "node:assert/strict";
import {
  clearAllFormUxFieldRegistries,
  registerFormUxFieldSnapshot,
} from "@/lib/form-ux-migration/form-ux-field-registry";
import {
  freezeFormUxSnapshot,
  hashFormUxSnapshot,
} from "@/lib/form-ux-migration/form-ux-snapshot";
import { computeRolloutEnforcement } from "@/lib/form-ux-migration/rollout-controller";
import { clearRolloutStateStore, writeRolloutState } from "@/lib/form-ux-migration/rollout-state-store";

clearRolloutStateStore();
clearAllFormUxFieldRegistries();
writeRolloutState("ricambio", "prezzo-listino", "warn");

registerFormUxFieldSnapshot("ricambio", "prezzo-listino", {
  legacy: "10",
  ssot: "10",
  normalizedLegacy: "10",
  normalizedSsot: "10",
});

const legacyState = { prezzoFornitoreOriginale: "10" };
const frozen = freezeFormUxSnapshot({ formId: "ricambio", legacyState });
const hashBefore = frozen.snapshotHash;

const first = computeRolloutEnforcement("ricambio", "prezzo-listino", {
  frozen,
  rolloutStates: frozen.rolloutStates,
  metrics: frozen.metricsSnapshot,
});

legacyState.prezzoFornitoreOriginale = "999";
registerFormUxFieldSnapshot("ricambio", "prezzo-listino", {
  legacy: "999",
  ssot: "999",
  normalizedLegacy: "999",
  normalizedSsot: "999",
});
writeRolloutState("ricambio", "prezzo-listino", "off");

const second = computeRolloutEnforcement("ricambio", "prezzo-listino", {
  frozen,
  rolloutStates: frozen.rolloutStates,
  metrics: frozen.metricsSnapshot,
});

assert.deepEqual(first.rolloutState, second.rolloutState);
assert.equal(hashBefore, hashFormUxSnapshot({
  formId: frozen.formId,
  legacyState: frozen.legacyState,
  fieldSnapshots: frozen.fieldSnapshots,
  rolloutStates: frozen.rolloutStates,
  metricsSnapshot: frozen.metricsSnapshot,
  ssotByField: frozen.ssotByField,
  frozenAt: frozen.frozenAt,
}));

clearRolloutStateStore();
clearAllFormUxFieldRegistries();
console.log("form-ux-snapshot-immutability.test.ts OK");
