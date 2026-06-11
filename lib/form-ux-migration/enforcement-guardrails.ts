import {
  detectIosFocusBlurLoop,
  evaluateAutoRollback,
  recordAutoRollbackEvaluation,
} from "@/lib/form-ux-migration/auto-rollback-engine";
import { isRolloutTransactionActive } from "@/lib/form-ux-migration/rollout-state-lock";
import { gateRollbackDispatch } from "@/lib/form-ux-migration/form-ux-boundary-gate";
import { readRolloutState } from "@/lib/form-ux-migration/rollout-state-store";
import {
  FORM_UX_HYDRATION_SPIKE_THRESHOLD,
  FORM_UX_HYDRATION_SPIKE_WINDOW_MS,
  FORM_UX_MISMATCH_RATE_THRESHOLD,
  FORM_UX_MISMATCH_RATE_WINDOW_MS,
} from "@/lib/form-ux-migration/shadow-config";
import type {
  FormUxEnforcementLevel,
  FormUxFieldId,
  FormUxFormId,
  FormUxInputKind,
} from "@/lib/form-ux-migration/types";

export type EnforcementRollbackReason =
  | "mismatch_rate"
  | "submit_divergence"
  | "hydration_spike";

type FieldMetrics = {
  evaluations: { ts: number; mismatch: boolean }[];
  hydrationMismatches: number[];
  submitDivergences: number;
  submitAttempts: number;
};

export type FormUxFieldMetricsSnapshot = {
  evaluations: { ts: number; mismatch: boolean }[];
  hydrationMismatches: number[];
  submitDivergences: number;
  submitAttempts: number;
  iosFocusBlurLoop: boolean;
};

export type FormUxMetricsSnapshot = ReadonlyMap<string, FormUxFieldMetricsSnapshot>;

const fieldMetrics = new Map<string, FieldMetrics>();

type DeferredGuardrailAction =
  | {
      type: "auto_rollback";
      formId: FormUxFormId;
      fieldId: FormUxFieldId;
      kind: FormUxInputKind;
      currentEnforcement: FormUxEnforcementLevel;
      fallbackReason: EnforcementRollbackReason | "ios_focus_blur_loop";
    }
  | {
      type: "downgrade";
      formId: FormUxFormId;
      fieldId: FormUxFieldId;
      kind: FormUxInputKind;
      currentEnforcement: FormUxEnforcementLevel;
      reason: EnforcementRollbackReason;
    }
  | {
      type: "submit_divergence";
      formId: FormUxFormId;
      fieldId: FormUxFieldId;
      kind: FormUxInputKind;
      currentEnforcement: FormUxEnforcementLevel;
    };

const deferredGuardrailQueue: DeferredGuardrailAction[] = [];
let guardrailFlushScheduled = false;

function scheduleGuardrailFlush(): void {
  if (guardrailFlushScheduled) return;
  guardrailFlushScheduled = true;
  queueMicrotask(() => {
    guardrailFlushScheduled = false;
    flushDeferredGuardrailActions();
  });
}

function flushDeferredGuardrailActions(): void {
  const pending = deferredGuardrailQueue.splice(0);
  for (const action of pending) {
    if (isRolloutTransactionActive(action.formId, action.fieldId)) {
      deferredGuardrailQueue.push(action);
      scheduleGuardrailFlush();
      continue;
    }
    if (action.type === "auto_rollback") {
      requestAutoRollback(
        action.formId,
        action.fieldId,
        action.kind,
        action.currentEnforcement,
        action.fallbackReason,
      );
    } else if (action.type === "downgrade") {
      requestEnforcementDowngrade(
        action.formId,
        action.fieldId,
        action.kind,
        action.currentEnforcement,
        action.reason,
      );
    } else {
      processSubmitDivergenceRollback(
        action.formId,
        action.fieldId,
        action.kind,
        action.currentEnforcement,
      );
    }
  }
}

function deferGuardrailAction(action: DeferredGuardrailAction): void {
  deferredGuardrailQueue.push(action);
  scheduleGuardrailFlush();
}

function fieldKey(formId: FormUxFormId, fieldId: FormUxFieldId): string {
  return `${formId}.${fieldId}`;
}

function getMetrics(key: string): FieldMetrics {
  const existing = fieldMetrics.get(key);
  if (existing) return existing;
  const created: FieldMetrics = {
    evaluations: [],
    hydrationMismatches: [],
    submitDivergences: 0,
    submitAttempts: 0,
  };
  fieldMetrics.set(key, created);
  return created;
}

function requestAutoRollback(
  formId: FormUxFormId,
  fieldId: FormUxFieldId,
  kind: FormUxInputKind,
  currentEnforcement: FormUxEnforcementLevel,
  fallbackReason: EnforcementRollbackReason | "ios_focus_blur_loop",
): boolean {
  const evaluation = evaluateAutoRollback({
    formId,
    fieldId,
    kind,
    currentState: currentEnforcement,
  });
  if (!evaluation.triggered) return false;

  const fromState = readRolloutState(formId, fieldId) ?? currentEnforcement;
  gateRollbackDispatch({
    formId,
    fieldId,
    kind,
    currentState: currentEnforcement,
    fromState,
    action: "off",
    reason: "auto_rollback",
    rollbackReason: evaluation.reason ?? fallbackReason,
  });
  return true;
}

function requestEnforcementDowngrade(
  formId: FormUxFormId,
  fieldId: FormUxFieldId,
  kind: FormUxInputKind,
  currentEnforcement: FormUxEnforcementLevel,
  reason: EnforcementRollbackReason,
): void {
  const fromState = readRolloutState(formId, fieldId) ?? currentEnforcement;
  gateRollbackDispatch({
    formId,
    fieldId,
    kind,
    currentState: currentEnforcement,
    fromState,
    action: "downgrade_one",
    reason: "enforcement_downgrade",
    rollbackReason: reason,
  });
}

export function recordEnforcementEvaluation(
  formId: FormUxFormId,
  fieldId: FormUxFieldId,
  mismatch: boolean,
  currentEnforcement: FormUxEnforcementLevel,
  kind: FormUxInputKind,
): void {
  if (currentEnforcement === "off") return;

  const key = fieldKey(formId, fieldId);
  const metrics = getMetrics(key);
  const now = Date.now();
  metrics.evaluations = metrics.evaluations.filter(
    (e) => now - e.ts < FORM_UX_MISMATCH_RATE_WINDOW_MS,
  );
  metrics.evaluations.push({ ts: now, mismatch });

  recordAutoRollbackEvaluation(formId, fieldId, mismatch);

  if (isRolloutTransactionActive(formId, fieldId)) {
    deferGuardrailAction({
      type: "auto_rollback",
      formId,
      fieldId,
      kind,
      currentEnforcement,
      fallbackReason: "mismatch_rate",
    });
    return;
  }

  if (requestAutoRollback(formId, fieldId, kind, currentEnforcement, "mismatch_rate")) {
    return;
  }

  const total = metrics.evaluations.length;
  const mismatches = metrics.evaluations.filter((e) => e.mismatch).length;
  const rate = total > 0 ? mismatches / total : 0;

  if (total >= 10 && rate > FORM_UX_MISMATCH_RATE_THRESHOLD) {
    if (isRolloutTransactionActive(formId, fieldId)) {
      deferGuardrailAction({
        type: "downgrade",
        formId,
        fieldId,
        kind,
        currentEnforcement,
        reason: "mismatch_rate",
      });
    } else {
      requestEnforcementDowngrade(formId, fieldId, kind, currentEnforcement, "mismatch_rate");
    }
  }
}

export function recordHydrationMismatch(
  formId: FormUxFormId,
  fieldId: FormUxFieldId,
  kind: FormUxInputKind,
  currentEnforcement: FormUxEnforcementLevel,
): void {
  if (currentEnforcement === "off") return;

  const key = fieldKey(formId, fieldId);
  const metrics = getMetrics(key);
  const now = Date.now();
  metrics.hydrationMismatches = metrics.hydrationMismatches.filter(
    (t) => now - t < FORM_UX_HYDRATION_SPIKE_WINDOW_MS,
  );
  metrics.hydrationMismatches.push(now);

  if (isRolloutTransactionActive(formId, fieldId)) {
    deferGuardrailAction({
      type: "auto_rollback",
      formId,
      fieldId,
      kind,
      currentEnforcement,
      fallbackReason: "hydration_spike",
    });
    return;
  }

  if (requestAutoRollback(formId, fieldId, kind, currentEnforcement, "hydration_spike")) {
    return;
  }

  if (metrics.hydrationMismatches.length >= FORM_UX_HYDRATION_SPIKE_THRESHOLD) {
    if (isRolloutTransactionActive(formId, fieldId)) {
      deferGuardrailAction({
        type: "downgrade",
        formId,
        fieldId,
        kind,
        currentEnforcement,
        reason: "hydration_spike",
      });
    } else {
      requestEnforcementDowngrade(formId, fieldId, kind, currentEnforcement, "hydration_spike");
    }
  }
}

export function isHydrationStable(
  formId: FormUxFormId,
  fieldId: FormUxFieldId,
): boolean {
  const metrics = fieldMetrics.get(fieldKey(formId, fieldId));
  if (!metrics) return true;
  const now = Date.now();
  const recent = metrics.hydrationMismatches.filter(
    (t) => now - t < FORM_UX_HYDRATION_SPIKE_WINDOW_MS,
  );
  return recent.length < FORM_UX_HYDRATION_SPIKE_THRESHOLD;
}

/** Metrics-only during submit — no rollback side-effects. */
export function recordSubmitDivergenceMetrics(
  formId: FormUxFormId,
  fieldId: FormUxFieldId,
  critical: boolean,
): void {
  const key = fieldKey(formId, fieldId);
  const metrics = getMetrics(key);
  metrics.submitAttempts += 1;
  if (critical) {
    metrics.submitDivergences += 1;
  }
}

/** Deferred rollback after submit — called from evaluation sync path. */
export function processSubmitDivergenceRollback(
  formId: FormUxFormId,
  fieldId: FormUxFieldId,
  kind: FormUxInputKind,
  currentEnforcement: FormUxEnforcementLevel,
): void {
  if (currentEnforcement === "off") return;

  if (requestAutoRollback(formId, fieldId, kind, currentEnforcement, "submit_divergence")) {
    return;
  }

  const metrics = fieldMetrics.get(fieldKey(formId, fieldId));
  if (metrics && metrics.submitDivergences >= 1) {
    requestEnforcementDowngrade(formId, fieldId, kind, currentEnforcement, "submit_divergence");
  }
}

export function snapshotEnforcementMetrics(): FormUxMetricsSnapshot {
  const out = new Map<string, FormUxFieldMetricsSnapshot>();
  for (const [key, metrics] of fieldMetrics) {
    const [formId, fieldId] = key.split(".") as [FormUxFormId, FormUxFieldId];
    out.set(key, {
      evaluations: metrics.evaluations.map((e) => ({ ...e })),
      hydrationMismatches: [...metrics.hydrationMismatches],
      submitDivergences: metrics.submitDivergences,
      submitAttempts: metrics.submitAttempts,
      iosFocusBlurLoop: detectIosFocusBlurLoop(formId, fieldId),
    });
  }
  return out;
}

export function getFieldMismatchRateFromSnapshot(
  snapshot: FormUxMetricsSnapshot,
  formId: FormUxFormId,
  fieldId: FormUxFieldId,
): number {
  const metrics = snapshot.get(fieldKey(formId, fieldId));
  if (!metrics || metrics.evaluations.length === 0) return 0;
  const mismatches = metrics.evaluations.filter((e) => e.mismatch).length;
  return mismatches / metrics.evaluations.length;
}

export function getFieldSubmitDivergenceRateFromSnapshot(
  snapshot: FormUxMetricsSnapshot,
  formId: FormUxFormId,
  fieldId: FormUxFieldId,
): number {
  const metrics = snapshot.get(fieldKey(formId, fieldId));
  if (!metrics || metrics.submitAttempts === 0) return 0;
  return metrics.submitDivergences / metrics.submitAttempts;
}

export function isHydrationStableFromSnapshot(
  snapshot: FormUxMetricsSnapshot,
  formId: FormUxFormId,
  fieldId: FormUxFieldId,
): boolean {
  const metrics = snapshot.get(fieldKey(formId, fieldId));
  if (!metrics) return true;
  const now = Date.now();
  const recent = metrics.hydrationMismatches.filter(
    (t) => now - t < FORM_UX_HYDRATION_SPIKE_WINDOW_MS,
  );
  return recent.length < FORM_UX_HYDRATION_SPIKE_THRESHOLD;
}

export function getIosFocusBlurLoopFromSnapshot(
  snapshot: FormUxMetricsSnapshot,
  formId: FormUxFormId,
  fieldId: FormUxFieldId,
): boolean {
  return snapshot.get(fieldKey(formId, fieldId))?.iosFocusBlurLoop ?? false;
}

export function getFieldMismatchRate(
  formId: FormUxFormId,
  fieldId: FormUxFieldId,
): number {
  const metrics = fieldMetrics.get(fieldKey(formId, fieldId));
  if (!metrics || metrics.evaluations.length === 0) return 0;
  const mismatches = metrics.evaluations.filter((e) => e.mismatch).length;
  return mismatches / metrics.evaluations.length;
}

export function getFieldSubmitDivergenceRate(
  formId: FormUxFormId,
  fieldId: FormUxFieldId,
): number {
  const metrics = fieldMetrics.get(fieldKey(formId, fieldId));
  if (!metrics || metrics.submitAttempts === 0) return 0;
  return metrics.submitDivergences / metrics.submitAttempts;
}

/** Test helper — reset in-memory metrics. */
export function resetEnforcementGuardrails(): void {
  fieldMetrics.clear();
  deferredGuardrailQueue.length = 0;
  guardrailFlushScheduled = false;
}
