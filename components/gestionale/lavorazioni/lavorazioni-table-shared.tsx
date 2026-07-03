"use client";

import { TruncatedTextTooltip } from "@/components/design-system";
import { useMemo, type CSSProperties, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { prioritaLabel } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import type { PrioritaLavorazione } from "@/src/types/supabase-tables";
import {
  formatLavorazioneIngressoDisplay,
  lavorazioneIngressoIso,
} from "@/lib/lavorazioni/lavorazione-ingresso-display";
import {
  lavorazioneOreTotaliSchedaLabel,
  lavorazionePermanenzaGiorniLabel,
} from "@/lib/lavorazioni/lavorazioni-list-table-display";
import {
  gestionaleListTableActionBadge,
  gestionaleListTableActionBtnDanger,
  gestionaleListTableActionBtnInfo,
  gestionaleListTableActionBtnPrimary,
  gestionaleListTableActionBtnSecondary,
  gestionaleListTableActionBtnWithBadge,
  gestionaleListTableActionsGroupEnd,
  gestionaleListTableActionsRowHeight,
  gestionaleListColAttrezzaturaClass,
  gestionaleListColAzioniClass,
  gestionaleListColCantiereClass,
  gestionaleListColClienteClass,
  gestionaleListColCodiceClass,
  gestionaleListColIdentificazioneClass,
  gestionaleListColMatricolaClass,
  gestionaleListColScuderiaClass,
  gestionaleListColTargaClass,
  gestionaleListTableTdIdent,
  gestionaleListColIngressoClass,
  gestionaleListColNoteClass,
  gestionaleListColPillSpacerClass,
  gestionaleListTableColPillSpacerClass,
  gestionaleListTableMasterWrapClass,
  gestionaleListTableTd,
  gestionaleListTableTdAzioni,
  gestionaleListTableTdCenter,
  gestionaleListTableColStatoAddettoInsetClass,
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
export const lavTableActionsRow = gestionaleListTableActionsGroupEnd;
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
export const lavTableColStatoAddettoInset = gestionaleListTableColStatoAddettoInsetClass;
export const lavTableColPillSpacerClass = gestionaleListColPillSpacerClass;
export const lavTableThPillSpacerClass = gestionaleListTableColPillSpacerClass;
export const lavTableTdPillSpacerClass = gestionaleListTableColPillSpacerClass;

/** Padding orizzontale celle pill (px-2.5 × 2, allineato a `globalTableThCell`). */
const LAV_TABLE_PILL_COL_PAD_REM = 1;

function lavTablePillContentWidthRem(labels: readonly string[]): number {
  const maxLen = labels.reduce((m, l) => Math.max(m, l.trim().length), 0);
  return Math.min(9.25, Math.max(6.25, maxLen * 0.48 + 1.55));
}

/** Larghezza uniforme pill tabella = etichetta più lunga del tipo (stato / priorità / addetto). */
export function lavTablePillWrapStyleFromLabels(labels: readonly string[]): CSSProperties {
  return { width: `${lavTablePillContentWidthRem(labels)}rem` };
}

/** Larghezza colonna `<col>`: contenuto pill + padding celle. */
export function lavTablePillColStyleFromLabels(labels: readonly string[]): CSSProperties {
  const w = lavTablePillColWidthRem(labels);
  return { width: `${w}rem`, minWidth: `${w}rem`, maxWidth: `${w}rem` };
}

export function lavTablePillColWidthRem(labels: readonly string[]): number {
  return lavTablePillContentWidthRem(labels) + LAV_TABLE_PILL_COL_PAD_REM;
}

export const lavTableColIngressoClass = gestionaleListColIngressoClass;
export const lavTableColCodiceClass = gestionaleListColCodiceClass;
export const lavTableColClienteClass = gestionaleListColClienteClass;
export const lavTableColCantiereClass = gestionaleListColCantiereClass;
export const lavTableColAttrezzaturaClass = gestionaleListColAttrezzaturaClass;
export const lavTableColIdentificazioneClass = gestionaleListColIdentificazioneClass;
export const lavTableColScuderiaClass = gestionaleListColScuderiaClass;
export const lavTableColTargaClass = gestionaleListColTargaClass;
export const lavTableColMatricolaClass = gestionaleListColMatricolaClass;
export const lavTableTdIdent = gestionaleListTableTdIdent;
export const lavTableColNoteClass = gestionaleListColNoteClass;
export const lavTableColAzioniClass = gestionaleListColAzioniClass;
export const lavTableThAzioni = gestionaleListTableThAzioni;
export const lavTableTdAzioni = gestionaleListTableTdAzioni;

/** @deprecated Alias di `lavTableTdAzioni`. */
export const lavTableTdActionsAttive = lavTableTdAzioni;

/** @deprecated Alias di `lavTableTdAzioni`. */
export const lavTableTdActionsArchivio = lavTableTdAzioni;

/** @deprecated Alias di `lavTableThAzioni`. */
export const lavTableThAzioniAttive = lavTableThAzioni;

/** @deprecated Alias di `lavTableThAzioni`. */
export const lavTableThAzioniArchivio = lavTableThAzioni;

/** Testo principale colonne Ingresso / Cliente / Oggetto — stessa dimensione e peso. */
export const lavTablePrimaryTextClass =
  "text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-100";

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
  const permanenza = lavorazionePermanenzaGiorniLabel(row);
  return (
    <div className="flex min-w-0 flex-col gap-0.5 text-left">
      <span className={`tabular-nums ${lavTablePrimaryTextClass}`}>{date}</span>
      {permanenza !== "—" ? (
        <span className="text-[11px] font-normal leading-tight text-zinc-500 dark:text-zinc-400">{permanenza}</span>
      ) : null}
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
      className={`min-w-0 text-sm font-medium tabular-nums leading-snug text-zinc-900 dark:text-zinc-100 ${
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

function utilizzatoreStackVisible(utilizzatore: string): boolean {
  const t = utilizzatore.trim();
  return t.length > 0 && t !== "—";
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
      <TruncatedTextTooltip
        text={cliente}
        className={`truncate ${lavTablePrimaryTextClass}`}
      />
      {utilizzatoreStackVisible(utilizzatore) ? (
        <TruncatedTextTooltip
          text={utilizzatore.trim()}
          className="truncate text-sm text-zinc-500 dark:text-zinc-400"
        />
      ) : null}
    </div>
  );
}

/** Tre colonne identificazione — scuderia, targa, matricola. */
export function LavorazioniMezzoIdentCells({
  targa,
  matricola,
  nScuderia,
}: {
  targa: string;
  matricola: string;
  nScuderia?: string;
}) {
  const scuderia = (nScuderia ?? "").trim();
  return (
    <>
      <td className={lavTableTdIdent}>
        <LavorazioniMezzoIdentCell value={scuderia} />
      </td>
      <td className={lavTableTdIdent}>
        <LavorazioniMezzoIdentCell value={targa} />
      </td>
      <td className={lavTableTdIdent}>
        <LavorazioniMezzoIdentCell value={matricola} />
      </td>
    </>
  );
}

/** Singolo campo identificazione mezzo — colonna tabella compatta. */
export function LavorazioniMezzoIdentCell({ value }: { value: string }) {
  const t = value.trim();
  if (!t || t === "—") {
    return <span className="text-sm text-zinc-400">—</span>;
  }
  return (
    <TruncatedTextTooltip text={t} className="block truncate text-[13px] font-medium leading-tight text-zinc-900 dark:text-zinc-100" />
  );
}

/** @deprecated Stack verticale — solo mobile / legacy. */
export function LavorazioniMezzoIdentStack({
  targa,
  matricola,
  nScuderia,
}: {
  targa: string;
  matricola: string;
  nScuderia?: string;
}) {
  const norm = (value: string) => {
    const t = value.trim();
    return t && t !== "—" ? t : "";
  };
  const lines = [
    norm(targa),
    norm(matricola),
    norm(nScuderia ?? "") ? `N. ${norm(nScuderia ?? "")}` : "",
  ].filter(Boolean);
  if (lines.length === 0) {
    return <span className="text-sm text-zinc-400">—</span>;
  }
  return (
    <div className="min-w-0 leading-snug">
      {lines.map((text, index) => (
        <TruncatedTextTooltip
          key={`${text}-${index}`}
          text={text}
          className="truncate text-[13px] font-medium text-zinc-900 dark:text-zinc-100"
        />
      ))}
    </div>
  );
}

/** Larghezza wrap pill completamento archivio = media pill Stato + Priorità (tabella in corso). */
export function lavTableArchivioMiddlePillWrapStyle(
  statoLabels: readonly string[],
  prioritaLabels: readonly string[],
): CSSProperties {
  const w =
    (lavTablePillContentWidthRem(statoLabels) + lavTablePillContentWidthRem(prioritaLabels)) / 2;
  return { width: `${w}rem` };
}

export type LavorazioniListTableColStyles = {
  statoPillColStyle: CSSProperties;
  prioritaPillColStyle: CSSProperties;
  addettoPillColStyle: CSSProperties;
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

  return useMemo(
    () => ({
      statoPillColStyle: lavTablePillColStyleFromLabels(statoLabels),
      prioritaPillColStyle: lavTablePillColStyleFromLabels(prioritaLabels),
      addettoPillColStyle: lavTablePillColStyleFromLabels(addettoLabels),
    }),
    [statoLabels, prioritaLabels, addettoLabels],
  );
}

/** Wrap tabella desktop Lavorazioni (scroll + card). */
/** @deprecated Usare `gestionaleListTableMasterWrapClass`. */
export const lavorazioniListTableWrapClass = gestionaleListTableMasterWrapClass;

/** Ore totali scheda lavorazioni + permanenza in giorni (colonna archivio). */
export function LavorazioneOrePermanenzaCell({
  row,
  schedeStore,
  align = "center",
}: {
  row: LavorazioneListRow;
  schedeStore: LavorazioneSchedeStore;
  align?: "center" | "start";
}) {
  const ore = lavorazioneOreTotaliSchedaLabel(row, schedeStore);
  const permanenza = lavorazionePermanenzaGiorniLabel(row);
  const alignClass = align === "start" ? "items-start text-left" : "items-center text-center";
  return (
    <div className={`flex flex-col gap-0.5 ${alignClass}`}>
      <span className="text-xs font-medium tabular-nums text-zinc-800 dark:text-zinc-100">{ore}</span>
      {permanenza !== "—" ? (
        <span className="text-[11px] font-normal leading-tight text-zinc-500 dark:text-zinc-400">{permanenza}</span>
      ) : null}
    </div>
  );
}
