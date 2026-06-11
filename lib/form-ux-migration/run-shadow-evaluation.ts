import { evaluateSSOTSnapshot } from "@/lib/form-ux-migration/evaluate-ssot-snapshot";
import { registerFormUxFieldSnapshot } from "@/lib/form-ux-migration/form-ux-field-registry";
import { recordFormUxMismatch } from "@/lib/form-ux-migration/guardrails";
import { normalizeFormUxValue } from "@/lib/form-ux-migration/normalize-and-compare";
import { emitFormUxMigrationEvent } from "@/lib/form-ux-migration/telemetry";
import type {
  FormUxFieldId,
  FormUxFormId,
  FormUxInputKind,
  ShadowEvaluationTrigger,
} from "@/lib/form-ux-migration/types";

export type { ShadowEvaluationTrigger };

export type ShadowEvaluationResult = {
  match: boolean;
  normalizedLegacy: string;
  normalizedSsot: string;
  mismatch?: { legacy: string; ssot: string };
  rolledBack: boolean;
};

const lastMismatchSignatures = new Map<string, string>();

function mismatchKey(formId: FormUxFormId, fieldId: FormUxFieldId): string {
  return `${formId}.${fieldId}`;
}

export function runShadowEvaluation(input: {
  formId: FormUxFormId;
  fieldId: FormUxFieldId;
  kind: FormUxInputKind;
  legacyValue: string;
  trigger: ShadowEvaluationTrigger;
}): ShadowEvaluationResult {
  const { formId, fieldId, kind, legacyValue, trigger } = input;

  const normalizedLegacy = normalizeFormUxValue(kind, legacyValue);
  const ssotSnapshot = evaluateSSOTSnapshot(fieldId, kind, legacyValue);
  const normalizedSsot = ssotSnapshot.normalized;
  const match = normalizedLegacy === normalizedSsot;

  registerFormUxFieldSnapshot(formId, fieldId, {
    legacy: legacyValue,
    ssot: ssotSnapshot.raw,
    normalizedLegacy,
    normalizedSsot,
    lastWrite: "legacy",
  });

  if (match) {
    emitFormUxMigrationEvent({
      formId,
      fieldId,
      kind,
      mode: "shadow",
      resolvedComponent: "legacy",
      trigger,
      evaluation: "event-driven",
      ts: Date.now(),
    });
    return {
      match: true,
      normalizedLegacy,
      normalizedSsot,
      rolledBack: false,
    };
  }

  const signature = `${trigger}|${normalizedLegacy}|${normalizedSsot}`;
  const key = mismatchKey(formId, fieldId);
  if (lastMismatchSignatures.get(key) !== signature) {
    lastMismatchSignatures.set(key, signature);
    recordFormUxMismatch(formId, fieldId);
    emitFormUxMigrationEvent({
      formId,
      fieldId,
      kind,
      mode: "shadow",
      resolvedComponent: "legacy",
      trigger,
      evaluation: "event-driven",
      mismatch: { legacy: normalizedLegacy, ssot: normalizedSsot },
      ts: Date.now(),
    });
    return {
      match: false,
      normalizedLegacy,
      normalizedSsot,
      mismatch: { legacy: normalizedLegacy, ssot: normalizedSsot },
      rolledBack: false,
    };
  }

  return {
    match: false,
    normalizedLegacy,
    normalizedSsot,
    mismatch: { legacy: normalizedLegacy, ssot: normalizedSsot },
    rolledBack: false,
  };
}

/** Test helper — reset dedup state between test cases. */
export function resetShadowEvaluationDedup(): void {
  lastMismatchSignatures.clear();
}
