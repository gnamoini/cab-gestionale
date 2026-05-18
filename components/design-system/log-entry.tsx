"use client";

import type { ReactNode } from "react";
import { memo } from "react";
import { erpFocus } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import type { GestionaleLogEventTone, GestionaleLogViewModel } from "@/lib/gestionale-log/view-model";
import { formatGestionaleLogCompactLine } from "@/lib/gestionale-log/view-model";

const TONE_DOT: Record<GestionaleLogEventTone, string> = {
  create: "bg-emerald-500",
  update: "bg-[var(--cab-primary)]",
  delete: "bg-red-500",
  complete: "bg-sky-500",
  archive: "bg-zinc-400",
  reopen: "bg-indigo-500",
  neutral: "bg-zinc-400",
};

export type LogEntryProps = {
  vm: GestionaleLogViewModel;
  onClick?: () => void;
  title?: string;
  trailing?: ReactNode;
};

/** Voce log compatta — una riga leggibile (formato parentesi unificato). */
export const LogEntry = memo(function LogEntry({ vm, onClick, title, trailing }: LogEntryProps) {
  const line = formatGestionaleLogCompactLine(vm);
  const voided = vm.annullato === true;

  const inner = (
    <div className="flex min-w-0 items-start gap-2 py-2">
      <span
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TONE_DOT[vm.tone]}`}
        title={vm.tipoRiga}
        aria-hidden
      />
      <p
        className={`min-w-0 flex-1 text-[13px] leading-snug text-[color:var(--cab-text)] ${voided ? "opacity-60 line-through" : ""}`}
      >
        {line}
      </p>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title}
        className={`w-full rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_40%,var(--cab-card))] px-2 text-left transition-colors hover:bg-[var(--cab-hover)] ${erpFocus}`}
      >
        {inner}
      </button>
    );
  }

  return (
    <div className="rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_40%,var(--cab-card))] px-2">
      {inner}
    </div>
  );
});

/** @deprecated Usare `LogEntry` — alias per migrazione graduale. */
export const LogEntryRenderer = LogEntry;
