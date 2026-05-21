"use client";

import { GlobalDatePicker } from "@/components/gestionale/global-input/global-date-picker";
import { dsInput } from "@/lib/ui/design-system";

/** @deprecated Usa `GlobalDatePicker` da `@/components/gestionale/global-input`. */
export function LavorazioniDateField({
  value,
  onChange,
  inputClassName,
  id,
  required,
  placeholder = "gg/mm/aaaa",
}: {
  value: string;
  onChange: (next: string) => void;
  inputClassName: string;
  id?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <GlobalDatePicker
      id={id}
      value={value}
      onChange={onChange}
      inputClassName={inputClassName ?? dsInput}
      required={required}
      placeholder={placeholder}
      variant="default"
    />
  );
}
