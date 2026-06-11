import { computeRolloutEnforcement } from "@/lib/form-ux-migration/rollout-controller";
import type {
  FormUxFieldEnforcementResolution,
  FormUxFieldId,
  FormUxFormId,
} from "@/lib/form-ux-migration/types";

/** Thin wrapper — pure compute in rollout-controller. */
export function resolveFieldEnforcement(
  formId: FormUxFormId,
  fieldId: FormUxFieldId,
): FormUxFieldEnforcementResolution {
  const resolution = computeRolloutEnforcement(formId, fieldId);
  return {
    formId: resolution.formId,
    fieldId: resolution.fieldId,
    kind: resolution.kind,
    enforcement: resolution.enforcement,
    effectiveEnforcement: resolution.effectiveEnforcement,
    submitPrecedence: resolution.submitPrecedence,
    critical: resolution.critical,
    stateKey: resolution.stateKey,
    deviceContext: resolution.deviceContext,
    rollbackActive: resolution.rollbackActive,
    fallback: resolution.fallback,
  };
}
