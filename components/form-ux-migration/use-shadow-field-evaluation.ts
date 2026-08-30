"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type FocusEvent,
  type RefObject,
} from "react";
import { runShadowEvaluation } from "@/lib/form-ux-migration/run-shadow-evaluation";
import { FORM_UX_SHADOW_DEBOUNCE_MS } from "@/lib/form-ux-migration/shadow-config";
import type { FormUxFieldId, FormUxFormId, FormUxInputKind } from "@/lib/form-ux-migration/types";

export type UseShadowFieldEvaluationOptions = {
  formId: FormUxFormId;
  fieldId: FormUxFieldId;
  kind: FormUxInputKind;
  inputRef: RefObject<HTMLInputElement | null>;
  enabled: boolean;
};

export type ShadowFieldEvaluationHandlers = {
  onChangeValue: (value: string) => void;
  /** Sync ref without scheduling evaluation (external controlled value updates). */
  syncLatestValue: (value: string) => void;
  onBlur: (e: FocusEvent<HTMLInputElement>) => void;
  onCompositionStart: () => void;
  onCompositionEnd: () => void;
};

export function useShadowFieldEvaluation({
  formId,
  fieldId,
  kind,
  inputRef,
  enabled,
}: UseShadowFieldEvaluationOptions): ShadowFieldEvaluationHandlers {
  const latestValueRef = useRef("");
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const composingRef = useRef(false);

  const clearDebounce = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const evaluate = useCallback(
    (legacyValue: string, trigger: "change" | "blur" | "commit") => {
      if (!enabled || composingRef.current) return;
      runShadowEvaluation({
        formId,
        fieldId,
        kind,
        legacyValue,
        trigger,
      });
    },
    [enabled, formId, fieldId, kind],
  );

  const scheduleChangeEvaluation = useCallback(
    (value: string) => {
      clearDebounce();
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        evaluate(value, "change");
      }, FORM_UX_SHADOW_DEBOUNCE_MS);
    },
    [clearDebounce, evaluate],
  );

  const syncLatestValue = useCallback((value: string) => {
    latestValueRef.current = value;
  }, []);

  const onChangeValue = useCallback(
    (value: string) => {
      if (!enabled) return;
      latestValueRef.current = value;
      if (composingRef.current) return;
      scheduleChangeEvaluation(value);
    },
    [enabled, scheduleChangeEvaluation],
  );

  const onBlur = useCallback(
    () => {
      if (!enabled) return;
      clearDebounce();
      const value = latestValueRef.current;
      if (!composingRef.current) {
        evaluate(value, "blur");
      }
    },
    [enabled, clearDebounce, evaluate],
  );

  const onCompositionStart = useCallback(() => {
    composingRef.current = true;
    clearDebounce();
  }, [clearDebounce]);

  const onCompositionEnd = useCallback(() => {
    composingRef.current = false;
    const value = latestValueRef.current;
    evaluate(value, "blur");
  }, [evaluate]);

  useEffect(() => {
    if (!enabled) return;

    const input = inputRef.current;
    if (!input) return;

    const form = input.closest("form");
    if (!form) return;

    const handleSubmit = () => {
      clearDebounce();
      evaluate(latestValueRef.current, "commit");
    };

    form.addEventListener("submit", handleSubmit, { capture: true });
    return () => {
      form.removeEventListener("submit", handleSubmit, { capture: true });
    };
  }, [enabled, inputRef, clearDebounce, evaluate]);

  useEffect(() => {
    return () => clearDebounce();
  }, [clearDebounce]);

  return {
    onChangeValue,
    syncLatestValue,
    onBlur,
    onCompositionStart,
    onCompositionEnd,
  };
}
