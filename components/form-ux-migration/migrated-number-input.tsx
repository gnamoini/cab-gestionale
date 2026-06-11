"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  type ChangeEvent,
  type FocusEvent,
  type InputHTMLAttributes,
} from "react";
import { GestionaleNumberInput } from "@/components/gestionale/gestionale-number-input";
import { useFormUxFieldEvaluation } from "@/components/form-ux-migration/use-form-ux-field-evaluation";
import { resolveFormFieldMode } from "@/lib/form-ux-migration/resolve-form-field-mode";
import { emitFormUxMigrationEvent } from "@/lib/form-ux-migration/telemetry";
import type { FormUxFieldId, FormUxFormId } from "@/lib/form-ux-migration/types";
import { useFormUxMigrationContext } from "@/components/form-ux-migration/form-ux-migration-provider";

export type MigratedNumberInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "className"
> & {
  formId: FormUxFormId;
  fieldId: FormUxFieldId;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  invalid?: boolean;
  inputMode?: "decimal" | "numeric";
};

const LegacyNumberInput = forwardRef<
  HTMLInputElement,
  Omit<MigratedNumberInputProps, "formId" | "fieldId">
>(function LegacyNumberInput(
  {
    value,
    onChange,
    className = "",
    invalid = false,
    inputMode = "decimal",
    onBlur,
    onCompositionStart,
    onCompositionEnd,
    ...rest
  },
  ref,
) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <input
      ref={ref}
      type="number"
      inputMode={inputMode}
      value={value}
      onChange={handleChange}
      onBlur={onBlur}
      onCompositionStart={onCompositionStart}
      onCompositionEnd={onCompositionEnd}
      aria-invalid={invalid || undefined}
      className={className}
      {...rest}
    />
  );
});

export function MigratedNumberInput({
  formId: formIdProp,
  fieldId,
  value,
  onChange,
  className = "",
  invalid = false,
  inputMode = "decimal",
  onBlur: onBlurProp,
  ...rest
}: MigratedNumberInputProps) {
  const ctx = useFormUxMigrationContext();
  const formId = ctx?.formId ?? formIdProp;
  const resolution = resolveFormFieldMode(formId, fieldId, "number");
  const { activeOnChange, effectiveMode, effectiveEnforcement } = resolution;
  const inputRef = useRef<HTMLInputElement>(null);
  const useLegacyRender = effectiveMode === "legacy" || effectiveMode === "shadow";

  const fieldEval = useFormUxFieldEvaluation({
    formId,
    fieldId,
    kind: "number",
    inputRef,
    value,
  });

  const handleLegacyChange = useCallback(
    (v: string) => {
      onChange(v);
      if (fieldEval.evaluationEnabled) {
        fieldEval.onChangeValue(v);
      }
    },
    [onChange, fieldEval],
  );

  const handleBlur = useCallback(
    (e: FocusEvent<HTMLInputElement>) => {
      if (fieldEval.evaluationEnabled) {
        fieldEval.onBlur(e);
      }
      onBlurProp?.(e);
    },
    [fieldEval, onBlurProp],
  );

  useEffect(() => {
    if (fieldEval.evaluationEnabled) {
      fieldEval.syncLatestValue(value);
    }
  }, [fieldEval, value]);

  useEffect(() => {
    emitFormUxMigrationEvent({
      formId,
      fieldId,
      kind: "number",
      mode: effectiveMode,
      enforcement: effectiveEnforcement,
      resolvedComponent: activeOnChange,
      ts: Date.now(),
    });
  }, [formId, fieldId, effectiveMode, effectiveEnforcement, activeOnChange]);

  const sharedProps = {
    className,
    invalid,
    inputMode,
    onBlur: handleBlur,
    onCompositionStart: fieldEval.evaluationEnabled
      ? fieldEval.onCompositionStart
      : undefined,
    onCompositionEnd: fieldEval.evaluationEnabled
      ? fieldEval.onCompositionEnd
      : undefined,
    ...rest,
  };

  if (useLegacyRender) {
    return (
      <LegacyNumberInput
        ref={inputRef}
        value={value}
        onChange={handleLegacyChange}
        {...sharedProps}
      />
    );
  }

  return (
    <GestionaleNumberInput
      value={value}
      onChange={onChange}
      {...sharedProps}
    />
  );
}
