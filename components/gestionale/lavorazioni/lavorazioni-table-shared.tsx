"use client";

import { useMemo, type CSSProperties, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { prioritaLabel } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import type { PrioritaLavorazione } from "@/src/types/supabase-tables";
import {
  formatLavorazioneIngressoDisplay,
  lavorazioneIngressoIso,
} from "@/lib/lavorazioni/lavorazione-ingresso-display";
import {
  gestionaleListTableActionBadge,
  gestionaleListTableActionBtnDanger,
  gestionaleListTableActionBtnInfo,
  gestionaleListTableActionBtnPrimary,
  gestionaleListTableActionBtnSecondary,
  gestionaleListTableActionBtnWithBadge,
  gestionaleListTableActionsGroup,
  gestionaleListTableActionsRowHeight,
  gestionaleListColAttrezzaturaClass,
  gestionaleListColAzioniClass,
  gestionaleListColCantiereClass,
  gestionaleListColClienteClass,
  gestionaleListColIdentificazioneClass,
  gestionaleListColIngressoClass,
  gestionaleListColNoteClass,
  gestionaleListTableMasterWrapClass,
  gestionaleListTableTd,
  gestionaleListTableTdAzioni,
  gestionaleListTableTdCenter,
  gestionaleListTableTdPill,
  gestionaleListTableTdPillWrap,
  gestionaleListTableThAzioni,
} from "@/lib/ui/gestionale-list-table";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneSchedeStore } from "@/types/schede";

/** @deprecated Usare `gestionaleListTableTd` dal master. */
export { gestionaleListTableTd as lavTableTd };

/** Altezza minima pill inline (stato / priorità / addetto). */
export const lavTablePillMinH = "min-h-8";

/** Testo pill tabella — allineato al body della tabella (`text-[13px]`). */
export const lavTablePillTextClass = "text-[13px] font-medium leading-tight tracking-wide";

export const lavTableActionsRowHeight = gestionaleListTableActionsRowHeight;
export const lavTableActionBtnPrimary = gestionaleListTableActionBtnPrimary;
export const lavTableActionBtnSecondary = gestionaleListTableActionBtnSecondary;
export const lavTableActionBtnInfo = gestionaleListTableActionBtnInfo;
export const lavTableActionBtnDanger = gestionaleListTableActionBtnDanger;
export const lavTableActionsRow = gestionaleListTableActionsGroup;
export {
  gestionaleListTableActionBadge as dsTableActionBadge,
  gestionaleListTableActionBtnWithBadge as dsTableActionBtnWithBadge,
};

export const lavTableTdCenter = gestionaleListTableTdCenter;

/** Larghezze pill tabella — bilanciate con le % colonna (no troppo spazio vuoto). */
export const lavTableInlinePillWStato = "w-[12rem] max-w-full";
export const lavTableInlinePillWPriorita = "w-[10.25rem] max-w-full";
export const lavTableInlinePillWAddetto = "w-[11rem] max-w-full";

/** @deprecated Usare `lavTableInlinePillWStato` / `WPriorita` / `WAddetto`. */
export const lavTableInlinePillW = lavTableInlinePillWPriorita;

/** @deprecated Colonne pill: usare `lavTablePillColStyleFromLabels` nel colgroup. */
export const lavTableColStatoClass = "w-[13.5%]";
/** @deprecated Colonne pill: usare `lavTablePillColStyleFromLabels` nel colgroup. */
export const lavTableColPrioritaClass = "w-[10%]";
/** @deprecated Colonne pill: usare `lavTablePillColStyleFromLabels` nel colgroup. */
export const lavTableColAddettoClass = "w-[10.5%]";

/** Alias per import legacy — non usare `width: 1%` (colonne sovrapposte). */
export const lavTableColStatoStyle = lavTableColStatoClass;
export const lavTableColPrioritaStyle = lavTableColPrioritaClass;
export const lavTableColAddettoStyle = lavTableColAddettoClass;
/** @deprecated Usare `lavTableColStatoClass` / `Priorita` / `Addetto` nel colgroup. */
export const lavTableColPillMinStyle = lavTableColStatoClass;

export const lavTableTdPill = gestionaleListTableTdPill;
export const lavTableTdPillWrap = gestionaleListTableTdPillWrap;

/** Padding orizzontale celle pill (px-1.5 × 2) + margine ai bordi colonna. */
const LAV_TABLE_PILL_COL_PAD_REM = 0.75;

function lavTablePillContentWidthRem(labels: readonly string[]): number {
  const maxLen = labels.reduce((m, l) => Math.max(m, l.trim().length), 0);
  return Math.min(12.5, Math.max(7.75, maxLen * 0.56 + 1.95));
}

/** Larghezza uniforme pill tabella = etichetta più lunga del tipo (stato / priorità / addetto). */
export function lavTablePillWrapStyleFromLabels(labels: readonly string[]): CSSProperties {
  return { width: `${lavTablePillContentWidthRem(labels)}rem` };
}

/** Larghezza colonna `<col>`: contenuto pill + padding celle. */
export function lavTablePillColStyleFromLabels(labels: readonly string[]): CSSProperties {
  return { width: `${lavTablePillColWidthRem(labels)}rem` };
}

export function lavTablePillColWidthRem(labels: readonly string[]): number {
  return lavTablePillContentWidthRem(labels) + LAV_TABLE_PILL_COL_PAD_REM;
}

export const lavTableColIngressoClass = gestionaleListColIngressoClass;
export const lavTableColClienteClass = gestionaleListColClienteClass;
export const lavTableColCantiereClass = gestionaleListColCantiereClass;
export const lavTableColAttrezzaturaClass = gestionaleListColAttrezzaturaClass;
export const lavTableColIdentificazioneClass = gestionaleListColIdentificazioneClass;
export const lavTableColNoteClass = gestionaleListColNoteClass;
export const lavTableColAzioniClass = gestionaleListColAzioniClass;
export const lavTableThAzioni = gestionaleListTableThAzioni;
export const lavTableTdAzioni = gestionaleListTableTdAzioni;

/** Archivio: Completamento + Ore = larghezza combinata Stato + Priorità (tabella attive). */
export function lavTableArchivioMiddleColStyle(statoColRem: number, prioritaColRem: number): CSSProperties {
  return { width: `${(statoColRem + prioritaColRem) / 2}rem` };
}

/** @deprecated Alias di `lavTableTdAzioni`. */
export const lavTableTdActionsAttive = lavTableTdAzioni;

/** @deprecated Alias di `lavTableTdAzioni`. */
export const lavTableTdActionsArchivio = lavTableTdAzioni;

/** @deprecated Alias di `lavTableThAzioni`. */
export const lavTableThAzioniAttive = lavTableThAzioni;

/** @deprecated Alias di `lavTableThAzioni`. */
export const lavTableThAzioniArchivio = lavTableThAzioni;

export function LavorazioneIngressoDateCell({
  row,
  schedeStore,
}: {
  row: LavorazioneListRow;
  schedeStore?: LavorazioneSchedeStore;
}) {
  const iso = lavorazioneIngressoIso(
    row,
    schedeStore?.[row.id]?.ingresso?.campi.dataIngresso,
  );
  const { date } = formatLavorazioneIngressoDisplay(iso);
  return (
    <div className="min-w-0 text-left text-xs font-medium tabular-nums text-zinc-800 dark:text-zinc-100">
      {date}
    </div>
  );
}

export function LavorazioneIngressoDateCellFromIso({
  iso,
  align = "left",
}: {
  iso: string;
  align?: "left" | "center";
}) {
  const { date } = formatLavorazioneIngressoDisplay(iso);
  return (
    <div
      className={`min-w-0 text-xs font-medium tabular-nums text-zinc-800 dark:text-zinc-100 ${
        align === "center" ? "text-center" : "text-left"
      }`}
    >
      {date}
    </div>
  );
}

export function cycleLavorazioniTableSort<T extends string>(
  curCol: T | null,
  setCol: (c: T | null) => void,
  setPhase: Dispatch<SetStateAction<"asc" | "desc" | "natural">>,
  k: T,
) {
  if (curCol !== k) {
    setCol(k);
    setPhase(() => "asc");
    return;
  }
  setPhase((prev) => {
    if (prev === "asc") return "desc";
    if (prev === "desc") {
      setCol(null);
      return "natural";
    }
    return "asc";
  });
}

export function LavTableActionsCell({ children }: { children: ReactNode }) {
  return <td className={lavTableTdAzioni}>{children}</td>;
}

/** Stack cliente / utilizzatore — stesso markup tabella Lavorazioni. */
export function LavorazioniClienteUtilStack({
  cliente,
  utilizzatore,
}: {
  cliente: string;
  utilizzatore: string;
}) {
  return (
    <div className="min-w-0 leading-tight">
      <div className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">{cliente}</div>
      <div className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">
        {utilizzatore !== "—" ? utilizzatore : "—"}
      </div>
    </div>
  );
}

/** Stack targa / matricola / scuderia — stesso markup tabella Lavorazioni. */
export function LavorazioniMezzoIdentStack({
  targa,
  matricola,
  nScuderia,
}: {
  targa: string;
  matricola: string;
  nScuderia?: string;
}) {
  return (
    <div className="min-w-0 leading-tight">
      <div className="truncate text-xs font-medium text-zinc-800 dark:text-zinc-100">{targa}</div>
      <div className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">{matricola}</div>
      {nScuderia && nScuderia !== "—" ? (
        <div className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">Scud. {nScuderia}</div>
      ) : null}
    </div>
  );
}

export type LavorazioniListTableColStyles = {
  statoPillColStyle: CSSProperties;
  prioritaPillColStyle: CSSProperties;
  addettoPillColStyle: CSSProperties;
  archivioMiddleColStyle: CSSProperties;
  statoPillWrapStyle: CSSProperties;
  prioritaPillWrapStyle: CSSProperties;
  addettoPillWrapStyle: CSSProperties;
};

/** Larghezze colonne pill — condivise tra Lavorazioni e portale clienti. */
export function useLavorazioniListTableColStyles(
  statiOpts: readonly { id: string; label: string }[],
  prioritaOpts: readonly PrioritaLavorazione[],
  addetti: readonly string[],
): LavorazioniListTableColStyles {
  const statoLabels = useMemo(
    () => statiOpts.map((s) => s.label?.trim() || s.id),
    [statiOpts],
  );
  const prioritaLabels = useMemo(() => prioritaOpts.map((p) => prioritaLabel(p)), [prioritaOpts]);
  const addettoLabels = useMemo(() => ["—", ...addetti], [addetti]);

  const statoColRem = useMemo(() => lavTablePillColWidthRem(statoLabels), [statoLabels]);
  const prioritaColRem = useMemo(() => lavTablePillColWidthRem(prioritaLabels), [prioritaLabels]);

  return useMemo(
    () => ({
      statoPillColStyle: lavTablePillColStyleFromLabels(statoLabels),
      prioritaPillColStyle: lavTablePillColStyleFromLabels(prioritaLabels),
      addettoPillColStyle: lavTablePillColStyleFromLabels(addettoLabels),
      archivioMiddleColStyle: lavTableArchivioMiddleColStyle(statoColRem, prioritaColRem),
      statoPillWrapStyle: lavTablePillWrapStyleFromLabels(statoLabels),
      prioritaPillWrapStyle: lavTablePillWrapStyleFromLabels(prioritaLabels),
      addettoPillWrapStyle: lavTablePillWrapStyleFromLabels(addettoLabels),
    }),
    [statoLabels, prioritaLabels, addettoLabels, statoColRem, prioritaColRem],
  );
}

/** Wrap tabella desktop Lavorazioni (scroll + card). */
/** @deprecated Usare `gestionaleListTableMasterWrapClass`. */
export const lavorazioniListTableWrapClass = gestionaleListTableMasterWrapClass;
