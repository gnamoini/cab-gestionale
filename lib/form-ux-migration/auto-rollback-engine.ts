import {
  FORM_UX_AUTO_ROLLBACK_MISMATCH_RATE,
  FORM_UX_AUTO_ROLLBACK_SUBMIT_DIVERGENCE_RATE,
  FORM_UX_AUTO_ROLLBACK_WINDOW_MS,
  FORM_UX_IOS_FOCUS_BLUR_LOOP_THRESHOLD,
  FORM_UX_IOS_FOCUS_BLUR_LOOP_WINDOW_MS,
} from "@/lib/form-ux-migration/shadow-config";
import {
  getFieldMismatchRate,
  getFieldSubmitDivergenceRate,
} from "@/lib/form-ux-migration/enforcement-guardrails";
import {
  type RolloutState,
} from "@/lib/form-ux-migration/rollout-state-machine";
import type {
  FormUxFieldId,
  FormUxFormId,
  FormUxInputKind,
} from "@/lib/form-ux-migration/types";

export type AutoRollbackReason =
  | "mismatch_rate"
  | "submit_divergence"
  | "hydration_spike"
  | "ios_focus_blur_loop";

type FocusBlurMetrics = {
  blurTimestamps: number[];
  lastChangeTs: number;
};

const focusBlurMetrics = new Map<string, FocusBlurMetrics>();
const autoRollbackShortWindow = new Map<
  string,
  { evaluations: { ts: number; mismatch: boolean }[] }
>();

function fieldKey(formId: FormUxFormId, fieldId: FormUxFieldId): string {
  return `${formId}.${fieldId}`;
}

export function recordFieldBlurEvent(formId: FormUxFormId, fieldId: FormUxFieldId): void {
  const key = fieldKey(formId, fieldId);
  const metrics = focusBlurMetrics.get(key) ?? { blurTimestamps: [], lastChangeTs: 0 };
  const now = Date.now();
  metrics.blurTimestamps = metrics.blurTimestamps.filter(
    (t) => now - t < FORM_UX_IOS_FOCUS_BLUR_LOOP_WINDOW_MS,
  );
  metrics.blurTimestamps.push(now);
  focusBlurMetrics.set(key, metrics);
}

export function recordFieldChangeEvent(formId: FormUxFormId, fieldId: FormUxFieldId): void {
  const key = fieldKey(formId, fieldId);
  const metrics = focusBlurMetrics.get(key) ?? { blurTimestamps: [], lastChangeTs: 0 };
  metrics.lastChangeTs = Date.now();
  focusBlurMetrics.set(key, metrics);
}

export function detectIosFocusBlurLoop(
  formId: FormUxFormId,
  fieldId: FormUxFieldId,
): boolean {
  const key = fieldKey(formId, fieldId);
  const metrics = focusBlurMetrics.get(key);
  if (!metrics) return false;

  const now = Date.now();
  const recentBlurs = metrics.blurTimestamps.filter(
    (t) => now - t < FORM_UX_IOS_FOCUS_BLUR_LOOP_WINDOW_MS,
  );
  const noRecentChange = now - metrics.lastChangeTs > FORM_UX_IOS_FOCUS_BLUR_LOOP_WINDOW_MS;

  return (
    recentBlurs.length >= FORM_UX_IOS_FOCUS_BLUR_LOOP_THRESHOLD && noRecentChange
  );
}

export function recordAutoRollbackEvaluation(
  formId: FormUxFormId,
  fieldId: FormUxFieldId,
  mismatch: boolean,
): void {
  const key = fieldKey(formId, fieldId);
  const now = Date.now();
  const window = autoRollbackShortWindow.get(key) ?? { evaluations: [] };
  window.evaluations = window.evaluations.filter(
    (e) => now - e.ts < FORM_UX_AUTO_ROLLBACK_WINDOW_MS,
  );
  window.evaluations.push({ ts: now, mismatch });
  autoRollbackShortWindow.set(key, window);
}

function getShortWindowMismatchRate(
  formId: FormUxFormId,
  fieldId: FormUxFieldId,
): number {
  const window = autoRollbackShortWindow.get(fieldKey(formId, fieldId));
  if (!window || window.evaluations.length === 0) return 0;
  const mismatches = window.evaluations.filter((e) => e.mismatch).length;
  return mismatches / window.evaluations.length;
}

/** Signal-only — does not mutate rollout state. */
export function evaluateAutoRollback(input: {
  formId: FormUxFormId;
  fieldId: FormUxFieldId;
  kind: FormUxInputKind;
  currentState: RolloutState;
}): { triggered: boolean; reason?: AutoRollbackReason } {
  const { formId, fieldId, currentState } = input;
  if (currentState === "off") return { triggered: false };

  const shortRate = getShortWindowMismatchRate(formId, fieldId);
  if (shortRate > FORM_UX_AUTO_ROLLBACK_MISMATCH_RATE) {
    return { triggered: true, reason: "mismatch_rate" };
  }

  const longRate = getFieldMismatchRate(formId, fieldId);
  if (longRate > FORM_UX_AUTO_ROLLBACK_MISMATCH_RATE) {
    return { triggered: true, reason: "mismatch_rate" };
  }

  const submitRate = getFieldSubmitDivergenceRate(formId, fieldId);
  if (submitRate > FORM_UX_AUTO_ROLLBACK_SUBMIT_DIVERGENCE_RATE) {
    return { triggered: true, reason: "submit_divergence" };
  }

  if (detectIosFocusBlurLoop(formId, fieldId)) {
    return { triggered: true, reason: "ios_focus_blur_loop" };
  }

  return { triggered: false };
}

/** Test helper. */
export function resetAutoRollbackEngine(): void {
  focusBlurMetrics.clear();
  autoRollbackShortWindow.clear();
}
