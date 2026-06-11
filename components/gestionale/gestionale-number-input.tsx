"use client";

import type { ChangeEvent, InputHTMLAttributes } from "react";
import { dsInput } from "@/lib/ui/design-system";
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
  ...rest
}: GestionaleNumberInputProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <input
      type="number"
      inputMode={inputMode}
      value={value}
      onChange={handleChange}
      aria-invalid={invalid || undefined}
      className={resolveGestionaleInputClassName(`${dsInput} tabular-nums ${className}`.trim(), invalid)}
      {...rest}
    />
  );
}
