import { getFormUxRegistryEntry } from "@/lib/form-ux-migration/form-ux-registry";
import {
  assertFormUxIsolationBoundary,
} from "@/lib/form-ux-migration/form-ux-execution-context";
import {
  executeRolloutRollback,
  type RolloutTransitionReason,
} from "@/lib/form-ux-migration/rollout-rollback-executor";
import type { RolloutState } from "@/lib/form-ux-migration/rollout-state-machine";
import { readRolloutState } from "@/lib/form-ux-migration/rollout-state-store";
import { emitFormUxCrossFormEvent } from "@/lib/form-ux-migration/telemetry";
import type {
  FormUxFieldId,
  FormUxFormId,
  FormUxInputKind,
} from "@/lib/form-ux-migration/types";

export function canPropagateRollbackAcrossForms(
  sourceFormId: FormUxFormId,
  targetFormId: FormUxFormId,
): boolean {
  if (sourceFormId === targetFormId) return false;

  const sourceEntry = getFormUxRegistryEntry(sourceFormId);
  const targetEntry = getFormUxRegistryEntry(targetFormId);
  if (!sourceEntry || !targetEntry) return false;

  if (sourceEntry.isolationLevel === "strict") return false;
  if (sourceEntry.domain !== targetEntry.domain) return false;

  return false;
}

export function coordinateFormScopedRollback(input: {
  formId: FormUxFormId;
  fieldId: FormUxFieldId;
  kind: FormUxInputKind;
  currentState: RolloutState;
  fromState: RolloutState;
  action: "off" | "downgrade_one";
  reason: RolloutTransitionReason;
  rollbackReason?: string;
  sourceFormId?: FormUxFormId;
}): RolloutState | null {
  const {
    formId,
    fieldId,
    kind,
    currentState,
    fromState,
    action,
    reason,
    rollbackReason,
    sourceFormId = formId,
  } = input;

  if (sourceFormId !== formId) {
    if (canPropagateRollbackAcrossForms(sourceFormId, formId)) {
      return null;
    }
    try {
      assertFormUxIsolationBoundary(sourceFormId, formId);
    } catch {
      const entry = getFormUxRegistryEntry(formId);
      emitFormUxCrossFormEvent({
        formId,
        domain: entry?.domain ?? "ricambio",
        eventType: "isolation_violation_blocked",
        rollbackOccurred: false,
        latencyMs: 0,
        ts: Date.now(),
      });
      return null;
    }
  }

  const entry = getFormUxRegistryEntry(formId);
  const storedBefore = readRolloutState(formId, fieldId);

  const toState = executeRolloutRollback({
    formId,
    fieldId,
    kind,
    currentState,
    fromState,
    action,
    reason,
    rollbackReason,
  });

  emitFormUxCrossFormEvent({
    formId,
    domain: entry?.domain ?? "ricambio",
    eventType: "rollback_scoped",
    rollbackOccurred: toState !== storedBefore,
    latencyMs: 0,
    ts: Date.now(),
  });

  return toState;
}
