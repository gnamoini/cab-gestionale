"use client";

import type { ChangeEvent, FocusEvent, InputHTMLAttributes } from "react";
import {
  isDecimalInputDraft,
  normalizeDecimalInput,
} from "@/lib/core/decimal-input";
import { dsInput, dsInputNoSpinner } from "@/lib/ui/design-system";
import { resolveGestionaleInputClassName } from "@/lib/ui/global-input";

export type GestionaleNumberInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "className"
> & {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  invalid?: boolean;
  inputMode?: "decimal" | "numeric";
};

export function GestionaleNumberInput({
  value,
  onChange,
  className = "",
  invalid = false,
  inputMode = "decimal",
  min,
  onBlur,
  onFocus: onFocusProp,
  ...rest
}: GestionaleNumberInputProps) {
  const allowNegative = min === undefined || Number(min) < 0;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    if (!isDecimalInputDraft(next, { allowNegative })) return;
    onChange(next);
  };

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    const normalized = normalizeDecimalInput(e.target.value);
    if (normalized !== e.target.value) onChange(normalized);
    onBlur?.(e);
  };

  const handleFocus = (e: FocusEvent<HTMLInputElement>) => {
    e.target.select();
    onFocusProp?.(e);
  };

  return (
    <input
      type="text"
      inputMode={inputMode}
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      aria-invalid={invalid || undefined}
      className={resolveGestionaleInputClassName(`${dsInput} ${dsInputNoSpinner} tabular-nums ${className}`.trim(), invalid)}
      {...rest}
    />
  );
}
