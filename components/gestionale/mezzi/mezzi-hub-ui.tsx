"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  hrefDocumentiPerMezzo,
  hrefLavorazioniPerMezzo,
  hrefPreventiviPerMezzo,
} from "@/lib/mezzi/mezzi-helpers";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { dsBtnNeutral, dsBtnPrimary } from "@/lib/ui/design-system";

export type MezziHubTabId =
  | "panoramica"
  | "attrezzature"
  | "foto"
  | "lavorazioni"
  | "timeline"
  | "preventivi"
  | "documenti"
  | "log";

export const MEZZI_HUB_TAB_ORDER: readonly MezziHubTabId[] = [
  "panoramica",
  "attrezzature",
  "foto",
  "lavorazioni",
  "timeline",
  "preventivi",
  "documenti",
  "log",
];

export function fmtMezziHubDt(iso: string) {
  try {
    return new Date(iso).toLocaleString("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function MezziHubTabEmpty({ message }: { message: string }) {
  return (
    <div className="rounded-[var(--ds-radius-lg)] border border-dashed border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_55%,var(--cab-card))] px-4 py-6 text-center">
      <p className="text-sm font-medium text-[color:var(--cab-text)]">{message}</p>
    </div>
  );
}

export function MezziHubErrorBanner({ message }: { message: string }) {
  return (
    <div className="shrink-0 border-b border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100">
      {message}
    </div>
  );
}

export function MezziHubSyntheticBanner() {
  return (
    <p className="rounded-[var(--ds-radius-lg)] border border-amber-300/75 bg-amber-50/80 px-3 py-2 text-xs leading-snug text-amber-950 dark:border-amber-800/70 dark:bg-amber-950/35 dark:text-amber-100">
      Riga sintetica: crea il mezzo in anagrafica con gli stessi identificativi (targa / matricola) per unificare il parco e
      abilitare la modifica.
    </p>
  );
}

const hubListClass = "min-w-0 divide-y divide-[color:var(--cab-border)]";
const hubListRowClass = "flex min-w-0 items-start justify-between gap-3 py-3 first:pt-0 last:pb-0";

export function MezziHubList({ children }: { children: ReactNode }) {
  return <ul className={hubListClass}>{children}</ul>;
}

export function MezziHubListItem({
  children,
  actions,
}: {
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <li className={hubListRowClass}>
      <div className="min-w-0 flex-1">{children}</div>
      {actions ? <div className="flex shrink-0 flex-nowrap items-center gap-1 sm:flex-wrap">{actions}</div> : null}
    </li>
  );
}

export function MezziHubListMeta({ children }: { children: ReactNode }) {
  return <p className="font-mono text-[11px] leading-snug text-[color:var(--cab-text-muted)]">{children}</p>;
}

export function MezziHubListTitle({ children }: { children: ReactNode }) {
  return <p className="mt-0.5 text-sm font-medium leading-snug text-[color:var(--cab-text)]">{children}</p>;
}

export function MezziHubListSubtitle({ children }: { children: ReactNode }) {
  return <p className="mt-0.5 text-xs leading-snug text-[color:var(--cab-text-muted)]">{children}</p>;
}

export function MezziHubTimelineKindBadge({
  kind,
}: {
  kind: "lavorazione" | "log" | "movimento" | "lifecycle";
}) {
  const label =
    kind === "lavorazione"
      ? "Lavorazione"
      : kind === "movimento"
        ? "Magazzino"
        : kind === "lifecycle"
          ? "Asset"
          : "Anagrafica";
  const tone =
    kind === "lavorazione"
      ? "border-[color:color-mix(in_srgb,var(--cab-primary)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_12%,var(--cab-card))] text-[color:color-mix(in_srgb,var(--cab-primary)_90%,var(--cab-text))]"
      : kind === "movimento"
        ? "border-[color:color-mix(in_srgb,var(--cab-border)_90%,transparent)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_70%,var(--cab-card))] text-[color:var(--cab-text-muted)]"
        : "border-[color:var(--cab-border)] bg-[var(--cab-surface-2)] text-[color:var(--cab-text-muted)]";
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tone}`}
    >
      {label}
    </span>
  );
}

/** Pulsante che porta a un’altra tab dello stesso hub (es. KPI in Panoramica). */
export function MezziHubTabJumpButton({
  children,
  onJump,
  className = "",
}: {
  children: ReactNode;
  onJump: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onJump}
      className={`min-w-0 rounded-[var(--ds-radius-lg)] border border-transparent bg-transparent p-1.5 text-left transition-colors hover:border-[color:var(--cab-border)] hover:bg-[var(--cab-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--cab-primary)_42%,transparent)] ${className}`}
    >
      {children}
    </button>
  );
}

export function MezziHubQuickLinks({
  mezzo,
  onClose,
  onGoTab,
}: {
  mezzo: MezzoGestito;
  onClose: () => void;
  onGoTab: (tab: MezziHubTabId) => void;
}) {
  const linkClass = `${dsBtnNeutral} inline-flex no-underline`;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--cab-text-muted)]">Collegamenti rapidi</p>
      <div className="flex min-w-0 flex-wrap gap-2">
        <button type="button" className={dsBtnNeutral} onClick={() => onGoTab("lavorazioni")}>
          Lavorazioni in hub
        </button>
        <button type="button" className={dsBtnNeutral} onClick={() => onGoTab("preventivi")}>
          Preventivi in hub
        </button>
        <button type="button" className={dsBtnNeutral} onClick={() => onGoTab("documenti")}>
          Documenti in hub
        </button>
        <Link href={hrefLavorazioniPerMezzo(mezzo)} className={linkClass} onClick={onClose}>
          Pagina lavorazioni
        </Link>
        <Link href={hrefPreventiviPerMezzo(mezzo)} className={linkClass} onClick={onClose}>
          Pagina preventivi
        </Link>
        <Link href={hrefDocumentiPerMezzo(mezzo)} className={linkClass} onClick={onClose}>
          Pagina documenti
        </Link>
      </div>
    </div>
  );
}

export function MezziHubFooter({
  tab,
  mezzo,
  onClose,
}: {
  tab: MezziHubTabId;
  mezzo: MezzoGestito;
  onClose: () => void;
}) {
  const linkPrimary = `${dsBtnPrimary} inline-flex w-full justify-center no-underline sm:w-auto`;
  const linkNeutral = `${dsBtnNeutral} inline-flex w-full justify-center no-underline sm:w-auto`;

  if (tab === "foto" || tab === "log") {
    return null;
  }

  if (tab === "lavorazioni") {
    return (
      <Link href={hrefLavorazioniPerMezzo(mezzo)} className={linkPrimary} onClick={onClose}>
        Apri tutte le lavorazioni del mezzo
      </Link>
    );
  }

  if (tab === "preventivi") {
    return (
      <Link href={hrefPreventiviPerMezzo(mezzo)} className={linkPrimary} onClick={onClose}>
        Apri archivio preventivi
      </Link>
    );
  }

  if (tab === "documenti") {
    return (
      <Link href={hrefDocumentiPerMezzo(mezzo)} className={linkPrimary} onClick={onClose}>
        Documenti (pagina completa)
      </Link>
    );
  }

  if (tab === "timeline") {
    return (
      <div className="flex min-w-0 flex-wrap justify-end gap-2">
        <Link href={hrefLavorazioniPerMezzo(mezzo)} className={linkNeutral} onClick={onClose}>
          Lavorazioni
        </Link>
        <Link href={hrefDocumentiPerMezzo(mezzo)} className={linkNeutral} onClick={onClose}>
          Documenti
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-wrap justify-end gap-2">
      <Link href={hrefLavorazioniPerMezzo(mezzo)} className={linkNeutral} onClick={onClose}>
        Lavorazioni
      </Link>
      <Link href={hrefPreventiviPerMezzo(mezzo)} className={linkNeutral} onClick={onClose}>
        Preventivi
      </Link>
      <Link href={hrefDocumentiPerMezzo(mezzo)} className={linkPrimary} onClick={onClose}>
        Documenti
      </Link>
    </div>
  );
}
