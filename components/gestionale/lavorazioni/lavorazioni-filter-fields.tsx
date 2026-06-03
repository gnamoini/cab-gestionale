"use client";

import type { ReactNode } from "react";
import { globalInputFieldFilterSearch } from "@/lib/ui/global-input";

/** Input filtri toolbar — combobox ricerca+suggerimenti (non select nativo). */
export const gestionaleFilterFieldInputClass = globalInputFieldFilterSearch;

export function LavorazioniFilterField({
  label,
  children,
  htmlFor,
}: {
  label: string;
  children: ReactNode;
  /** Id del controllo figlio per associazione label (a11y). */
  htmlFor?: string;
}) {
  if (htmlFor) {
    return (
      <div className="flex min-w-0 flex-col gap-1 text-xs font-medium text-[color:var(--cab-text-muted)]">
        <label htmlFor={htmlFor} className="cursor-default">
          {label}
        </label>
        {children}
      </div>
    );
  }
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-[color:var(--cab-text-muted)]">
      {label}
      {children}
    </label>
  );
}

export function LavorazioniFilterGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="min-w-0 space-y-2 rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_35%,var(--cab-card))] p-3">
      <legend className="px-1 text-[10px] font-bold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
        {title}
      </legend>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}
