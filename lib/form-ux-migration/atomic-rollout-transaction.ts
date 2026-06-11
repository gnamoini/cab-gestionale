import {
  commitRolloutState,
  computeRolloutEnforcement,
  type RolloutEnforcementResolution,
} from "@/lib/form-ux-migration/rollout-controller";
import {
  isFormSubmitTokenValid,
  isExecutionTokenValid,
  type FormUxExecutionToken,
} from "@/lib/form-ux-migration/form-ux-execution-token";
import { freezeFormUxSnapshot, type FormUxFrozenSnapshot } from "@/lib/form-ux-migration/form-ux-snapshot";
import { schedulePostSubmitRollbackObserver } from "@/lib/form-ux-migration/post-submit-rollback-observer";
import { FORM_UX_ROLLOUT } from "@/lib/form-ux-migration/rollout-config";
import {
  computeFormSubmitPayload,
  type SubmitDivergence,
} from "@/lib/form-ux-migration/resolve-form-submit-payload";
import {
  isFormSubmitTransactionActive,
  withFormSubmitLock,
  withRolloutStateLock,
} from "@/lib/form-ux-migration/rollout-state-lock";
import type { FormUxFieldId, FormUxFormId, FormUxInputKind } from "@/lib/form-ux-migration/types";

export type AtomicRolloutTransactionResult<T> = {
  ok: boolean;
  stale: boolean;
  executionToken: FormUxExecutionToken;
  snapshotHash: string;
  value?: T;
};

type RolloutFieldContext = Pick<
  RolloutEnforcementResolution,
  | "rolloutState"
  | "guardResult"
  | "submitPrecedence"
  | "effectiveEnforcement"
  | "kind"
  | "critical"
>;

function buildRolloutContext(frozen: FormUxFrozenSnapshot) {
  return {
    frozen,
    rolloutStates: frozen.rolloutStates,
    metrics: frozen.metricsSnapshot,
  };
}

function freezeSubmitPayload<T extends Record<string, unknown>>(payload: T): T {
  return Object.freeze(deepClone(payload)) as T;
}

function deepClone<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

export function atomicRolloutTransaction(input: {
  formId: FormUxFormId;
  fieldId: FormUxFieldId;
  kind: FormUxInputKind;
  token: FormUxExecutionToken;
  legacyState?: Record<string, unknown>;
  mode: "evaluation";
  onCompute: (ctx: FormUxFrozenSnapshot) => void;
}): AtomicRolloutTransactionResult<void> {
  const { formId, fieldId, kind, token, legacyState, onCompute } = input;

  if (!isExecutionTokenValid(formId, fieldId, token)) {
    return { ok: false, stale: true, executionToken: token, snapshotHash: "" };
  }

  let snapshotHash = "";

  withRolloutStateLock(formId, fieldId, () => {
    if (!isExecutionTokenValid(formId, fieldId, token)) return;

    const frozen = freezeFormUxSnapshot({
      formId,
      legacyState: legacyState ?? {},
      fieldIds: [fieldId],
    });
    snapshotHash = frozen.snapshotHash;

    const precomputed = computeRolloutEnforcement(formId, fieldId, buildRolloutContext(frozen));
    onCompute(frozen);
    commitRolloutState(formId, fieldId, kind, precomputed);
  });

  if (!isExecutionTokenValid(formId, fieldId, token)) {
    return { ok: false, stale: true, executionToken: token, snapshotHash };
  }

  return { ok: true, stale: false, executionToken: token, snapshotHash };
}

export function atomicFormSubmitTransaction<T extends Record<string, unknown>>(input: {
  formId: FormUxFormId;
  token: FormUxExecutionToken;
  legacyState: T;
  reportDivergences: (divergences: SubmitDivergence[], snapshotHash: string) => void;
}): AtomicRolloutTransactionResult<{ payload: T; divergences: SubmitDivergence[] }> {
  const { formId, token, legacyState, reportDivergences } = input;

  if (!isFormSubmitTokenValid(formId, token)) {
    return { ok: false, stale: true, executionToken: token, snapshotHash: "" };
  }

  const formRollout = FORM_UX_ROLLOUT[formId];
  if (!formRollout) {
    return {
      ok: true,
      stale: false,
      executionToken: token,
      snapshotHash: "",
      value: { payload: legacyState, divergences: [] },
    };
  }

  let result: { payload: T; divergences: SubmitDivergence[] } | undefined;
  let snapshotHash = "";

  withFormSubmitLock(formId, () => {
    if (!isFormSubmitTokenValid(formId, token)) return;

    const frozen = freezeFormUxSnapshot({ formId, legacyState });
    snapshotHash = frozen.snapshotHash;
    const ctx = buildRolloutContext(frozen);

    const rolloutByField = new Map<string, RolloutFieldContext>();
    const fieldIds = Object.keys(formRollout.fields) as FormUxFieldId[];

    for (const fieldId of fieldIds) {
      const precomputed = computeRolloutEnforcement(formId, fieldId, ctx);
      rolloutByField.set(fieldId, {
        rolloutState: precomputed.rolloutState,
        guardResult: precomputed.guardResult,
        submitPrecedence: precomputed.submitPrecedence,
        effectiveEnforcement: precomputed.effectiveEnforcement,
        kind: precomputed.kind,
        critical: precomputed.critical,
      });

      withRolloutStateLock(formId, fieldId, () => {
        if (!isFormSubmitTokenValid(formId, token)) return;
        commitRolloutState(formId, fieldId, precomputed.kind, precomputed);
      });
    }

    if (!isFormSubmitTokenValid(formId, token)) return;

    const computed = computeFormSubmitPayload({
      formId,
      legacyState: frozen.legacyState as T,
      snapshots: frozen.fieldSnapshots,
      rolloutByField,
      ssotByField: frozen.ssotByField,
      fieldConfig: formRollout.fields,
    });

    result = {
      payload: freezeSubmitPayload(computed.payload),
      divergences: computed.divergences,
    };
  });

  if (!isFormSubmitTokenValid(formId, token) || !result) {
    return { ok: false, stale: true, executionToken: token, snapshotHash };
  }

  reportDivergences(result.divergences, snapshotHash);
  schedulePostSubmitRollbackObserver({
    formId,
    divergences: result.divergences,
    executionToken: token,
    snapshotHash,
  });

  return {
    ok: true,
    stale: false,
    executionToken: token,
    snapshotHash,
    value: result,
  };
}

/** Test helper. */
export function isAtomicSubmitInFlight(formId: FormUxFormId): boolean {
  return isFormSubmitTransactionActive(formId);
}
