/**
 * Rollout controller — kill-switch, device gating, guard, pure compute + sync.
 */
import assert from "node:assert/strict";
import { resetEnforcementGuardrails } from "@/lib/form-ux-migration/enforcement-guardrails";
import { FORM_UX_ROLLOUT } from "@/lib/form-ux-migration/rollout-config";
import {
  computeRolloutEnforcement,
  resetRolloutControllerCache,
  syncRolloutState,
} from "@/lib/form-ux-migration/rollout-controller";
import { evaluateRolloutGuard } from "@/lib/form-ux-migration/rollout-state-guard";
import {
  clearRolloutStateStore,
  writeRolloutState,
} from "@/lib/form-ux-migration/rollout-state-store";
import {
  clearFormUxMigrationEvents,
  getFormUxRolloutStateEvents,
} from "@/lib/form-ux-migration/telemetry";

const originalEnv = process.env.NEXT_PUBLIC_FORM_UX_MIGRATION;
const originalPilot = FORM_UX_ROLLOUT.ricambio.fields["prezzo-listino"];

function resetAll(): void {
  resetEnforcementGuardrails();
  clearRolloutStateStore();
  resetRolloutControllerCache();
  clearFormUxMigrationEvents();
  if (originalEnv === undefined) {
    delete process.env.NEXT_PUBLIC_FORM_UX_MIGRATION;
  } else {
    process.env.NEXT_PUBLIC_FORM_UX_MIGRATION = originalEnv;
  }
  FORM_UX_ROLLOUT.ricambio.fields["prezzo-listino"] = originalPilot!;
}

resetAll();

// Pilot configured warn, stored off → effective warn (one step)
const pilotRes = computeRolloutEnforcement("ricambio", "prezzo-listino");
assert.equal(pilotRes.configuredState, "warn");
assert.equal(pilotRes.rolloutState, "warn");
assert.equal(pilotRes.effectiveEnforcement, "warn");
assert.ok(pilotRes.guardResult.ok);

// Kill-switch forces off
process.env.NEXT_PUBLIC_FORM_UX_MIGRATION = "0";
const killed = computeRolloutEnforcement("ricambio", "prezzo-listino");
assert.equal(killed.rolloutState, "off");
assert.equal(killed.effectiveEnforcement, "off");

resetAll();

// Stored state affects progression: soft-ssot stored, config hard-ssot → hard-ssot
writeRolloutState("ricambio", "prezzo-listino", "soft-ssot");
FORM_UX_ROLLOUT.ricambio.fields["prezzo-listino"] = {
  ...originalPilot!,
  enforcement: "hard-ssot",
};
const progressed = computeRolloutEnforcement("ricambio", "prezzo-listino");
assert.equal(progressed.rolloutState, "hard-ssot");

resetAll();

// Config jump clamped: stored off, config hard-ssot → warn only
FORM_UX_ROLLOUT.ricambio.fields["prezzo-listino"] = {
  ...originalPilot!,
  enforcement: "hard-ssot",
};
const clamped = computeRolloutEnforcement("ricambio", "prezzo-listino");
assert.equal(clamped.rolloutState, "warn");

resetAll();

// Device gating via guard
const iosOnlyGuard = evaluateRolloutGuard({
  formId: "ricambio",
  fieldId: "prezzo-listino",
  requestedState: "warn",
  persistedState: "off",
  deviceActive: false,
  mismatchRate: 0,
  submitDivergenceRate: 0,
  hydrationStable: true,
  iosFocusBlurLoop: false,
});
assert.equal(iosOnlyGuard.ok, false);
assert.equal(iosOnlyGuard.reason, "device_gated");
assert.equal(iosOnlyGuard.suggestedAction, "rollback");

// syncRolloutState emits rollout event on transition
writeRolloutState("ricambio", "prezzo-listino", "off");
clearFormUxMigrationEvents();
syncRolloutState("ricambio", "prezzo-listino", "number");
const stateEvents = getFormUxRolloutStateEvents();
assert.ok(stateEvents.some((e) => e.toState === "warn"));

resetAll();

console.log("rollout-controller.test.ts OK");
