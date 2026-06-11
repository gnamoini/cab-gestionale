/**
 * Rollout state machine — transitions, clamp, resolveFinalState.
 */
import assert from "node:assert/strict";
import {
  canTransition,
  clampConfigTarget,
  getNextAllowedState,
  resolveFinalState,
} from "@/lib/form-ux-migration/rollout-state-machine";
import {
  clearRolloutStateStore,
  writeRolloutState,
} from "@/lib/form-ux-migration/rollout-state-store";

clearRolloutStateStore();

// Linear progression
assert.equal(getNextAllowedState("off"), "warn");
assert.equal(getNextAllowedState("warn"), "soft-ssot");
assert.equal(getNextAllowedState("soft-ssot"), "hard-ssot");
assert.equal(getNextAllowedState("hard-ssot"), "kill-legacy");
assert.equal(getNextAllowedState("kill-legacy"), null);

// Valid transitions
assert.equal(canTransition("off", "warn"), true);
assert.equal(canTransition("warn", "soft-ssot"), true);
assert.equal(canTransition("off", "hard-ssot"), false);

// Emergency rollback to off always allowed
assert.equal(canTransition("hard-ssot", "off"), true);
assert.equal(canTransition("kill-legacy", "off"), true);

// clampConfigTarget blocks promotion jumps
assert.equal(clampConfigTarget("off", "hard-ssot"), "warn");
assert.equal(clampConfigTarget("warn", "kill-legacy"), "soft-ssot");
assert.equal(clampConfigTarget("soft-ssot", "hard-ssot"), "hard-ssot");
assert.equal(clampConfigTarget("off", "off"), "off");

// clampConfigTarget demotion — one step down toward config
assert.equal(clampConfigTarget("hard-ssot", "warn"), "soft-ssot");
assert.equal(clampConfigTarget("kill-legacy", "warn"), "hard-ssot");
assert.equal(clampConfigTarget("kill-legacy", "off"), "off");

// resolveFinalState
assert.equal(
  resolveFinalState({ configured: "hard-ssot", persistedState: "off" }),
  "warn",
);
assert.equal(
  resolveFinalState({
    configured: "hard-ssot",
    persistedState: "soft-ssot",
  }),
  "hard-ssot",
);
assert.equal(
  resolveFinalState({
    configured: "kill-legacy",
    runtimeOverride: "off",
    persistedState: "hard-ssot",
  }),
  "off",
);

// Store round-trip via rollout-state-store
writeRolloutState("ricambio", "prezzo-listino", "warn");
assert.equal(
  resolveFinalState({
    configured: "soft-ssot",
    persistedState: "warn",
  }),
  "soft-ssot",
);

clearRolloutStateStore();

console.log("rollout-state-machine.test.ts OK");
