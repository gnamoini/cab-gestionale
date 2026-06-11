import { downgradeEnforcementLevel } from "@/lib/form-ux-migration/enforcement-levels";
import { getFormUxDeviceClass } from "@/lib/form-ux-migration/device-context";
import { isRolloutTransactionActive } from "@/lib/form-ux-migration/rollout-state-lock";
import {
  type RolloutState,
} from "@/lib/form-ux-migration/rollout-state-machine";
import { writeRolloutState } from "@/lib/form-ux-migration/rollout-state-store";
import {
  emitFormUxMigrationEvent,
  emitFormUxRolloutStateEvent,
} from "@/lib/form-ux-migration/telemetry";
import type {
  FormUxFieldId,
  FormUxFormId,
  FormUxInputKind,
} from "@/lib/form-ux-migration/types";

export type RolloutTransitionReason =
  | "config_progression"
  | "guard_rollback"
  | "guard_downgrade"
  | "auto_rollback"
  | "enforcement_downgrade"
  | "kill_switch";

type DeferredRolloutTransition = {
  formId: FormUxFormId;
  fieldId: FormUxFieldId;
  fromState: RolloutState;
  toState: RolloutState;
  reason: RolloutTransitionReason;
  kind?: FormUxInputKind;
  rollbackReason?: string;
};

const deferredRolloutQueue: DeferredRolloutTransition[] = [];
let rolloutFlushScheduled = false;

function scheduleRolloutFlush(): void {
  if (rolloutFlushScheduled) return;
  rolloutFlushScheduled = true;
  queueMicrotask(() => {
    rolloutFlushScheduled = false;
    flushDeferredRolloutTransitions();
  });
}

function flushDeferredRolloutTransitions(): void {
  const pending = deferredRolloutQueue.splice(0);
  for (const item of pending) {
    if (isRolloutTransactionActive(item.formId, item.fieldId)) {
      deferredRolloutQueue.push(item);
      scheduleRolloutFlush();
      continue;
    }
    applyRolloutTransitionSync(item);
  }
}

/** Synchronous transition — used by atomic commit inside transaction lock. */
export function applyRolloutTransitionSync(input: DeferredRolloutTransition): void {
  const { formId, fieldId, fromState, toState, reason, kind, rollbackReason } = input;
  if (fromState === toState) return;

  writeRolloutState(formId, fieldId, toState);

  emitFormUxRolloutStateEvent({
    formId,
    fieldId,
    fromState,
    toState,
    reason: rollbackReason ?? reason,
    deviceContext: getFormUxDeviceClass(),
    rollbackTriggered: toState === "off" && fromState !== "off",
    ts: Date.now(),
  });

  if (reason === "auto_rollback" && kind) {
    emitFormUxMigrationEvent({
      formId,
      fieldId,
      kind,
      mode: "shadow",
      resolvedComponent: "legacy",
      enforcement: toState,
      eventType: "AUTO_ROLLBACK_TRIGGERED",
      rollbackReason: rollbackReason,
      ts: Date.now(),
    });
    return;
  }

  if (
    (reason === "enforcement_downgrade" || reason === "guard_downgrade") &&
    kind
  ) {
    emitFormUxMigrationEvent({
      formId,
      fieldId,
      kind,
      mode: "shadow",
      resolvedComponent: "legacy",
      enforcement: toState,
      eventType: "ROLLBACK_TRIGGERED",
      rollbackReason: rollbackReason,
      ts: Date.now(),
    });
  }
}

export function executeRolloutTransition(input: DeferredRolloutTransition): void {
  if (isRolloutTransactionActive(input.formId, input.fieldId)) {
    deferredRolloutQueue.push(input);
    scheduleRolloutFlush();
    return;
  }
  applyRolloutTransitionSync(input);
}

/** Test helper. */
export function resetDeferredRolloutQueue(): void {
  deferredRolloutQueue.length = 0;
  rolloutFlushScheduled = false;
}

export function executeRolloutRollback(input: {
  formId: FormUxFormId;
  fieldId: FormUxFieldId;
  kind: FormUxInputKind;
  currentState: RolloutState;
  fromState: RolloutState;
  action: "off" | "downgrade_one";
  reason: RolloutTransitionReason;
  rollbackReason?: string;
}): RolloutState {
  const { formId, fieldId, kind, currentState, fromState, action, reason, rollbackReason } =
    input;

  const toState: RolloutState =
    action === "off" ? "off" : downgradeEnforcementLevel(currentState);

  executeRolloutTransition({
    formId,
    fieldId,
    fromState,
    toState,
    reason,
    kind,
    rollbackReason,
  });

  return toState;
}
