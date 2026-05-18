"use client";

import type { ReactNode, SVGProps } from "react";
import { memo } from "react";
import { LogEntry } from "@/components/design-system/log-entry";
import type { GestionaleLogViewModel } from "@/lib/gestionale-log/view-model";

/** Icona unificata “log / cronologia” (stroke 2, stile coerente con impostazioni e toolbar). */
export function IconGestionaleLog(props: SVGProps<SVGSVGElement>) {
  const { className, ...rest } = props;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-4 w-4 shrink-0 opacity-90"}
      aria-hidden
      {...rest}
    >
      <path d="M3 3v5h5" />
      <path d="M3.05 13a9 9 0 1 0 .5-4" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function IconGestionaleUndo(props: SVGProps<SVGSVGElement>) {
  const { className, ...rest } = props;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-4 w-4 shrink-0 opacity-90"}
      aria-hidden
      {...rest}
    >
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 1 1 0 11H11" />
    </svg>
  );
}

export const gestionaleLogScrollClass =
  "gestionale-scrollbar min-h-0 flex-1 overflow-y-scroll overscroll-contain [scrollbar-gutter:stable]";

export const gestionaleLogScrollEmbeddedClass =
  "gestionale-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]";

export const gestionaleLogPanelAsideClass =
  "flex h-full max-h-dvh min-h-0 w-full max-w-md flex-col overflow-hidden border-l border-[color:var(--cab-border)] bg-[var(--cab-card)] shadow-2xl";

export const gestionaleLogPanelHeaderClass =
  "flex shrink-0 items-center justify-between border-b border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_88%,var(--cab-card))] px-4 py-3 backdrop-blur-sm";

export type CampoChangeLine = { campo: string; prima: string; dopo: string };

export function GestionaleLogChangeList({
  changes,
  limit = 12,
  compact,
}: {
  changes: CampoChangeLine[];
  limit?: number;
  compact?: boolean;
}) {
  if (changes.length === 0) return null;
  const slice = changes.slice(0, limit);
  const textXs = compact ? "text-[10px]" : "text-[11px]";
  const pad = compact
    ? "mt-1.5 space-y-0.5 border-t border-[color:var(--cab-border)] pt-1.5"
    : "mt-2 space-y-1 border-t border-[color:var(--cab-border)] pt-2";
  return (
    <ul className={pad}>
      {slice.map((ch, i) => (
        <li key={`${ch.campo}-${i}`} className={`${textXs} leading-relaxed text-[color:var(--cab-text-muted)]`}>
          <span className="font-medium">{ch.campo}:</span>{" "}
          <span className="font-mono line-through opacity-70">{ch.prima}</span>
          {" → "}
          <span className="font-mono text-[color:color-mix(in_srgb,var(--cab-success)_80%,var(--cab-text))]">{ch.dopo}</span>
        </li>
      ))}
    </ul>
  );
}

export const logEntryDismissBtnClass =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-transparent text-sm font-semibold text-[color:var(--cab-text-muted)] transition-colors hover:border-[color:var(--cab-border)] hover:bg-[var(--cab-surface)] hover:text-[color:var(--cab-danger)]";

/** Voce log compatta (delega al design system). */
export function GestionaleLogEntryFourLines({
  vm,
  onClick,
  title,
  children,
  trailing,
}: {
  vm: GestionaleLogViewModel;
  onClick?: () => void;
  title?: string;
  children?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <>
      <LogEntry vm={vm} onClick={onClick} title={title} trailing={trailing} />
      {children}
    </>
  );
}

export const GestionaleLogList = memo(function GestionaleLogList({ children }: { children: ReactNode }) {
  return <ul className="list-none space-y-1.5 text-sm">{children}</ul>;
});

export const GestionaleLogEmpty = memo(function GestionaleLogEmpty({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-dashed border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_65%,var(--cab-card))] px-3 py-4 text-sm text-[color:var(--cab-text-muted)]">
      {message}
    </p>
  );
});

export type { GestionaleLogViewModel } from "@/lib/gestionale-log/view-model";
export {
  buildLavorazioniGestionaleLogViewModel,
  buildMagazzinoGestionaleLogViewModel,
  buildMezziGestionaleLogViewModel,
  formatGestionaleLogCompactLine,
  formatGestionaleLogDateTime,
  gestionaleLogToneLavorazioni,
  gestionaleLogToneMagazzino,
} from "@/lib/gestionale-log/view-model";
