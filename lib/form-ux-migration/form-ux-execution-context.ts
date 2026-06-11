import type { FormUxExecutionToken } from "@/lib/form-ux-migration/form-ux-execution-token";
import { getFormUxRegistryEntry } from "@/lib/form-ux-migration/form-ux-registry";
import {
  isFormSubmitTransactionActive,
  isRolloutTransactionActive,
} from "@/lib/form-ux-migration/rollout-state-lock";
import type { FormUxDomain, FormUxFieldId, FormUxFormId } from "@/lib/form-ux-migration/types";

export type FormUxExecutionContext = {
  formId: FormUxFormId;
  domain: FormUxDomain;
  submitToken: FormUxExecutionToken | null;
  snapshotCache: ReadonlyMap<string, string>;
  activeFieldTransactions: ReadonlySet<string>;
  activeSubmit: boolean;
};

type MutableContext = {
  formId: FormUxFormId;
  domain: FormUxDomain;
  submitToken: FormUxExecutionToken | null;
  snapshotCache: Map<string, string>;
  activeFieldTransactions: Set<string>;
};

const contextsByFormId = new Map<FormUxFormId, MutableContext>();

function createMutableContext(formId: FormUxFormId): MutableContext {
  const entry = getFormUxRegistryEntry(formId);
  return {
    formId,
    domain: entry?.domain ?? "ricambio",
    submitToken: null,
    snapshotCache: new Map(),
    activeFieldTransactions: new Set(),
  };
}

function toReadonly(ctx: MutableContext): FormUxExecutionContext {
  return {
    formId: ctx.formId,
    domain: ctx.domain,
    submitToken: ctx.submitToken,
    snapshotCache: new Map(ctx.snapshotCache),
    activeFieldTransactions: new Set(ctx.activeFieldTransactions),
    activeSubmit: isFormSubmitTransactionActive(ctx.formId),
  };
}

export function getOrCreateFormUxExecutionContext(
  formId: FormUxFormId,
): FormUxExecutionContext {
  let ctx = contextsByFormId.get(formId);
  if (!ctx) {
    ctx = createMutableContext(formId);
    contextsByFormId.set(formId, ctx);
  }
  return toReadonly(ctx);
}

export function assertFormUxIsolationBoundary(
  sourceFormId: FormUxFormId,
  targetFormId: FormUxFormId,
): void {
  if (sourceFormId !== targetFormId) {
    throw new Error(
      `form-ux isolation violation: ${sourceFormId} → ${targetFormId}`,
    );
  }
}

export function recordSnapshotInContext(
  formId: FormUxFormId,
  snapshotHash: string,
  frozenAt: number,
): void {
  const ctx = contextsByFormId.get(formId) ?? createMutableContext(formId);
  if (!contextsByFormId.has(formId)) {
    contextsByFormId.set(formId, ctx);
  }
  ctx.snapshotCache.set(snapshotHash, String(frozenAt));
}

export function trackFieldTransactionStart(
  formId: FormUxFormId,
  fieldId: FormUxFieldId,
): void {
  const ctx = contextsByFormId.get(formId) ?? createMutableContext(formId);
  if (!contextsByFormId.has(formId)) {
    contextsByFormId.set(formId, ctx);
  }
  ctx.activeFieldTransactions.add(fieldId);
}

export function trackFieldTransactionEnd(
  formId: FormUxFormId,
  fieldId: FormUxFieldId,
): void {
  contextsByFormId.get(formId)?.activeFieldTransactions.delete(fieldId);
}

export function setContextSubmitToken(
  formId: FormUxFormId,
  token: FormUxExecutionToken | null,
): void {
  const ctx = contextsByFormId.get(formId) ?? createMutableContext(formId);
  if (!contextsByFormId.has(formId)) {
    contextsByFormId.set(formId, ctx);
  }
  ctx.submitToken = token;
}

export function isFieldTransactionActiveInContext(
  formId: FormUxFormId,
  fieldId: FormUxFieldId,
): boolean {
  const ctx = contextsByFormId.get(formId);
  if (ctx?.activeFieldTransactions.has(fieldId)) return true;
  return isRolloutTransactionActive(formId, fieldId);
}

/** Test helper. */
export function resetFormUxExecutionContexts(): void {
  contextsByFormId.clear();
}

/** Test helper — attempt cross-form snapshot write (must not affect other form). */
export function tryCrossFormSnapshotContamination(
  sourceFormId: FormUxFormId,
  targetFormId: FormUxFormId,
  snapshotHash: string,
): boolean {
  try {
    assertFormUxIsolationBoundary(sourceFormId, targetFormId);
    recordSnapshotInContext(targetFormId, snapshotHash, Date.now());
    return true;
  } catch {
    return false;
  }
}
