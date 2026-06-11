import { atomicFormSubmitTransaction } from "@/lib/form-ux-migration/atomic-rollout-transaction";
import { getFormUxDeviceClass } from "@/lib/form-ux-migration/device-context";
import {
  beginSubmitTransaction,
  isFormSubmitTokenValid,
  type FormUxExecutionToken,
} from "@/lib/form-ux-migration/form-ux-execution-token";
import {
  recordSubmitDivergenceMetrics,
} from "@/lib/form-ux-migration/enforcement-guardrails";
import { compareFormUxValues } from "@/lib/form-ux-migration/normalize-and-compare";
import { FORM_UX_ROLLOUT } from "@/lib/form-ux-migration/rollout-config";
import {
  type RolloutEnforcementResolution,
} from "@/lib/form-ux-migration/rollout-controller";
import { emitFormUxMigrationEvent } from "@/lib/form-ux-migration/telemetry";
import type {
  FormUxFieldId,
  FormUxFieldSnapshot,
  FormUxFormId,
  FormUxInputKind,
  FormUxSubmitPrecedence,
} from "@/lib/form-ux-migration/types";

export type SubmitDivergence = {
  formId: FormUxFormId;
  fieldId: FormUxFieldId;
  kind: FormUxInputKind;
  enforcement: string;
  legacyValue: string;
  ssotValue: string;
  divergenceType: "soft" | "hard";
  critical: boolean;
  mode: string;
};

function shouldReconcileField(
  rolloutState: string,
  guardOk: boolean,
): boolean {
  if (!guardOk || rolloutState === "off" || rolloutState === "warn") return false;
  return rolloutState === "soft-ssot" || rolloutState === "hard-ssot" || rolloutState === "kill-legacy";
}

function resolveFieldValueNormalized(input: {
  kind: FormUxInputKind;
  legacyValue: unknown;
  ssotValue: string | undefined;
  precedence: FormUxSubmitPrecedence;
  snapshotLastWrite?: "legacy" | "ssot";
}): { value: unknown; diverged: boolean } {
  const { kind, legacyValue, ssotValue, precedence, snapshotLastWrite } = input;
  const legacyStr = legacyValue == null ? "" : String(legacyValue);

  if (ssotValue == null || ssotValue === "") {
    return { value: legacyValue, diverged: false };
  }

  const { match, normalizedSsot } = compareFormUxValues(kind, legacyStr, ssotValue);
  if (match) {
    return { value: legacyValue, diverged: false };
  }

  switch (precedence) {
    case "legacy-wins":
      return { value: legacyValue, diverged: true };
    case "ssot-wins":
      return { value: normalizedSsot, diverged: true };
    case "last-write-wins":
      if (snapshotLastWrite === "ssot") {
        return { value: normalizedSsot, diverged: true };
      }
      return { value: legacyValue, diverged: true };
    default:
      return { value: legacyValue, diverged: false };
  }
}

type RolloutFieldContext = Pick<
  RolloutEnforcementResolution,
  | "rolloutState"
  | "guardResult"
  | "submitPrecedence"
  | "effectiveEnforcement"
  | "kind"
  | "critical"
>;

/** Pure — no side effects, deterministic for identical inputs. */
export function computeFormSubmitPayload<T extends Record<string, unknown>>(input: {
  formId: FormUxFormId;
  legacyState: T;
  snapshots: ReadonlyMap<string, FormUxFieldSnapshot>;
  rolloutByField: ReadonlyMap<string, RolloutFieldContext>;
  ssotByField: Record<string, string>;
  fieldConfig: (typeof FORM_UX_ROLLOUT)[FormUxFormId]["fields"];
}): { payload: T; divergences: SubmitDivergence[] } {
  const { formId, legacyState, snapshots, rolloutByField, ssotByField, fieldConfig } = input;
  const out = { ...legacyState };
  const divergences: SubmitDivergence[] = [];

  for (const [fieldId, fieldRollout] of Object.entries(fieldConfig) as [
    FormUxFieldId,
    (typeof fieldConfig)[FormUxFieldId],
  ][]) {
    if (!fieldRollout?.stateKey) continue;

    const rolloutRes = rolloutByField.get(fieldId);
    if (!rolloutRes) continue;

    const {
      rolloutState,
      effectiveEnforcement,
      submitPrecedence,
      critical,
      kind,
      guardResult,
    } = rolloutRes;

    if (!shouldReconcileField(rolloutState, guardResult.ok)) continue;

    const stateKey = fieldRollout.stateKey as keyof T;
    const legacyValue = legacyState[stateKey];
    const snapshot = snapshots.get(fieldId);
    const ssotValue = ssotByField[fieldId] ?? snapshot?.ssot;

    const { value, diverged } = resolveFieldValueNormalized({
      kind,
      legacyValue,
      ssotValue,
      precedence: submitPrecedence,
      snapshotLastWrite: snapshot?.lastWrite,
    });

    if (diverged) {
      divergences.push({
        formId,
        fieldId,
        kind,
        enforcement: effectiveEnforcement,
        legacyValue: legacyValue == null ? "" : String(legacyValue),
        ssotValue: ssotValue ?? "",
        divergenceType:
          effectiveEnforcement === "hard-ssot" || effectiveEnforcement === "kill-legacy"
            ? "hard"
            : "soft",
        critical,
        mode: fieldRollout.mode,
      });
    }

    out[stateKey] = value as T[keyof T];
  }

  return { payload: out, divergences };
}

function reportSubmitDivergences(
  divergences: SubmitDivergence[],
  snapshotHash: string,
  executionToken?: FormUxExecutionToken,
): void {
  let hardDivergence = false;

  for (const d of divergences) {
    if (d.divergenceType === "hard") {
      hardDivergence = true;
    }

    recordSubmitDivergenceMetrics(d.formId, d.fieldId, d.critical);

    emitFormUxMigrationEvent({
      formId: d.formId,
      fieldId: d.fieldId,
      kind: d.kind,
      mode: d.mode as "shadow",
      resolvedComponent: "legacy",
      enforcement: d.enforcement as RolloutEnforcementResolution["effectiveEnforcement"],
      legacyValue: d.legacyValue,
      ssotValue: d.ssotValue,
      divergenceType: d.divergenceType,
      deviceContext: getFormUxDeviceClass(),
      eventType: "submit_reconciliation",
      snapshotHash,
      executionToken: executionToken ? String(executionToken.seq) : undefined,
      ts: Date.now(),
    });
  }

  if (hardDivergence && divergences.length > 0) {
    emitFormUxMigrationEvent({
      formId: divergences[0]!.formId,
      fieldId: "*",
      kind: "text",
      mode: "shadow",
      resolvedComponent: "legacy",
      divergenceType: "hard",
      deviceContext: getFormUxDeviceClass(),
      eventType: "submit_reconciliation",
      snapshotHash,
      executionToken: executionToken ? String(executionToken.seq) : undefined,
      ts: Date.now(),
    });
  }
}

export function resolveFormSubmitPayload<T extends Record<string, unknown>>(
  formId: FormUxFormId,
  legacyState: T,
  submitToken?: FormUxExecutionToken,
): T {
  const token = submitToken ?? beginSubmitTransaction(formId);
  if (!isFormSubmitTokenValid(formId, token)) {
    return legacyState;
  }

  const result = atomicFormSubmitTransaction({
    formId,
    token,
    legacyState,
    reportDivergences: (divergences, snapshotHash) => {
      reportSubmitDivergences(divergences, snapshotHash, token);
    },
  });

  if (!result.ok || !result.value) {
    return legacyState;
  }

  return result.value.payload;
}
