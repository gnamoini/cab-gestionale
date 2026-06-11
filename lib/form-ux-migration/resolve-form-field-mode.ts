import { isFormUxMigrationEnabled } from "@/lib/form-ux-migration/config";
import { resolveFieldEnforcement } from "@/lib/form-ux-migration/resolve-field-enforcement";
import { FORM_UX_ROLLOUT } from "@/lib/form-ux-migration/rollout-config";
import type {
  FormUxFieldModeResolution,
  FormUxFieldId,
  FormUxFormId,
  FormUxInputKind,
  FormUxMigrationMode,
  FormUxResolvedComponent,
} from "@/lib/form-ux-migration/types";

function resolveConfiguredMode(formId: FormUxFormId, fieldId: FormUxFieldId): {
  kind: FormUxInputKind;
  mode: FormUxMigrationMode;
} {
  const formRollout = FORM_UX_ROLLOUT[formId];
  const fieldRollout = formRollout?.fields[fieldId];
  return {
    kind: fieldRollout?.kind ?? "text",
    mode: fieldRollout?.mode ?? formRollout?.defaultMode ?? "legacy",
  };
}

function deriveVisibility(mode: FormUxMigrationMode): {
  showLegacy: boolean;
  showSsot: boolean;
  activeOnChange: FormUxResolvedComponent;
} {
  switch (mode) {
    case "legacy":
      return { showLegacy: true, showSsot: false, activeOnChange: "legacy" };
    case "shadow":
      return { showLegacy: true, showSsot: false, activeOnChange: "legacy" };
    case "hybrid":
      return { showLegacy: false, showSsot: true, activeOnChange: "ssot" };
    case "ssot":
      return { showLegacy: false, showSsot: true, activeOnChange: "ssot" };
    default:
      return { showLegacy: true, showSsot: false, activeOnChange: "legacy" };
  }
}

export function resolveFormFieldMode(
  formId: FormUxFormId,
  fieldId: FormUxFieldId,
  kindOverride?: FormUxInputKind,
): FormUxFieldModeResolution {
  const { kind, mode } = resolveConfiguredMode(formId, fieldId);
  const enforcementRes = resolveFieldEnforcement(formId, fieldId);
  const migrationEnabled = isFormUxMigrationEnabled();

  let effectiveMode: FormUxMigrationMode = mode;
  let effectiveEnforcement = enforcementRes.effectiveEnforcement;

  if (!migrationEnabled || enforcementRes.rollbackActive) {
    if (enforcementRes.rollbackActive) {
      effectiveEnforcement = enforcementRes.effectiveEnforcement;
      effectiveMode = enforcementRes.fallback;
    } else {
      effectiveEnforcement = "off";
      effectiveMode = "legacy";
    }
  }

  if (effectiveEnforcement === "kill-legacy") {
    effectiveMode = "ssot";
  }

  const visibility = deriveVisibility(effectiveMode);

  return {
    formId,
    fieldId,
    kind: kindOverride ?? kind,
    mode,
    effectiveMode,
    enforcement: enforcementRes.enforcement,
    effectiveEnforcement,
    rollbackActive: enforcementRes.rollbackActive,
    ...visibility,
  };
}
