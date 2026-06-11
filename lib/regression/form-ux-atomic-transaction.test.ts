/**
 * Atomic transaction — freeze → compute → commit without intermediate mutation.
 */
import assert from "node:assert/strict";
import { atomicRolloutTransaction } from "@/lib/form-ux-migration/atomic-rollout-transaction";
import {
  createFormUxExecutionToken,
  resetFormUxExecutionTokens,
} from "@/lib/form-ux-migration/form-ux-execution-token";
import {
  clearAllFormUxFieldRegistries,
  registerFormUxFieldSnapshot,
} from "@/lib/form-ux-migration/form-ux-field-registry";
import { computeRolloutEnforcement } from "@/lib/form-ux-migration/rollout-controller";
import { resetRolloutStateLocks } from "@/lib/form-ux-migration/rollout-state-lock";
import {
  clearRolloutStateStore,
  readRolloutState,
  writeRolloutState,
} from "@/lib/form-ux-migration/rollout-state-store";
import { clearFormUxMigrationEvents, getFormUxRolloutStateEvents } from "@/lib/form-ux-migration/telemetry";

clearRolloutStateStore();
clearAllFormUxFieldRegistries();
resetFormUxExecutionTokens();
resetRolloutStateLocks();
clearFormUxMigrationEvents();

writeRolloutState("ricambio", "prezzo-listino", "off");
registerFormUxFieldSnapshot("ricambio", "prezzo-listino", {
  legacy: "1",
  ssot: "1",
  normalizedLegacy: "1",
  normalizedSsot: "1",
});

let computeCount = 0;
const token = createFormUxExecutionToken("ricambio", "prezzo-listino");

const result = atomicRolloutTransaction({
  formId: "ricambio",
  fieldId: "prezzo-listino",
  kind: "number",
  token,
  legacyState: { prezzoFornitoreOriginale: "1" },
  mode: "evaluation",
  onCompute: (frozen) => {
    computeCount += 1;
    const pre = computeRolloutEnforcement("ricambio", "prezzo-listino", {
      frozen,
      rolloutStates: frozen.rolloutStates,
      metrics: frozen.metricsSnapshot,
    });
    assert.equal(pre.rolloutState, "warn");
  },
});

assert.ok(result.ok);
assert.ok(result.snapshotHash.length > 0);
assert.equal(computeCount, 1);
assert.equal(readRolloutState("ricambio", "prezzo-listino"), "warn");
assert.ok(getFormUxRolloutStateEvents().some((e) => e.toState === "warn"));

clearRolloutStateStore();
clearAllFormUxFieldRegistries();
resetFormUxExecutionTokens();
resetRolloutStateLocks();
console.log("form-ux-atomic-transaction.test.ts OK");
