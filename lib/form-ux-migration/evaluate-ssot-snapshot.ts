import { normalizeFormUxValue } from "@/lib/form-ux-migration/normalize-and-compare";
import type { FormUxFieldId, FormUxInputKind } from "@/lib/form-ux-migration/types";

export type FormUxSsotSnapshot = {
  fieldId: FormUxFieldId;
  kind: FormUxInputKind;
  raw: string;
  normalized: string;
};

/** SSOT value pipeline — pure, no React/DOM. */
function applySsotValuePipeline(kind: FormUxInputKind, value: string): string {
  switch (kind) {
    case "number":
    case "numberStepper":
      // GestionaleNumberInput: pass-through today; extend here for clamp/step.
      return value;
    case "text":
    case "textarea":
      return value.normalize("NFC").replace(/\s+$/u, "");
    case "select":
    case "checkbox":
      return value;
    default:
      return value;
  }
}

/**
 * Evaluate SSOT snapshot without rendering UI.
 * Used by event-driven shadow mode for deterministic legacy vs SSOT comparison.
 */
export function evaluateSSOTSnapshot(
  fieldId: FormUxFieldId,
  kind: FormUxInputKind,
  value: string,
): FormUxSsotSnapshot {
  const piped = applySsotValuePipeline(kind, value);
  return {
    fieldId,
    kind,
    raw: value,
    normalized: normalizeFormUxValue(kind, piped),
  };
}
