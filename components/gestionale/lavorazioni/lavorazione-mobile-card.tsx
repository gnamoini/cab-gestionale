"use client";

import type { ReactNode } from "react";
import { CardMobile } from "@/components/design-system/card-mobile-actions";
import { dsCardMobileActionsGroup } from "@/lib/ui/design-system";
import {
  formatLavorazioneUltimaModificaMobileLines,
  type LavorazioneUltimaModificaInfo,
} from "@/lib/lavorazioni/lavorazione-ultima-modifica";

const shellClass = "flex flex-col gap-0 !p-3 sm:!p-3.5";
const sectionDivider = "border-b border-zinc-200/80 pb-2 dark:border-zinc-700/80";
const metaDt = "text-[10px] font-medium text-zinc-500 dark:text-zinc-400";
const metaDd = "mt-0.5 text-xs font-medium leading-snug text-zinc-800 dark:text-zinc-200";

const lavMobileFieldLabelClass =
  "shrink-0 text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400";

function LavorazioneMobileCardTitle({
  macchina,
  className = "",
}: {
  macchina: string;
  className?: string;
}) {
  return (
    <p
      className={`min-w-0 truncate text-sm font-semibold leading-tight text-zinc-900 dark:text-zinc-50 ${className}`.trim()}
      title={macchina}
    >
      {macchina}
    </p>
  );
}

function LavorazioneMobileCardIdent({ identLine }: { identLine: string | null }) {
  if (!identLine) return null;
  return (
    <p
      className="mt-1 font-medium tabular-nums text-[11px] leading-snug text-[color:var(--cab-text-muted)] break-words"
      title={identLine}
    >
      {identLine}
    </p>
  );
}

function LavorazioneMobileCardIngressoRow({
  ingresso,
  secondaryDate,
}: {
  ingresso: ReactNode;
  secondaryDate?: { label: string; value: ReactNode };
}) {
  return (
    <div className="mt-1 flex flex-nowrap gap-x-3 gap-y-1 sm:flex-wrap">
      <div>
        <p className={metaDt}>Ingresso</p>
        <div className={`${metaDd} tabular-nums`}>{ingresso}</div>
      </div>
      {secondaryDate ? (
        <div>
          <p className={metaDt}>{secondaryDate.label}</p>
          <div className={`${metaDd} tabular-nums`}>{secondaryDate.value}</div>
        </div>
      ) : null}
    </div>
  );
}

/** Riga mobile: etichetta + controllo (stato / priorità / addetto). */
export function LavMobileInlineField({
  label,
  children,
  layout = "row",
}: {
  label: string;
  children: ReactNode;
  layout?: "row" | "stack";
}) {
  if (layout === "stack") {
    return (
      <label className="flex min-w-0 flex-col gap-1">
        <span className={metaDt}>{label}</span>
        <div className="min-w-0">{children}</div>
      </label>
    );
  }
  return (
    <label className="flex min-w-0 items-center gap-1.5">
      <span className={`w-[4.25rem] ${lavMobileFieldLabelClass}`}>{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </label>
  );
}

export function LavorazioneMobileCardShell({
  children,
  id,
  className = "",
}: {
  children: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <CardMobile id={id} className={`${shellClass} ${className}`.trim()}>
      {children}
    </CardMobile>
  );
}

export function LavorazioneMobileCardHeader({
  macchina,
  identLine,
  ingresso,
  secondaryDate,
  statusSlot,
}: {
  macchina: string;
  identLine: string | null;
  ingresso: ReactNode;
  secondaryDate?: { label: string; value: ReactNode };
  /** Pill stato in alto a destra (lavorazioni in corso). */
  statusSlot?: ReactNode;
}) {
  if (statusSlot) {
    return (
      <div className={sectionDivider}>
        <div className="flex items-start gap-2.5">
          <div className="min-w-0 flex-1">
            <LavorazioneMobileCardTitle macchina={macchina} className="pr-1" />
          </div>
          <div className="w-[min(11.5rem,46%)] shrink-0 self-start">{statusSlot}</div>
        </div>
        <LavorazioneMobileCardIngressoRow ingresso={ingresso} secondaryDate={secondaryDate} />
        <LavorazioneMobileCardIdent identLine={identLine} />
      </div>
    );
  }

  return (
    <div className={sectionDivider}>
      <div className="flex items-start justify-between gap-3">
        <LavorazioneMobileCardTitle macchina={macchina} className="min-w-0 flex-1" />
        <div className="flex shrink-0 gap-3 text-right">
          <div>
            <p className={metaDt}>Ingresso</p>
            <div className={`${metaDd} tabular-nums`}>{ingresso}</div>
          </div>
          {secondaryDate ? (
            <div>
              <p className={metaDt}>{secondaryDate.label}</p>
              <div className={`${metaDd} tabular-nums`}>{secondaryDate.value}</div>
            </div>
          ) : null}
        </div>
      </div>
      <LavorazioneMobileCardIdent identLine={identLine} />
    </div>
  );
}

/** Wrapper pill stato mobile (allineato al badge tabella). */
export function LavorazioneMobileStatusSlot({ children }: { children: ReactNode }) {
  return (
    <div className="w-full" role="group" aria-label="Stato lavorazione">
      {children}
    </div>
  );
}

export function LavorazioneMobileMetaGrid({ children }: { children: ReactNode }) {
  return <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2">{children}</dl>;
}

export function LavorazioneMobileMetaItem({
  label,
  value,
  className = "",
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className={metaDt}>{label}</dt>
      <dd className={metaDd}>{value}</dd>
    </div>
  );
}

export function LavorazioneMobileNote({ text }: { text: string }) {
  const t = text.trim();
  if (!t || t === "—") return null;
  return (
    <p className="mt-2 line-clamp-2 border-t border-zinc-200/60 pt-2 text-[11px] leading-snug text-zinc-500 dark:border-zinc-700/60 dark:text-zinc-400">
      {t}
    </p>
  );
}

export function LavorazioneMobileControlsPanel({ children }: { children: ReactNode }) {
  return (
    <div
      className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-zinc-200/60 pt-2.5 dark:border-zinc-700/60"
      role="group"
      aria-label="Priorità e addetto"
    >
      {children}
    </div>
  );
}

export function LavorazioneMobileUltimaModifica({ info }: { info: LavorazioneUltimaModificaInfo }) {
  const { dateTime, autore } = formatLavorazioneUltimaModificaMobileLines(info);
  return (
    <div className="min-w-0 flex-1 text-xs font-medium text-[color:var(--cab-text-muted)]">
      <p className="truncate tabular-nums leading-tight text-zinc-900 dark:text-zinc-100">{dateTime}</p>
      <p className="truncate leading-tight">{autore}</p>
    </div>
  );
}

/** Footer mobile: ultima modifica a sinistra, azioni a destra (come magazzino). */
export function LavorazioneMobileCardFooter({
  meta,
  children,
}: {
  meta: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className="mt-auto flex w-full min-w-0 shrink-0 items-center justify-between gap-2 border-t border-zinc-200/80 pt-2 dark:border-zinc-700/80"
      role="group"
      aria-label="Ultima modifica e azioni"
    >
      <div className="min-w-0 flex-1">{meta}</div>
      <div className={`${dsCardMobileActionsGroup} shrink-0`}>{children}</div>
    </div>
  );
}

/** Compone targa · matricola · scuderia omitendo valori vuoti o «—». */
export function formatLavorazioneMobileIdentLine(parts: {
  targa: string;
  matricola: string;
  scuderia: string;
}): string | null {
  const segs: string[] = [];
  const t = parts.targa.trim();
  const m = parts.matricola.trim();
  const s = parts.scuderia.trim();
  if (t && t !== "—") segs.push(t);
  if (m && m !== "—") segs.push(m);
  if (s && s !== "—") segs.push(`Scud. ${s}`);
  return segs.length > 0 ? segs.join(" · ") : null;
}
