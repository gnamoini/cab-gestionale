"use client";

import type { ReactNode } from "react";
import { GlobalSelect } from "@/components/gestionale/global-input/global-select";

export type GestionaleSettingsSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[] | readonly { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  isLoading?: boolean;
  emptyMessage?: string;
  ariaLabel: string;
  id?: string;
  className?: string;
  children?: ReactNode;
};

function normalizeOptions(
  options: readonly string[] | readonly { value: string; label: string }[],
): { value: string; label: string }[] {
  if (options.length === 0) return [];
  const first = options[0];
  if (typeof first === "string") {
    return (options as readonly string[]).map((v) => ({ value: v, label: v }));
  }
  return options as { value: string; label: string }[];
}

/** Select impostazioni — combobox globale con loading / empty coerenti. */
export function GestionaleSettingsSelect({
  value,
  onChange,
  options,
  placeholder = "— Seleziona —",
  disabled,
  required,
  isLoading,
  emptyMessage = "Nessuna voce configurata nelle Impostazioni.",
  ariaLabel,
  id,
  className = "",
}: GestionaleSettingsSelectProps) {
  const opts = normalizeOptions(options);
  const items = [{ value: "", label: placeholder }, ...opts];
  const showEmpty = !isLoading && opts.length === 0;

  return (
    <div className={`min-w-0 ${className}`.trim()}>
      {showEmpty ? (
        <p className="mb-1 text-xs text-amber-800 dark:text-amber-300" role="status">
          {emptyMessage}
        </p>
      ) : null}
      <GlobalSelect
        id={id}
        items={items}
        value={value}
        onChange={onChange}
        disabled={disabled || showEmpty}
        required={required}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
        aria-label={ariaLabel}
        strictFromList
        placeholder={placeholder}
      />
    </div>
  );
}
