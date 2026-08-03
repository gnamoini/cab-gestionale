"use client";

import type { ReactNode } from "react";
import { CardMobile } from "@/components/design-system/card-mobile-actions";
import { dsCardMobileActionsGroup } from "@/lib/ui/design-system";
import { gestionaleFieldLabelClass } from "@/lib/ui/gestionale-field-label";
import {
  formatLavorazioneUltimaModificaMobileLines,
  type LavorazioneUltimaModificaInfo,
} from "@/lib/lavorazioni/lavorazione-ultima-modifica";

const shellClass = "flex flex-col gap-0 !p-3 sm:!p-3.5 -mx-1 sm:-mx-1.5";
const metaDt = "text-[10px] font-medium text-zinc-500 dark:text-zinc-400";
const metaDd = "mt-0.5 text-xs font-medium leading-snug text-zinc-800 dark:text-zinc-200";

const lavMobileFieldLabelClass =
  "shrink-0 text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400";

function lavorazioneMobileFieldHasValue(value: string): boolean {
  const t = value.trim();
  return Boolean(t && t !== "—");
}

function LavorazioneMobileCardField({
  label,
  value,
  tabular = false,
  className = "",
  alwaysShow = false,
}: {
  label: string;
  value: string;
  tabular?: boolean;
  className?: string;
  alwaysShow?: boolean;
}) {
  if (!alwaysShow && !lavorazioneMobileFieldHasValue(value)) return null;
  const display = lavorazioneMobileFieldHasValue(value) ? value.trim() : "—";
  return (
    <div className={`min-w-0 ${className}`.trim()}>
      <p className={metaDt}>{label}</p>
      <p
        className={`${metaDd} break-words${tabular ? " tabular-nums" : ""}`}
      >
        {display}
      </p>
    </div>
  );
}

/** Header card mobile — layout portale clienti (oggetto + ingresso, anagrafica e identificazione a griglia). */
export function LavorazioneMobileCardHeader({
  oggetto,
  ingresso,
  secondaryDate,
  cliente,
  utilizzatore,
  cantiere,
  targa,
  matricola,
  scuderia,
}: {
  oggetto: string;
  ingresso: ReactNode;
  secondaryDate?: { label: string; value: ReactNode };
  cliente: string;
  utilizzatore: string;
  cantiere: string;
  targa: string;
  matricola: string;
  scuderia: string;
}) {
  const anagraficaFields = [
    { label: "Cliente", value: cliente, tabular: false },
    { label: "Utilizzatore", value: utilizzatore, tabular: false },
    { label: "Cantiere", value: cantiere, tabular: false },
  ].filter((f) => lavorazioneMobileFieldHasValue(f.value));

  const identificazioneFields = [
    { label: "Scuderia", value: scuderia, tabular: true },
    { label: "Targa", value: targa, tabular: true },
    { label: "Matricola", value: matricola, tabular: true },
  ].filter((f) => lavorazioneMobileFieldHasValue(f.value));

  return (
    <div className="pb-1">
      <div className="grid grid-cols-3 gap-x-2 gap-y-2">
        {lavorazioneMobileFieldHasValue(oggetto) ? (
          <div className="col-span-2 min-w-0">
            <p className={metaDt}>Oggetto</p>
            <p
              className="mt-0.5 break-words text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-50"
            >
              {oggetto}
            </p>
          </div>
        ) : null}
        <div className={`min-w-0${lavorazioneMobileFieldHasValue(oggetto) ? "" : " col-start-3"}`}>
          <p className={metaDt}>Ingresso</p>
          <div className={`${metaDd} tabular-nums`}>{ingresso}</div>
        </div>
        {secondaryDate ? (
          <div className="col-start-3 min-w-0">
            <p className={metaDt}>{secondaryDate.label}</p>
            <div className={`${metaDd} tabular-nums`}>{secondaryDate.value}</div>
          </div>
        ) : null}
      </div>
      {anagraficaFields.length > 0 ? (
        <dl className="mt-2 grid grid-cols-3 gap-x-2 gap-y-2">
          {anagraficaFields.map((f) => (
            <LavorazioneMobileCardField
              key={f.label}
              label={f.label}
              value={f.value}
              tabular={f.tabular}
            />
          ))}
        </dl>
      ) : null}
      {identificazioneFields.length > 0 ? (
        <dl className="mt-2 grid grid-cols-3 gap-x-2 gap-y-2">
          {identificazioneFields.map((f) => (
            <LavorazioneMobileCardField
              key={f.label}
              label={f.label}
              value={f.value}
              tabular={f.tabular}
            />
          ))}
        </dl>
      ) : null}
    </div>
  );
}

/** Riga mobile: etichetta + controllo (stato / priorità / addetto). */
export function LavMobileInlineField({
  label,
  children,
  layout = "row",
  className = "",
}: {
  label: string;
  children: ReactNode;
  layout?: "row" | "stack";
  className?: string;
}) {
  if (layout === "stack") {
    return (
      <div className={`flex min-w-0 w-full flex-col gap-1 ${className}`.trim()}>
        <span className={`${metaDt} ${gestionaleFieldLabelClass}`}>{label}</span>
        <div className="min-w-0 w-full">{children}</div>
      </div>
    );
  }
  return (
    <div className={`flex min-w-0 items-center gap-1.5 ${className}`.trim()}>
      <span className={`w-[4.25rem] ${lavMobileFieldLabelClass} pointer-events-none select-none`}>{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
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

export function LavorazioneMobileMetaGrid({ children }: { children: ReactNode }) {
  return (
    <dl className="mt-2.5 grid grid-cols-1 gap-x-3 gap-y-2 cab-shell-desktop:grid-cols-2">{children}</dl>
  );
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
    <div className={`min-w-0 ${className}`.trim()}>
      <dt className={metaDt}>{label}</dt>
      <dd className={`${metaDd} min-w-0 break-words`}>{value}</dd>
    </div>
  );
}

export function LavorazioneMobileNote({
  text,
  leading,
}: {
  text: string;
  leading?: ReactNode;
}) {
  const t = text.trim();
  const hasText = Boolean(t && t !== "—");
  if (!hasText && !leading) return null;
  return (
    <div className="mt-2 flex min-w-0 items-start gap-1.5 border-t border-zinc-200/60 pt-2 dark:border-zinc-700/60">
      {leading}
      {hasText ? (
        <p className="min-w-0 line-clamp-2 text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">{t}</p>
      ) : null}
    </div>
  );
}

export function LavorazioneMobileControlsPanel({
  children,
  ariaLabel = "Stato, priorità e addetto",
}: {
  children: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <div
      className="mt-2 grid grid-cols-1 gap-y-2"
      role="group"
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}

/** Footer card mobile: data · ora e autore su due righe (come magazzino). */
export function LavorazioneMobileUltimaModifica({ info }: { info: LavorazioneUltimaModificaInfo }) {
  const { dateTime, autore } = formatLavorazioneUltimaModificaMobileLines(info);
  if (!dateTime || dateTime === "—") return null;
  return (
    <div className="min-w-0 text-xs font-medium leading-tight text-[color:var(--cab-text-muted)]">
      <p className="min-w-0 truncate tabular-nums">
        <span className="sr-only">Ultimo aggiornamento: </span>
        {dateTime}
      </p>
      {autore !== "—" ? <p className="min-w-0 truncate">{autore}</p> : null}
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
      className="mt-auto flex w-full min-w-0 shrink-0 items-center justify-between gap-2 pt-2.5"
      role="group"
      aria-label="Ultimo aggiornamento e azioni"
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
