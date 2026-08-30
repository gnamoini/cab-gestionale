"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type FocusEvent,
  type RefObject,
} from "react";
import { gateFieldEvaluation } from "@/lib/form-ux-migration/form-ux-boundary-gate";
import {
  recordFieldBlurEvent,
  recordFieldChangeEvent,
} from "@/lib/form-ux-migration/auto-rollback-engine";
import { recordHydrationMismatch } from "@/lib/form-ux-migration/enforcement-guardrails";
import {
  createFormUxExecutionToken,
  type FormUxExecutionToken,
} from "@/lib/form-ux-migration/form-ux-execution-token";
import { getFormUxFieldSnapshot } from "@/lib/form-ux-migration/form-ux-field-registry";
import { normalizeFormUxValue } from "@/lib/form-ux-migration/normalize-and-compare";
import { resolveFieldEnforcement } from "@/lib/form-ux-migration/resolve-field-enforcement";
import { resolveFormFieldMode } from "@/lib/form-ux-migration/resolve-form-field-mode";
import { runEnforcementEvaluation } from "@/lib/form-ux-migration/run-enforcement-evaluation";
import { runShadowEvaluation } from "@/lib/form-ux-migration/run-shadow-evaluation";
import { FORM_UX_SHADOW_DEBOUNCE_MS } from "@/lib/form-ux-migration/shadow-config";
import { emitFormUxMigrationEvent } from "@/lib/form-ux-migration/telemetry";
import type { FormUxFieldId, FormUxFormId, FormUxInputKind } from "@/lib/form-ux-migration/types";

export type UseFormUxFieldEvaluationOptions = {
  formId: FormUxFormId;
  fieldId: FormUxFieldId;
  kind: FormUxInputKind;
  inputRef: RefObject<HTMLInputElement | null>;
  /** Current controlled value — used for hydration check on mount. */
  value: string;
};

export type FormUxFieldEvaluationHandlers = {
  onChangeValue: (value: string) => void;
  syncLatestValue: (value: string) => void;
  onBlur: (e: FocusEvent<HTMLInputElement>) => void;
  onCompositionStart: () => void;
  onCompositionEnd: () => void;
  evaluationEnabled: boolean;
};

export function useFormUxFieldEvaluation({
  formId,
  fieldId,
  kind,
  inputRef,
  value,
}: UseFormUxFieldEvaluationOptions): FormUxFieldEvaluationHandlers {
  const latestValueRef = useRef(value);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const composingRef = useRef(false);
  const hydrationCheckedRef = useRef(false);
  const executionTokenRef = useRef<FormUxExecutionToken | null>(null);

  const modeRes = resolveFormFieldMode(formId, fieldId, kind);
  const enforcementRes = resolveFieldEnforcement(formId, fieldId);
  const shadowEnabled = modeRes.effectiveMode === "shadow";
  const enforcementEnabled = enforcementRes.effectiveEnforcement !== "off";
  const evaluationEnabled = shadowEnabled || enforcementEnabled;

  const clearDebounce = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const runEvaluation = useCallback(
    (legacyValue: string, trigger: "change" | "blur" | "commit") => {
      if (!evaluationEnabled || composingRef.current) return;

      const token = executionTokenRef.current ?? createFormUxExecutionToken(formId, fieldId);
      const legacyState = { [fieldId]: legacyValue };

      const result = gateFieldEvaluation({
        formId,
        fieldId,
        kind,
        token,
        legacyState,
        onCompute: () => {
          if (shadowEnabled) {
            runShadowEvaluation({ formId, fieldId, kind, legacyValue, trigger });
          }
          if (enforcementEnabled) {
            runEnforcementEvaluation({ formId, fieldId, kind, legacyValue, trigger });
          }
        },
      });

      if (result.stale && process.env.NODE_ENV === "development") {
        emitFormUxMigrationEvent({
          formId,
          fieldId,
          kind,
          mode: modeRes.effectiveMode,
          resolvedComponent: "legacy",
          enforcement: enforcementRes.effectiveEnforcement,
          eventType: "evaluation",
          trigger,
          isStaleEvaluation: true,
          executionToken: String(token.seq),
          snapshotHash: result.snapshotHash || undefined,
          ts: Date.now(),
        });
      }
    },
    [
      evaluationEnabled,
      shadowEnabled,
      enforcementEnabled,
      formId,
      fieldId,
      kind,
      modeRes.effectiveMode,
      enforcementRes.effectiveEnforcement,
    ],
  );

  const scheduleChangeEvaluation = useCallback(
    (val: string) => {
      clearDebounce();
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        runEvaluation(val, "change");
      }, FORM_UX_SHADOW_DEBOUNCE_MS);
    },
    [clearDebounce, runEvaluation],
  );

  const syncLatestValue = useCallback((val: string) => {
    latestValueRef.current = val;
  }, []);

  const onChangeValue = useCallback(
    (val: string) => {
      if (!evaluationEnabled) return;
      latestValueRef.current = val;
      executionTokenRef.current = createFormUxExecutionToken(formId, fieldId);
      recordFieldChangeEvent(formId, fieldId);
      if (composingRef.current) return;
      scheduleChangeEvaluation(val);
    },
    [evaluationEnabled, formId, fieldId, scheduleChangeEvaluation],
  );

  const onBlur = useCallback(
    () => {
      if (!evaluationEnabled) return;
      clearDebounce();
      executionTokenRef.current = createFormUxExecutionToken(formId, fieldId);
      recordFieldBlurEvent(formId, fieldId);
      const val = latestValueRef.current;
      if (!composingRef.current) {
        runEvaluation(val, "blur");
      }
    },
    [evaluationEnabled, formId, fieldId, clearDebounce, runEvaluation],
  );

  const onCompositionStart = useCallback(() => {
    composingRef.current = true;
    clearDebounce();
  }, [clearDebounce]);

  const onCompositionEnd = useCallback(() => {
    composingRef.current = false;
    executionTokenRef.current = createFormUxExecutionToken(formId, fieldId);
    runEvaluation(latestValueRef.current, "blur");
  }, [formId, fieldId, runEvaluation]);

  useEffect(() => {
    if (!evaluationEnabled) return;

    const input = inputRef.current;
    if (!input) return;

    const form = input.closest("form");
    if (!form) return;

    const handleSubmit = () => {
      clearDebounce();
      executionTokenRef.current = createFormUxExecutionToken(formId, fieldId);
      runEvaluation(latestValueRef.current, "commit");
    };

    form.addEventListener("submit", handleSubmit, { capture: true });
    return () => {
      form.removeEventListener("submit", handleSubmit, { capture: true });
    };
  }, [evaluationEnabled, inputRef, clearDebounce, runEvaluation, formId, fieldId]);

  useEffect(() => {
    return () => clearDebounce();
  }, [clearDebounce]);

  useEffect(() => {
    latestValueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (!enforcementEnabled || hydrationCheckedRef.current) return;
    hydrationCheckedRef.current = true;

    const snapshot = getFormUxFieldSnapshot(formId, fieldId);
    if (!snapshot) return;

    const normalizedProp = normalizeFormUxValue(kind, value);
    if (normalizedProp !== snapshot.normalizedSsot) {
      recordHydrationMismatch(
        formId,
        fieldId,
        kind,
        enforcementRes.effectiveEnforcement,
      );
    }
  }, [enforcementEnabled, formId, fieldId, kind, value, enforcementRes.effectiveEnforcement]);

  return {
    onChangeValue,
    syncLatestValue,
    onBlur,
    onCompositionStart,
    onCompositionEnd,
    evaluationEnabled,
  };
}
