"use client";

import { TruncatedTextTooltip } from "@/components/design-system/truncated-text-tooltip";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import {
  lavTableActionsRow,
  lavTableActionBtnDanger,
  lavTableActionBtnPrimary,
  lavTableActionBtnSecondary,
  lavTableBodyTextClass,
  lavTablePrimaryTextClass,
} from "@/components/gestionale/lavorazioni/lavorazioni-table-shared";
import {
  gestionaleListTableColStatoAddettoInsetClass,
  gestionaleListTableTd,
  gestionaleListTableTdAzioni,
  gestionaleListTableTdPill,
  gestionaleListTableTdPillWrap,
} from "@/lib/ui/gestionale-list-table";

/** @deprecated Usare `gestionaleListTableTd`. */
export const prevTableTd = gestionaleListTableTd;

export const prevTableTdPill = gestionaleListTableTdPill;
export const prevTableTdPillWrap = gestionaleListTableTdPillWrap;
export const prevTableTdAzioni = gestionaleListTableTdAzioni;
export const prevTableColStatoAddettoInset = gestionaleListTableColStatoAddettoInsetClass;

export {
  prevTableColAzioniClass,
  prevTableColClienteClass,
  prevTableColDataClass,
  prevTableColIdentClass,
  prevTableColNumeroClass,
  prevTableColOggettoClass,
  prevTableColStatoClass,
  prevTableColTipoClass,
  prevTableColTotaleClass,
  prevTableColProfittoClass,
} from "@/lib/preventivi/preventivi-table-columns";

export const prevTableActionsRow = lavTableActionsRow;
export const prevTableActionBtnPrimary = lavTableActionBtnPrimary;
export const prevTableActionBtnSecondary = lavTableActionBtnSecondary;
export const prevTableActionBtnDanger = lavTableActionBtnDanger;

export const prevTablePrimaryTextClass = lavTablePrimaryTextClass;
export const prevTableBodyTextClass = lavTableBodyTextClass;

const prevTableSecondaryTextClass = "truncate text-sm text-zinc-500 dark:text-zinc-400";

/** Come `mezzi-table` — valore identificazione normalizzato. */
function prevTableIdentValue(raw: string): string {
  const t = raw.trim();
  if (!t || t === "—") return "—";
  if (t === "Non assegnata") return "Non assegnata";
  return t;
}

/** Righe identificazione: targa, matricola, scuderia (ordine tabella Mezzi). */
export function preventivoIdentificazioneLines(p: {
  targa: string;
  matricola: string;
  nScuderia: string;
}): string[] {
  const lines = [
    prevTableIdentValue(p.targa),
    prevTableIdentValue(p.matricola),
    prevTableIdentValue(p.nScuderia),
  ].filter((v) => v !== "—");
  return lines.length > 0 ? lines : ["—"];
}

const prevTableIdentStackClass = "flex min-w-0 flex-col gap-0.5";
const prevTableIdentLineClass =
  "break-words text-sm font-medium leading-snug text-[color:var(--cab-text)]";

/** Stack cliente + sottolinea cantiere/utilizzatore — allineato a Lavorazioni. */
export function PreventiviClienteStack({
  cliente,
  subline,
}: {
  cliente: string;
  subline: string;
}) {
  const primary = cliente.trim() || "—";
  const secondary = subline.trim();
  return (
    <div className="min-w-0 leading-tight">
      <TruncatedTextTooltip text={primary} className={`truncate ${lavTablePrimaryTextClass}`} />
      {secondary ? (
        <TruncatedTextTooltip text={secondary} className={prevTableSecondaryTextClass} />
      ) : null}
    </div>
  );
}

/** Marca + modello telaio per sottolinea colonna Oggetto (attrezzatura su telaio). */
export function preventivoOggettoTelaioSubline(
  p: Pick<PreventivoRecord, "marcaTelaio" | "modelloTelaio" | "macchinaRiassunto">,
): string {
  const parts = [p.marcaTelaio, p.modelloTelaio]
    .map((s) => (s ?? "").trim())
    .filter((s) => s.length > 0 && s !== "—");
  if (!parts.length) return "";
  const telaio = parts.join(" ");
  const macchina = p.macchinaRiassunto.trim();
  if (macchina && macchina.toLowerCase() === telaio.toLowerCase()) return "";
  return telaio;
}

/** Oggetto / macchina — primaria + telaio sotto se presente. */
export function PreventiviOggettoCell({ macchina, telaio }: { macchina: string; telaio?: string }) {
  const primary = macchina.trim() || "—";
  const secondary = telaio?.trim();
  if (!secondary) {
    return <TruncatedTextTooltip text={primary} className={`truncate ${lavTablePrimaryTextClass}`} />;
  }
  return (
    <div className="min-w-0 leading-tight">
      <TruncatedTextTooltip text={primary} className={`truncate ${lavTablePrimaryTextClass}`} />
      <TruncatedTextTooltip text={secondary} className={prevTableSecondaryTextClass} />
    </div>
  );
}

/** Identificazione — stack verticale come tabella Mezzi. */
export function PreventiviIdentificazioneCell({
  targa,
  matricola,
  nScuderia,
}: {
  targa: string;
  matricola: string;
  nScuderia: string;
}) {
  const lines = preventivoIdentificazioneLines({ targa, matricola, nScuderia });
  return (
    <div className={prevTableIdentStackClass}>
      {lines.map((line, i) => (
        <span key={`${i}-${line}`} className={prevTableIdentLineClass}>
          {line}
        </span>
      ))}
    </div>
  );
}

/** Profitto netto + margine % su ricavi (stack come identificazione). */
export function PreventiviProfittoCell({
  profitto,
  marginePercent,
  loading,
}: {
  profitto: number | null;
  marginePercent: number | null;
  loading?: boolean;
}) {
  if (loading) {
    return <span className={`${prevTableBodyTextClass} tabular-nums`}>—</span>;
  }
  if (profitto == null) {
    return <span className={`${prevTableBodyTextClass} tabular-nums`}>—</span>;
  }
  const profitLabel = profitto.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const marginLabel =
    marginePercent != null
      ? `${marginePercent.toLocaleString("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
      : "—";
  return (
    <div className={prevTableIdentStackClass}>
      <span className={`${prevTableIdentLineClass} tabular-nums`}>{profitLabel} €</span>
      <span className={`${prevTableSecondaryTextClass} tabular-nums`}>{marginLabel}</span>
    </div>
  );
}
