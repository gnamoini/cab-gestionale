"use client";

import type { InputHTMLAttributes } from "react";
import { GestionaleNumberInput } from "@/components/gestionale/gestionale-number-input";
import type { NumericInputPreset } from "@/lib/core/numeric-input-policy";
import { useGestionaleNumericDraft } from "@/lib/ui/use-gestionale-numeric-draft";
import { dsInputNoSpinner } from "@/lib/ui/design-system";

export type GestionaleNumericFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "onBlur" | "onFocus" | "inputMode"
> & {
  value: number;
  preset: NumericInputPreset;
  onCommit: (value: number) => void;
  className?: string;
  invalid?: boolean;
};

export function GestionaleNumericField({
  value,
  preset,
  onCommit,
  className = "",
  invalid = false,
  readOnly,
  ...rest
}: GestionaleNumericFieldProps) {
  const { draft, inputMode, onChange, onFocus, onBlur, onKeyDown } = useGestionaleNumericDraft({
    value,
    preset,
    onCommit,
    readOnly: !!readOnly,
  });

  return (
    <GestionaleNumberInput
      value={draft}
      onChange={onChange}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      inputMode={inputMode}
      readOnly={readOnly}
      invalid={invalid}
      className={`${dsInputNoSpinner} tabular-nums ${className}`.trim()}
      {...rest}
    />
  );
}
