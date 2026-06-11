import { isFormUxMigrationEnabled } from "@/lib/form-ux-migration/config";
import {
  getFormUxDeviceClass,
  isFormUxRolloutActiveForDevice,
} from "@/lib/form-ux-migration/device-context";
import { downgradeEnforcementLevel } from "@/lib/form-ux-migration/enforcement-levels";
import {
  detectIosFocusBlurLoop,
} from "@/lib/form-ux-migration/auto-rollback-engine";
import {
  getFieldMismatchRate,
  getFieldMismatchRateFromSnapshot,
  getFieldSubmitDivergenceRate,
  getFieldSubmitDivergenceRateFromSnapshot,
  getIosFocusBlurLoopFromSnapshot,
  isHydrationStable,
  isHydrationStableFromSnapshot,
  type FormUxMetricsSnapshot,
} from "@/lib/form-ux-migration/enforcement-guardrails";
import type { FormUxFrozenSnapshot } from "@/lib/form-ux-migration/form-ux-snapshot";
import { FORM_UX_ROLLOUT } from "@/lib/form-ux-migration/rollout-config";
import {
  applyRolloutTransitionSync,
  type RolloutTransitionReason,
} from "@/lib/form-ux-migration/rollout-rollback-executor";
import { evaluateRolloutGuard, type RolloutGuardResult } from "@/lib/form-ux-migration/rollout-state-guard";
import {
  resolveFinalState,
  type RolloutState,
} from "@/lib/form-ux-migration/rollout-state-machine";
import { readRolloutState } from "@/lib/form-ux-migration/rollout-state-store";
import type {
  FormUxEnforcementLevel,
  FormUxFallbackMode,
  FormUxFieldEnforcementResolution,
  FormUxFieldId,
  FormUxFormId,
  FormUxInputKind,
  FormUxSubmitPrecedence,
} from "@/lib/form-ux-migration/types";

function defaultSubmitPrecedence(enforcement: FormUxEnforcementLevel): FormUxSubmitPrecedence {
  switch (enforcement) {
    case "hard-ssot":
    case "kill-legacy":
      return "ssot-wins";
    case "soft-ssot":
      return "last-write-wins";
    default:
      return "legacy-wins";
  }
}

function readFieldRollout(formId: FormUxFormId, fieldId: FormUxFieldId) {
  const formRollout = FORM_UX_ROLLOUT[formId];
  const fieldRollout = formRollout?.fields[fieldId];
  return {
    kind: fieldRollout?.kind ?? ("text" as FormUxInputKind),
    mode: fieldRollout?.mode ?? ("legacy" as const),
    enforcement: (fieldRollout?.enforcement ?? "off") as RolloutState,
    devices: fieldRollout?.devices,
    fallback: (fieldRollout?.fallback ?? "legacy") as FormUxFallbackMode,
    submitPrecedence: fieldRollout?.submitPrecedence,
    critical: fieldRollout?.critical ?? false,
    stateKey: fieldRollout?.stateKey,
  };
}

export type RolloutEnforcementResolution = FormUxFieldEnforcementResolution & {
  rolloutState: RolloutState;
  configuredState: RolloutState;
  guardResult: RolloutGuardResult;
};

export type RolloutComputeContext = {
  frozen?: FormUxFrozenSnapshot;
  rolloutStates?: ReadonlyMap<string, RolloutState>;
  metrics?: FormUxMetricsSnapshot;
};

function mapGuardReasonToTransition(
  guardResult: RolloutGuardResult,
): RolloutTransitionReason {
  if (guardResult.ok) return "config_progression";
  return guardResult.suggestedAction === "rollback" ? "guard_rollback" : "guard_downgrade";
}

function readMetricsForCompute(
  formId: FormUxFormId,
  fieldId: FormUxFieldId,
  ctx?: RolloutComputeContext,
) {
  if (ctx?.metrics) {
    return {
      mismatchRate: getFieldMismatchRateFromSnapshot(ctx.metrics, formId, fieldId),
      submitDivergenceRate: getFieldSubmitDivergenceRateFromSnapshot(ctx.metrics, formId, fieldId),
      hydrationStable: isHydrationStableFromSnapshot(ctx.metrics, formId, fieldId),
      iosFocusBlurLoop: getIosFocusBlurLoopFromSnapshot(ctx.metrics, formId, fieldId),
    };
  }
  return {
    mismatchRate: getFieldMismatchRate(formId, fieldId),
    submitDivergenceRate: getFieldSubmitDivergenceRate(formId, fieldId),
    hydrationStable: isHydrationStable(formId, fieldId),
    iosFocusBlurLoop: detectIosFocusBlurLoop(formId, fieldId),
  };
}

function readPersistedState(
  formId: FormUxFormId,
  fieldId: FormUxFieldId,
  ctx?: RolloutComputeContext,
): RolloutState {
  if (ctx?.rolloutStates?.has(fieldId)) {
    return ctx.rolloutStates.get(fieldId) ?? "off";
  }
  if (ctx?.frozen?.rolloutStates.has(fieldId)) {
    return ctx.frozen.rolloutStates.get(fieldId) ?? "off";
  }
  return readRolloutState(formId, fieldId) ?? "off";
}

/** Pure — reads config, store, metrics; no writes or telemetry. */
export function computeRolloutEnforcement(
  formId: FormUxFormId,
  fieldId: FormUxFieldId,
  ctx?: RolloutComputeContext,
): RolloutEnforcementResolution {
  const rollout = readFieldRollout(formId, fieldId);
  const deviceContext = getFormUxDeviceClass();
  const migrationEnabled = isFormUxMigrationEnabled();
  const deviceActive = isFormUxRolloutActiveForDevice(rollout.devices);
  const configuredState = rollout.enforcement;
  const persistedState = readPersistedState(formId, fieldId, ctx);

  const { mismatchRate, submitDivergenceRate, hydrationStable, iosFocusBlurLoop } =
    readMetricsForCompute(formId, fieldId, ctx);

  let rolloutState: RolloutState = "off";
  let guardResult: RolloutGuardResult = { ok: true };

  if (!migrationEnabled) {
    rolloutState = "off";
  } else {
    const clampedTarget = resolveFinalState({
      configured: configuredState,
      persistedState,
    });

    guardResult = evaluateRolloutGuard({
      formId,
      fieldId,
      requestedState: clampedTarget,
      persistedState,
      deviceActive,
      mismatchRate,
      submitDivergenceRate,
      hydrationStable,
      iosFocusBlurLoop,
    });

    if (!guardResult.ok) {
      if (guardResult.suggestedAction === "rollback") {
        rolloutState = "off";
      } else {
        rolloutState = downgradeEnforcementLevel(clampedTarget);
      }
    } else {
      rolloutState = clampedTarget;
    }
  }

  const rollbackActive = rolloutState === "off" && configuredState !== "off";

  return {
    formId,
    fieldId,
    kind: rollout.kind,
    enforcement: configuredState,
    effectiveEnforcement: rolloutState,
    submitPrecedence:
      rollout.submitPrecedence ?? defaultSubmitPrecedence(rolloutState),
    critical: rollout.critical,
    stateKey: rollout.stateKey,
    deviceContext,
    rollbackActive,
    fallback: rollout.fallback,
    rolloutState,
    configuredState,
    guardResult,
  };
}

/** Read-only alias for backward compatibility. */
export function resolveRolloutEnforcement(
  formId: FormUxFormId,
  fieldId: FormUxFieldId,
  ctx?: RolloutComputeContext,
): RolloutEnforcementResolution {
  return computeRolloutEnforcement(formId, fieldId, ctx);
}

/** Commit precomputed state — no re-compute. */
export function commitRolloutState(
  formId: FormUxFormId,
  fieldId: FormUxFieldId,
  kind: FormUxInputKind,
  precomputed: RolloutEnforcementResolution,
): void {
  const stored = readRolloutState(formId, fieldId) ?? "off";
  if (precomputed.rolloutState === stored) return;

  applyRolloutTransitionSync({
    formId,
    fieldId,
    fromState: stored,
    toState: precomputed.rolloutState,
    reason: mapGuardReasonToTransition(precomputed.guardResult),
    kind,
    rollbackReason: precomputed.guardResult.ok ? undefined : precomputed.guardResult.reason,
  });
}

/** Backward-compatible wrapper — computes then commits. */
export function syncRolloutState(
  formId: FormUxFormId,
  fieldId: FormUxFieldId,
  kind: FormUxInputKind,
): void {
  const computed = computeRolloutEnforcement(formId, fieldId);
  commitRolloutState(formId, fieldId, kind, computed);
}

/** Test helper — no-op (state cleared via clearRolloutStateStore). */
export function resetRolloutControllerCache(): void {
  // retained for test API compatibility
}
