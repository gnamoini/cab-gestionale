import type { FormUxFormId, FormUxFieldId } from "@/lib/form-ux-migration/types";

export const MISMATCH_ROLLBACK_THRESHOLD = 5;
export const MISMATCH_ROLLBACK_WINDOW_MS = 60_000;

type MismatchWindow = {
  timestamps: number[];
};

const mismatchWindows = new Map<string, MismatchWindow>();

function fieldKey(formId: FormUxFormId, fieldId: FormUxFieldId): string {
  return `${formId}.${fieldId}`;
}

/** Record shadow mismatch for telemetry counters only — no rollback side-effects. */
export function recordFormUxMismatch(formId: FormUxFormId, fieldId: FormUxFieldId): boolean {
  const key = fieldKey(formId, fieldId);
  const now = Date.now();
  const window = mismatchWindows.get(key) ?? { timestamps: [] };
  window.timestamps = window.timestamps.filter((t) => now - t < MISMATCH_ROLLBACK_WINDOW_MS);
  window.timestamps.push(now);
  mismatchWindows.set(key, window);
  return window.timestamps.length >= MISMATCH_ROLLBACK_THRESHOLD;
}

/** DEV/test helper — deep-freeze compare of migrated field snapshots. */
export function assertSubmitPayloadUnchanged<T extends Record<string, unknown>>(
  before: T,
  after: T,
  fields: (keyof T)[],
): void {
  for (const field of fields) {
    const b = JSON.stringify(before[field]);
    const a = JSON.stringify(after[field]);
    if (b !== a) {
      throw new Error(`Submit payload invariant violated for field "${String(field)}": ${b} !== ${a}`);
    }
  }
}

/** Test helper. */
export function resetShadowGuardrails(): void {
  mismatchWindows.clear();
}
