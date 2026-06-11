import type { FormUxFieldId, FormUxFormId } from "@/lib/form-ux-migration/types";

const fieldLockDepth = new Map<string, number>();
const formSubmitLockDepth = new Map<string, number>();

function fieldKey(formId: FormUxFormId, fieldId: FormUxFieldId): string {
  return `${formId}.${fieldId}`;
}

export function isRolloutTransactionActive(
  formId: FormUxFormId,
  fieldId: FormUxFieldId,
): boolean {
  return (fieldLockDepth.get(fieldKey(formId, fieldId)) ?? 0) > 0;
}

export function isFormSubmitTransactionActive(formId: FormUxFormId): boolean {
  return (formSubmitLockDepth.get(formId) ?? 0) > 0;
}

export function withRolloutStateLock<T>(
  formId: FormUxFormId,
  fieldId: FormUxFieldId,
  fn: () => T,
): T {
  const key = fieldKey(formId, fieldId);
  const depth = fieldLockDepth.get(key) ?? 0;
  fieldLockDepth.set(key, depth + 1);
  try {
    return fn();
  } finally {
    const next = (fieldLockDepth.get(key) ?? 1) - 1;
    if (next <= 0) {
      fieldLockDepth.delete(key);
    } else {
      fieldLockDepth.set(key, next);
    }
  }
}

export function withFormSubmitLock<T>(formId: FormUxFormId, fn: () => T): T {
  const depth = formSubmitLockDepth.get(formId) ?? 0;
  formSubmitLockDepth.set(formId, depth + 1);
  try {
    return fn();
  } finally {
    const next = (formSubmitLockDepth.get(formId) ?? 1) - 1;
    if (next <= 0) {
      formSubmitLockDepth.delete(formId);
    } else {
      formSubmitLockDepth.set(formId, next);
    }
  }
}

/** Test helper. */
export function resetRolloutStateLocks(): void {
  fieldLockDepth.clear();
  formSubmitLockDepth.clear();
}
