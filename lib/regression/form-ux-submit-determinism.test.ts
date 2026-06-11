/**
 * Submit pipeline determinism — normalized compare, pure compute.
 */
import assert from "node:assert/strict";
import {
  clearAllFormUxFieldRegistries,
  registerFormUxFieldSnapshot,
} from "@/lib/form-ux-migration/form-ux-field-registry";
import { FORM_UX_ROLLOUT } from "@/lib/form-ux-migration/rollout-config";
import {
  computeFormSubmitPayload,
} from "@/lib/form-ux-migration/resolve-form-submit-payload";
import {
  clearRolloutStateStore,
  writeRolloutState,
} from "@/lib/form-ux-migration/rollout-state-store";

const originalPilot = FORM_UX_ROLLOUT.ricambio.fields["prezzo-listino"];

FORM_UX_ROLLOUT.ricambio.fields["prezzo-listino"] = {
  ...originalPilot!,
  enforcement: "hard-ssot",
  submitPrecedence: "ssot-wins",
};

clearRolloutStateStore();
writeRolloutState("ricambio", "prezzo-listino", "hard-ssot");
clearAllFormUxFieldRegistries();

registerFormUxFieldSnapshot("ricambio", "prezzo-listino", {
  legacy: "10",
  ssot: "10.0",
  normalizedLegacy: "10",
  normalizedSsot: "10",
});

const legacyState = { prezzoFornitoreOriginale: "10" };
const snapshots = new Map([
  [
    "prezzo-listino",
    {
      legacy: "10",
      ssot: "10.0",
      normalizedLegacy: "10",
      normalizedSsot: "10",
      lastWrite: "legacy" as const,
      ts: Date.now(),
    },
  ],
]);

const rolloutByField = new Map([
  [
    "prezzo-listino",
    {
      rolloutState: "hard-ssot" as const,
      guardResult: { ok: true as const },
      submitPrecedence: "ssot-wins" as const,
      effectiveEnforcement: "hard-ssot" as const,
      kind: "number" as const,
      critical: true,
    },
  ],
]);

const input = {
  formId: "ricambio" as const,
  legacyState,
  snapshots,
  rolloutByField,
  ssotByField: { "prezzo-listino": "10.0" },
  fieldConfig: FORM_UX_ROLLOUT.ricambio.fields,
};

const first = computeFormSubmitPayload(input);
const second = computeFormSubmitPayload(input);

assert.equal(first.payload.prezzoFornitoreOriginale, "10");
assert.equal(first.divergences.length, 0);
assert.deepEqual(first.payload, second.payload);
assert.deepEqual(first.divergences, second.divergences);

// True divergence: ssot-wins returns normalized canonical value
registerFormUxFieldSnapshot("ricambio", "prezzo-listino", {
  legacy: "10",
  ssot: "12.5",
  normalizedLegacy: "10",
  normalizedSsot: "12.5",
});

const divergedInput = {
  ...input,
  legacyState: { prezzoFornitoreOriginale: "10" },
  snapshots: new Map([
    [
      "prezzo-listino",
      {
        legacy: "10",
        ssot: "12.5",
        normalizedLegacy: "10",
        normalizedSsot: "12.5",
        lastWrite: "legacy" as const,
        ts: Date.now(),
      },
    ],
  ]),
  ssotByField: { "prezzo-listino": "12.5" },
};

const diverged = computeFormSubmitPayload(divergedInput);
assert.equal(diverged.payload.prezzoFornitoreOriginale, "12.5");
assert.equal(diverged.divergences.length, 1);

FORM_UX_ROLLOUT.ricambio.fields["prezzo-listino"] = originalPilot!;
clearRolloutStateStore();
clearAllFormUxFieldRegistries();

console.log("form-ux-submit-determinism.test.ts OK");
