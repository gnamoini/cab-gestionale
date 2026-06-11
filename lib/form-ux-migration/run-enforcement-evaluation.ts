import { getFormUxDeviceClass } from "@/lib/form-ux-migration/device-context";
import { evaluateSSOTSnapshot } from "@/lib/form-ux-migration/evaluate-ssot-snapshot";
import { recordEnforcementEvaluation } from "@/lib/form-ux-migration/enforcement-guardrails";
import { registerFormUxFieldSnapshot } from "@/lib/form-ux-migration/form-ux-field-registry";
import { normalizeFormUxValue } from "@/lib/form-ux-migration/normalize-and-compare";
import { resolveFieldEnforcement } from "@/lib/form-ux-migration/resolve-field-enforcement";
import { emitFormUxMigrationEvent } from "@/lib/form-ux-migration/telemetry";
import type {
  FormUxDivergenceType,
  FormUxEnforcementLevel,
  FormUxFieldId,
  FormUxFormId,
  FormUxInputKind,
  ShadowEvaluationTrigger,
} from "@/lib/form-ux-migration/types";

export type EnforcementEvaluationResult = {
  skipped: boolean;
  match: boolean;
  enforcement: FormUxEnforcementLevel;
  divergenceType: FormUxDivergenceType;
  normalizedLegacy: string;
  normalizedSsot: string;
};

function divergenceTypeFor(
  enforcement: FormUxEnforcementLevel,
  match: boolean,
): FormUxDivergenceType {
  if (match) return "none";
  if (enforcement === "hard-ssot" || enforcement === "kill-legacy") return "hard";
  return "soft";
}

export function runEnforcementEvaluation(input: {
  formId: FormUxFormId;
  fieldId: FormUxFieldId;
  kind: FormUxInputKind;
  legacyValue: string;
  trigger: ShadowEvaluationTrigger;
}): EnforcementEvaluationResult {
  const { formId, fieldId, kind, legacyValue, trigger } = input;
  const resolution = resolveFieldEnforcement(formId, fieldId);
  const { effectiveEnforcement } = resolution;

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

  if (effectiveEnforcement === "off") {
    return {
      skipped: true,
      match,
      enforcement: effectiveEnforcement,
      divergenceType: "none",
      normalizedLegacy,
      normalizedSsot,
    };
  }

  const divergenceType = divergenceTypeFor(effectiveEnforcement, match);

  emitFormUxMigrationEvent({
    formId,
    fieldId,
    kind,
    mode: "shadow",
    resolvedComponent: "legacy",
    enforcement: effectiveEnforcement,
    legacyValue,
    ssotValue: ssotSnapshot.raw,
    divergenceType,
    deviceContext: getFormUxDeviceClass(),
    trigger,
    evaluation: "event-driven",
    eventType: "evaluation",
    mismatch: match ? undefined : { legacy: normalizedLegacy, ssot: normalizedSsot },
    ts: Date.now(),
  });

  if (!match && effectiveEnforcement === "warn" && process.env.NODE_ENV === "development") {
    console.warn("[form-ux-migration] enforcement warn", {
      formId,
      fieldId,
      legacy: normalizedLegacy,
      ssot: normalizedSsot,
      trigger,
    });
  }

  recordEnforcementEvaluation(
    formId,
    fieldId,
    !match,
    effectiveEnforcement,
    kind,
  );

  return {
    skipped: false,
    match,
    enforcement: effectiveEnforcement,
    divergenceType,
    normalizedLegacy,
    normalizedSsot,
  };
}
