"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { memo } from "react";
import { Tooltip } from "@/components/design-system/tooltip";
import { erpFocus } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { filterAuditMetadataModifiche, parseModificheLines, sanitizeLogOggettoRiga } from "@/lib/gestionale-log/log-summary";
import type { GestionaleLogEventTone, GestionaleLogViewModel } from "@/lib/gestionale-log/view-model";
import { formatGestionaleLogMetaLine } from "@/lib/gestionale-log/view-model";

const LOG_ENTRY_SHELL_CLASS =
  "rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_40%,var(--cab-card))] px-3";

const LOG_ENTRY_INBOX_SHELL_CLASS =
  "gestionale-inbox-log-entry rounded-[var(--ds-radius-xl)] border border-[color:var(--cab-border)] bg-[var(--cab-card)] px-3.5 shadow-[var(--cab-shadow-sm)] transition-[border-color,box-shadow,background-color] duration-200";

const LOG_ENTRY_INBOX_SHELL_INTERACTIVE =
  "cursor-pointer hover:border-[color:color-mix(in_srgb,var(--cab-primary)_34%,var(--cab-border))] hover:bg-[var(--cab-hover)] hover:shadow-[var(--cab-shadow-md)]";

const LOG_ENTRY_INTERACTIVE_CLASS = `w-full cursor-pointer text-left transition-colors hover:border-[color:color-mix(in_srgb,var(--cab-primary)_35%,var(--cab-border))] hover:bg-[var(--cab-hover)] ${erpFocus}`;

function logEntryActivate(onClick: () => void, e: KeyboardEvent<HTMLDivElement>) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    onClick();
  }
}

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
  /** Navigazione inbox — link nativo (affidabile dal drawer). */
  href?: string;
  onAfterNavigate?: () => void;
  title?: string;
  trailing?: ReactNode;
  /** Card inbox notifiche — layout compatto senza dot laterale. */
  variant?: "default" | "inbox";
};

function resolveShellClass(variant: "default" | "inbox", interactive: boolean): string {
  if (variant === "inbox") {
    return `${LOG_ENTRY_INBOX_SHELL_CLASS}${interactive ? ` ${LOG_ENTRY_INBOX_SHELL_INTERACTIVE}` : ""}`;
  }
  return LOG_ENTRY_SHELL_CLASS;
}

function LogEntryBody({
  vm,
  trailing,
  variant = "default",
}: {
  vm: GestionaleLogViewModel;
  trailing?: ReactNode;
  variant?: "default" | "inbox";
}) {
  const voided = vm.annullato === true;
  const rawModifiche = parseModificheLines(vm.modificaRiga);
  let modifiche = filterAuditMetadataModifiche(rawModifiche);
  if (modifiche.length === 0 && rawModifiche.length > 0) {
    modifiche = ["Modifica registrata"];
  }
  const badge = TONE_BADGE[vm.tone];

  if (variant === "inbox") {
    return (
      <div className={`min-w-0 py-3 ${voided ? "opacity-65" : ""}`}>
        <div className="min-w-0 space-y-2">
          <span
            className={`inline-flex max-w-full items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badge}`}
          >
            {vm.tipoRiga}
          </span>

          <p
            className={`text-sm font-semibold leading-snug text-[color:var(--cab-text)] ${voided ? "line-through" : ""}`}
          >
            {sanitizeLogOggettoRiga(vm.oggettoRiga)}
          </p>

          {modifiche.length > 0 ? (
            <p
              className={`text-xs leading-relaxed text-[color:var(--cab-text-muted)] line-clamp-3 ${voided ? "line-through" : ""}`}
            >
              {modifiche.map((l) => l.replace(/^•\s*/, "")).join(" · ")}
            </p>
          ) : null}

          <p className="border-t border-[color:color-mix(in_srgb,var(--cab-border)_70%,transparent)] pt-2 text-[11px] tabular-nums text-[color:var(--cab-text-muted)]">
            {formatGestionaleLogMetaLine(vm.autore, vm.atIso)}
          </p>
        </div>
      </div>
    );
  }

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
          {sanitizeLogOggettoRiga(vm.oggettoRiga)}
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

function resolveActivate(
  onClick: (() => void) | undefined,
  href: string | undefined,
  onAfterNavigate: (() => void) | undefined,
): (() => void) | undefined {
  if (onClick) return onClick;
  if (!href) return undefined;
  return () => {
    onAfterNavigate?.();
    window.location.assign(href);
  };
}

function LogEntryShellInteractive({
  onActivate,
  title,
  className,
  children,
}: {
  onActivate: () => void;
  title?: string;
  className: string;
  children: ReactNode;
}) {
  const interactive = (
    <div
      role="link"
      tabIndex={0}
      onClick={onActivate}
      onKeyDown={(e) => logEntryActivate(onActivate, e)}
      aria-label={title}
      className={className}
    >
      {children}
    </div>
  );

  if (title?.trim()) {
    return <Tooltip content={title}>{interactive}</Tooltip>;
  }

  return interactive;
}

/** Voce log strutturata: tipo → oggetto → modifiche → meta. */
export const LogEntry = memo(function LogEntry({
  vm,
  onClick,
  href,
  onAfterNavigate,
  title,
  trailing,
  variant = "default",
}: LogEntryProps) {
  const inbox = variant === "inbox";
  const activate = resolveActivate(onClick, href, onAfterNavigate);
  const interactive = Boolean(activate);
  const shellClass = resolveShellClass(variant, interactive);

  if (trailing) {
    const body = <LogEntryBody vm={vm} variant={variant} />;

    if (activate) {
      return (
        <LogEntryShellInteractive
          onActivate={activate}
          title={title}
          className={`${shellClass} group relative block w-full text-left text-inherit no-underline ${inbox ? erpFocus : ""}`}
        >
          <div className={inbox ? "pr-8" : "pr-7"}>{body}</div>
          <div className={`absolute z-[1] ${inbox ? "right-2 top-2" : "right-1.5 top-1.5"}`}>{trailing}</div>
        </LogEntryShellInteractive>
      );
    }

    return (
      <div className={`${shellClass} group relative`}>
        <div className={inbox ? "pr-8" : "pr-7"}>{body}</div>
        <div className={`absolute z-[1] ${inbox ? "right-2 top-2" : "right-1.5 top-1.5"}`}>{trailing}</div>
      </div>
    );
  }

  if (activate) {
    return (
      <LogEntryShellInteractive
        onActivate={activate}
        title={title}
        className={`${shellClass} block w-full text-left text-inherit no-underline ${inbox ? erpFocus : LOG_ENTRY_INTERACTIVE_CLASS}`}
      >
        <LogEntryBody vm={vm} variant={variant} />
      </LogEntryShellInteractive>
    );
  }

  return (
    <div className={shellClass}>
      <LogEntryBody vm={vm} variant={variant} />
    </div>
  );
});

/** @deprecated Usare `LogEntry`. */
export const LogEntryRenderer = LogEntry;
