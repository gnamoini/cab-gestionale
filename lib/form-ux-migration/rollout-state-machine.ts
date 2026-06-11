import type { FormUxEnforcementLevel } from "@/lib/form-ux-migration/types";

export type RolloutState = FormUxEnforcementLevel;

const ROLLOUT_STATE_ORDER: RolloutState[] = [
  "off",
  "warn",
  "soft-ssot",
  "hard-ssot",
  "kill-legacy",
];

export function getNextAllowedState(current: RolloutState): RolloutState | null {
  const idx = ROLLOUT_STATE_ORDER.indexOf(current);
  if (idx < 0 || idx >= ROLLOUT_STATE_ORDER.length - 1) return null;
  return ROLLOUT_STATE_ORDER[idx + 1]!;
}

export function canTransition(from: RolloutState, to: RolloutState): boolean {
  if (to === "off") return true;
  if (from === to) return true;
  return to === getNextAllowedState(from);
}

export function clampConfigTarget(from: RolloutState, requested: RolloutState): RolloutState {
  if (requested === "off") return "off";
  if (canTransition(from, requested)) return requested;

  const fromIdx = ROLLOUT_STATE_ORDER.indexOf(from);
  const reqIdx = ROLLOUT_STATE_ORDER.indexOf(requested);

  if (reqIdx >= 0 && reqIdx < fromIdx) {
    return ROLLOUT_STATE_ORDER[fromIdx - 1]!;
  }

  const next = getNextAllowedState(from);
  if (next && process.env.NODE_ENV === "development") {
    console.warn("[form-ux-migration] clampConfigTarget", {
      from,
      requested,
      clamped: next,
    });
  }
  return next ?? from;
}

export function resolveFinalState(input: {
  configured: RolloutState;
  runtimeOverride?: RolloutState | null;
  persistedState?: RolloutState | null;
}): RolloutState {
  if (input.runtimeOverride === "off") return "off";
  const base = input.persistedState ?? "off";
  const clamped = clampConfigTarget(base, input.configured);
  if (input.runtimeOverride != null) {
    return clampConfigTarget(clamped, input.runtimeOverride);
  }
  return clamped;
}
