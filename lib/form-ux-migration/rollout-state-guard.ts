import {
  FORM_UX_GUARD_MISMATCH_RATE,
  FORM_UX_GUARD_SUBMIT_DIVERGENCE_RATE,
} from "@/lib/form-ux-migration/shadow-config";
import {
  canTransition,
  type RolloutState,
} from "@/lib/form-ux-migration/rollout-state-machine";
import type { FormUxFieldId, FormUxFormId } from "@/lib/form-ux-migration/types";

export type RolloutGuardResult =
  | { ok: true }
  | { ok: false; reason: string; suggestedAction: "rollback" | "downgrade" };

export function evaluateRolloutGuard(input: {
  formId: FormUxFormId;
  fieldId: FormUxFieldId;
  requestedState: RolloutState;
  persistedState: RolloutState;
  deviceActive: boolean;
  mismatchRate: number;
  submitDivergenceRate: number;
  hydrationStable: boolean;
  iosFocusBlurLoop: boolean;
}): RolloutGuardResult {
  const {
    requestedState,
    persistedState,
    deviceActive,
    mismatchRate,
    submitDivergenceRate,
    hydrationStable,
    iosFocusBlurLoop,
  } = input;

  if (!deviceActive && requestedState !== "off") {
    return { ok: false, reason: "device_gated", suggestedAction: "rollback" };
  }

  if (
    requestedState !== "off" &&
    requestedState !== persistedState &&
    !canTransition(persistedState, requestedState)
  ) {
    return { ok: false, reason: "invalid_transition", suggestedAction: "rollback" };
  }

  if (mismatchRate > FORM_UX_GUARD_MISMATCH_RATE && requestedState !== "off") {
    return { ok: false, reason: "mismatch_rate_high", suggestedAction: "downgrade" };
  }

  if (submitDivergenceRate > FORM_UX_GUARD_SUBMIT_DIVERGENCE_RATE) {
    return { ok: false, reason: "submit_divergence_high", suggestedAction: "rollback" };
  }

  if (!hydrationStable && requestedState !== "off") {
    return { ok: false, reason: "hydration_unstable", suggestedAction: "downgrade" };
  }

  if (iosFocusBlurLoop) {
    return { ok: false, reason: "ios_focus_blur_loop", suggestedAction: "rollback" };
  }

  return { ok: true };
}
