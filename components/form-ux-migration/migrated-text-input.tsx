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
import { dsInput } from "@/lib/ui/design-system";
import { resolveGestionaleInputClassName } from "@/lib/ui/global-input";
import { useFormUxFieldEvaluation } from "@/components/form-ux-migration/use-form-ux-field-evaluation";
import { resolveFormFieldMode } from "@/lib/form-ux-migration/resolve-form-field-mode";
import { emitFormUxMigrationEvent } from "@/lib/form-ux-migration/telemetry";
import type { FormUxFieldId, FormUxFormId } from "@/lib/form-ux-migration/types";
import { useFormUxMigrationContext } from "@/components/form-ux-migration/form-ux-migration-provider";

export type MigratedTextInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "className"
> & {
  formId: FormUxFormId;
  fieldId: FormUxFieldId;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  invalid?: boolean;
};

const LegacyTextInput = forwardRef<
  HTMLInputElement,
  Omit<MigratedTextInputProps, "formId" | "fieldId">
>(function LegacyTextInput(
  {
    value,
    onChange,
    className = "",
    invalid = false,
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
      type="text"
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

function SsotTextInput({
  value,
  onChange,
  className = "",
  invalid = false,
  ...rest
}: Omit<MigratedTextInputProps, "formId" | "fieldId">) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <input
      type="text"
      value={value}
      onChange={handleChange}
      aria-invalid={invalid || undefined}
      className={resolveGestionaleInputClassName(`${dsInput} ${className}`.trim(), invalid)}
      {...rest}
    />
  );
}

export function MigratedTextInput({
  formId: formIdProp,
  fieldId,
  value,
  onChange,
  className = "",
  invalid = false,
  onBlur: onBlurProp,
  ...rest
}: MigratedTextInputProps) {
  const ctx = useFormUxMigrationContext();
  const formId = ctx?.formId ?? formIdProp;
  const resolution = resolveFormFieldMode(formId, fieldId, "text");
  const { activeOnChange, effectiveMode, effectiveEnforcement } = resolution;
  const inputRef = useRef<HTMLInputElement>(null);
  const useLegacyRender = effectiveMode === "legacy" || effectiveMode === "shadow";

  const fieldEval = useFormUxFieldEvaluation({
    formId,
    fieldId,
    kind: "text",
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
      kind: "text",
      mode: effectiveMode,
      enforcement: effectiveEnforcement,
      resolvedComponent: activeOnChange,
      ts: Date.now(),
    });
  }, [formId, fieldId, effectiveMode, effectiveEnforcement, activeOnChange]);

  const sharedProps = {
    className,
    invalid,
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
      <LegacyTextInput
        ref={inputRef}
        value={value}
        onChange={handleLegacyChange}
        {...sharedProps}
      />
    );
  }

  return <SsotTextInput value={value} onChange={onChange} {...sharedProps} />;
}
