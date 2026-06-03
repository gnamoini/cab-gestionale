"use client";

import type { ReactNode } from "react";
import { memo } from "react";
import { Tooltip } from "@/components/design-system/tooltip";
import { erpFocus } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { parseModificheLines } from "@/lib/gestionale-log/log-summary";
import type { GestionaleLogEventTone, GestionaleLogViewModel } from "@/lib/gestionale-log/view-model";
import { formatGestionaleLogMetaLine } from "@/lib/gestionale-log/view-model";

const TONE_BADGE: Record<GestionaleLogEventTone, string> = {
  create: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
  update: "bg-[color:color-mix(in_srgb,var(--cab-primary)_18%,transparent)] text-[color:var(--cab-primary)]",
  delete: "bg-red-500/15 text-red-800 dark:text-red-300",
  complete: "bg-sky-500/15 text-sky-800 dark:text-sky-300",
  archive: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300",
  reopen: "bg-indigo-500/15 text-indigo-800 dark:text-indigo-300",
  neutral: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
};

const TONE_DOT: Record<GestionaleLogEventTone, string> = {
  create: "bg-emerald-500",
  update: "bg-[color:var(--cab-primary)]",
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

function LogEntryBody({ vm, trailing }: { vm: GestionaleLogViewModel; trailing?: ReactNode }) {
  const voided = vm.annullato === true;
  const modifiche = parseModificheLines(vm.modificaRiga);
  const badge = TONE_BADGE[vm.tone];

  return (
    <div className={`flex min-w-0 gap-3 py-3 ${voided ? "opacity-65" : ""}`}>
      <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${TONE_DOT[vm.tone]}`} aria-hidden />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <span
            className={`inline-flex max-w-full items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badge}`}
          >
            {vm.tipoRiga}
          </span>
          {trailing ? <div className="shrink-0">{trailing}</div> : null}
        </div>

        <p
          className={`text-sm font-semibold leading-snug text-[color:var(--cab-text)] ${voided ? "line-through" : ""}`}
        >
          {vm.oggettoRiga}
        </p>

        {modifiche.length > 0 ? (
          <ul className={`space-y-1 ${voided ? "line-through" : ""}`}>
            {modifiche.map((line, i) => (
              <li
                key={`${i}-${line.slice(0, 24)}`}
                className="text-sm leading-relaxed text-[color:var(--cab-text-muted)] before:mr-1.5 before:font-semibold before:text-[color:var(--cab-text)] before:content-['•']"
              >
                {line}
              </li>
            ))}
          </ul>
        ) : null}

        <p className="text-[11px] tabular-nums text-[color:var(--cab-text-muted)]">
          {formatGestionaleLogMetaLine(vm.autore, vm.atIso)}
        </p>
      </div>
    </div>
  );
}

/** Voce log strutturata: tipo → oggetto → modifiche → meta. */
export const LogEntry = memo(function LogEntry({ vm, onClick, title, trailing }: LogEntryProps) {
  const body = <LogEntryBody vm={vm} trailing={trailing} />;

  if (onClick) {
    const button = (
      <button
        type="button"
        onClick={onClick}
        className={`w-full cursor-pointer rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_40%,var(--cab-card))] px-3 text-left transition-colors hover:border-[color:color-mix(in_srgb,var(--cab-primary)_35%,var(--cab-border))] hover:bg-[var(--cab-hover)] ${erpFocus}`}
      >
        {body}
      </button>
    );

    if (title?.trim()) {
      return <Tooltip content={title}>{button}</Tooltip>;
    }

    return button;
  }

  return (
    <div className="rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_40%,var(--cab-card))] px-3">
      {body}
    </div>
  );
});

/** @deprecated Usare `LogEntry`. */
export const LogEntryRenderer = LogEntry;
