"use client";

import type { ReactNode } from "react";
import { gestionaleSelectNativePlainClass } from "@/lib/ui/design-system";

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

/**
 * Select uniforme per elenchi da Impostazioni globali (loading / empty coerenti).
 */
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
  children,
}: GestionaleSettingsSelectProps) {
  const opts = normalizeOptions(options);
  const blocked = disabled || isLoading;
  const showEmpty = !isLoading && opts.length === 0;

  return (
    <div className="min-w-0">
      {isLoading ? (
        <p className="mb-1 text-xs text-[color:var(--cab-text-muted)]" role="status">
          Caricamento elenco…
        </p>
      ) : null}
      {showEmpty ? (
        <p className="mb-1 text-xs text-amber-800 dark:text-amber-300" role="status">
          {emptyMessage}
        </p>
      ) : null}
      <select
        id={id}
        aria-label={ariaLabel}
        className={`${gestionaleSelectNativePlainClass} w-full ${className}`.trim()}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={blocked || showEmpty}
        required={required}
      >
        <option value="">{placeholder}</option>
        {opts.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
        {children}
      </select>
    </div>
  );
}
