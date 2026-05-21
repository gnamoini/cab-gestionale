"use client";

import type { ReactNode } from "react";
import { globalInputFieldFilterDate } from "@/lib/ui/global-input";

/** Input filtri toolbar — stessa altezza dei select filtro globali. */
export const gestionaleFilterFieldInputClass = globalInputFieldFilterDate;

export function LavorazioniFilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
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
      <legend className="px-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {title}
      </legend>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}
