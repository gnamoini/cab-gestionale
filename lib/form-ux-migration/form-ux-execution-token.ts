import type { FormUxFieldId, FormUxFormId } from "@/lib/form-ux-migration/types";

export type FormUxExecutionToken = {
  id: string;
  seq: number;
  createdAt: number;
};

type TokenState = {
  latestSeq: number;
};

const tokenStateByField = new Map<string, TokenState>();
const submitTokenByForm = new Map<string, FormUxExecutionToken>();

function fieldKey(formId: FormUxFormId, fieldId: FormUxFieldId): string {
  return `${formId}.${fieldId}`;
}

export function createFormUxExecutionToken(
  formId: FormUxFormId,
  fieldId: FormUxFieldId,
): FormUxExecutionToken {
  const key = fieldKey(formId, fieldId);
  const state = tokenStateByField.get(key) ?? { latestSeq: 0 };
  state.latestSeq += 1;
  tokenStateByField.set(key, state);

  return {
    id: key,
    seq: state.latestSeq,
    createdAt: Date.now(),
  };
}

export function invalidateExecutionToken(
  formId: FormUxFormId,
  fieldId: FormUxFieldId,
): void {
  const key = fieldKey(formId, fieldId);
  const state = tokenStateByField.get(key) ?? { latestSeq: 0 };
  state.latestSeq += 1;
  tokenStateByField.set(key, state);
}

export function isExecutionTokenValid(
  formId: FormUxFormId,
  fieldId: FormUxFieldId,
  token: FormUxExecutionToken,
): boolean {
  const key = fieldKey(formId, fieldId);
  const state = tokenStateByField.get(key);
  if (!state) return false;
  return token.id === key && token.seq === state.latestSeq;
}

export function isFormSubmitTokenValid(
  formId: FormUxFormId,
  token: FormUxExecutionToken,
): boolean {
  const latest = submitTokenByForm.get(formId);
  return latest != null && latest.seq === token.seq && latest.id === `${formId}.__submit__`;
}

export function beginSubmitTransaction(formId: FormUxFormId): FormUxExecutionToken {
  const existing = submitTokenByForm.get(formId);
  const seq = (existing?.seq ?? 0) + 1;
  const token: FormUxExecutionToken = {
    id: `${formId}.__submit__`,
    seq,
    createdAt: Date.now(),
  };
  submitTokenByForm.set(formId, token);
  return token;
}

export function getSubmitToken(formId: FormUxFormId): FormUxExecutionToken | null {
  return submitTokenByForm.get(formId) ?? null;
}

/** Test helper. */
export function resetFormUxExecutionTokens(): void {
  tokenStateByField.clear();
  submitTokenByForm.clear();
}
