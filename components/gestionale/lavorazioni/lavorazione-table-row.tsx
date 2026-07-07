"use client";

import { memo, type CSSProperties } from "react";
import {
  AddettoSelectField,
  InlineSelectField,
  LavorazioneAddettoReadOnlyPill,
  LavorazioneCompletamentoDatePill,
  type TablePillOption,
} from "@/components/gestionale/lavorazioni/lavorazioni-inline-select";
import {
  LavorazioniClienteUtilStack,
  LavorazioniMezzoIdentCells,
  LavorazioneIngressoDateCell,
  lavTablePrimaryTextClass,
  lavTableActionBtnDanger,
  lavTableActionBtnInfo,
  lavTableActionBtnPrimary,
  lavTableActionBtnSecondary,
  dsTableActionBadge,
  dsTableActionBtnWithBadge,
  lavTableActionsRow,
  lavTableTd,
  lavTableTdAzioni,
  lavTableTdCenter,
  lavTableTdPill,
  lavTableTdPillWrap,
  lavTableColStatoAddettoInset,
  LavorazioneOrePermanenzaCell,
} from "@/components/gestionale/lavorazioni/lavorazioni-table-shared";
import type { buildLavorazioniPillOptionsFromGlobal } from "@/lib/global-list/build-lavorazioni-pill-options";
import {
  lavorazioneAddettoLabel,
  lavorazioneAddettoNomeKey,
  lavorazioneCantiereLabel,
  lavorazioneMacchinaLabel,
  lavorazioneOggettoLabel,
  lavorazioneMezzoIdentParts,
  formatLavorazioneSchedeBadge,
  lavorazioneSchedeBundleRevision,
  lavorazioneSchedeStoreSlice,
  lavorazioneTelaioLabel,
  lavorazioneUtilizzatoreLabel,
  lavorazioneClienteLabel,
} from "@/lib/lavorazioni/lavorazioni-list-row-labels";
import { lavorazioneDataCompletamentoIso } from "@/lib/lavorazioni/lavorazioni-list-table-display";
import { lavorazioneNoteOperative } from "@/lib/lavorazioni/lavorazione-display-helpers";
import { gestionaleListTableIsLastRow, gestionaleListTableLastRowAttr, gestionaleListTableRowClass, gestionaleListTableRowTone } from "@/lib/ui/gestionale-list-table";
import { dsTableActionGlyph } from "@/lib/ui/design-system";
import { IconActionButton } from "@/components/design-system";
import {
  addettoPillShellClass,
  addettoPillShellStyleForName,
  IconRipristinaDaArchivio,
  prioritaLabel,
  prioritaPillShellClass,
  statoPillShellClass,
} from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { statoLavorazioneLabel } from "@/src/shared/selectors";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LogModificaRow } from "@/src/types/supabase-tables";
import type { StatoLavorazione } from "@/src/types/supabase-tables";
import type { LavorazioneSchedeBundle } from "@/types/schede";
import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import type { GlobalOptionsSlice } from "@/src/hooks/use-global-options";

const lavTablePillFillClass = "w-full min-w-0";

function IconCloseWork({ className = dsTableActionGlyph }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconInfo({ className = dsTableActionGlyph }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
    </svg>
  );
}

function IconSchede({ className = dsTableActionGlyph }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function ClienteUtilizzatoreCell({
  row,
  bundle,
}: {
  row: LavorazioneListRow;
  bundle?: LavorazioneSchedeBundle;
}) {
  const schedeStore = lavorazioneSchedeStoreSlice(row.id, bundle);
  const cliente = lavorazioneClienteLabel(row, schedeStore);
  const utilizzatore = lavorazioneUtilizzatoreLabel(row, schedeStore);
  return <LavorazioniClienteUtilStack cliente={cliente} utilizzatore={utilizzatore} />;
}

function MezzoIdentCells({ row, bundle }: { row: LavorazioneListRow; bundle?: LavorazioneSchedeBundle }) {
  const schedeStore = lavorazioneSchedeStoreSlice(row.id, bundle);
  const p = lavorazioneMezzoIdentParts(row, schedeStore);
  return <LavorazioniMezzoIdentCells targa={p.targa} matricola={p.matricola} nScuderia={p.scuderia} />;
}

export type LavorazioneAttivaTableRowProps = {
  row: LavorazioneListRow;
  bundle?: LavorazioneSchedeBundle;
  flash: boolean;
  navBulkFlash: boolean;
  rowIndex: number;
  rowCount: number;
  loading: boolean;
  canEditWorkOrders: boolean;
  mutPendingBlocking: boolean;
  statiOpts: GlobalOptionsSlice["lavorazioni"]["stati"];
  statiRapidiPillOpts: TablePillOption[];
  prioritaPillOpts: TablePillOption[];
  tablePillOptions: ReturnType<typeof buildLavorazioniPillOptionsFromGlobal>;
  statoPillStyle: CSSProperties;
  prioritaPillStyle: CSSProperties;
  addettoColors: GlobalOptionsSlice["lavorazioni"]["addettoColors"];
  addettiRecords: GlobalOptionsSlice["lavorazioni"]["addettiRecords"];
  addetti: string[];
  onStatoRow: (row: LavorazioneListRow, v: string) => void;
  onPrioritaRow: (row: LavorazioneListRow, v: string) => void;
  onAddettoRow: (row: LavorazioneListRow, v: string) => void;
  onConcludiAction: (row: LavorazioneListRow) => void;
  onOpenInfo: (row: LavorazioneListRow) => void;
  onOpenSchede: (row: LavorazioneListRow) => void;
};

function LavorazioneAttivaTableRowInner({
  row,
  bundle,
  flash,
  navBulkFlash,
  rowIndex,
  rowCount,
  loading,
  canEditWorkOrders,
  mutPendingBlocking,
  statiOpts,
  statiRapidiPillOpts,
  prioritaPillOpts,
  tablePillOptions,
  statoPillStyle,
  prioritaPillStyle,
  addettoColors,
  addettiRecords,
  addetti,
  onStatoRow,
  onPrioritaRow,
  onAddettoRow,
  onConcludiAction,
  onOpenInfo,
  onOpenSchede,
}: LavorazioneAttivaTableRowProps) {
  const schedeStore = lavorazioneSchedeStoreSlice(row.id, bundle);
  const macchina = lavorazioneOggettoLabel(row, schedeStore);
  const telaio = lavorazioneTelaioLabel(row, schedeStore);
  const addettoLabel = lavorazioneAddettoLabel(row, schedeStore, undefined, addettiRecords);
  const addettoKey = lavorazioneAddettoNomeKey(row, schedeStore, undefined, addettiRecords);
  const awaitingCompletata = row.stato !== "completata" && row.archived !== true;
  const schedeBadge = formatLavorazioneSchedeBadge(bundle);

  return (
    <tr
      id={`lavorazioni-row-${row.id}`}
      data-gestionale-row-tone={gestionaleListTableRowTone({ flash: flash || navBulkFlash })}
      {...(gestionaleListTableIsLastRow(rowIndex, rowCount)
        ? { [gestionaleListTableLastRowAttr]: "true" }
        : {})}
      className={gestionaleListTableRowClass}
    >
      <td className={lavTableTd}>
        <LavorazioneIngressoDateCell row={row} schedeStore={schedeStore} />
      </td>
      <td className={lavTableTd}>
        <ClienteUtilizzatoreCell row={row} bundle={bundle} />
      </td>
      <td className={`${lavTableTd} min-w-0 text-sm text-zinc-700 dark:text-zinc-200`}>
        <span className="line-clamp-2 break-words">{lavorazioneCantiereLabel(row, schedeStore)}</span>
      </td>
      <td className={`${lavTableTd} min-w-0`}>
        <div className={`truncate ${lavTablePrimaryTextClass}`}>{macchina}</div>
      </td>
      <MezzoIdentCells row={row} bundle={bundle} />
      <td className={`${lavTableTd} gestionale-list-table-col-note min-w-0 text-sm text-zinc-600 dark:text-zinc-300`}>
        <span className="line-clamp-2">{lavorazioneNoteOperative(row, schedeStore) || "—"}</span>
      </td>
      <td className={`${lavTableTdPill} ${lavTableColStatoAddettoInset}`}>
        <div className={lavTableTdPillWrap}>
          <InlineSelectField
            tablePill
            tablePillWidth={lavTablePillFillClass}
            tablePillOptions={statiRapidiPillOpts}
            shellClass={statoPillShellClass()}
            shellStyle={statoPillStyle}
            value={row.stato}
            onChange={(v) => onStatoRow(row, v)}
            ariaLabel={`Stato — ${macchina}`}
            disabled={loading || !canEditWorkOrders}
            title={statoLavorazioneLabel(row.stato as StatoLavorazione, statiOpts)}
          >
            <option value={row.stato}>{statoLavorazioneLabel(row.stato as StatoLavorazione, statiOpts)}</option>
          </InlineSelectField>
        </div>
      </td>
      <td className={lavTableTdPill}>
        <div className={lavTableTdPillWrap}>
          <InlineSelectField
            tablePill
            tablePillWidth={lavTablePillFillClass}
            tablePillOptions={prioritaPillOpts}
            shellClass={prioritaPillShellClass()}
            shellStyle={prioritaPillStyle}
            value={row.priorita}
            onChange={(v) => onPrioritaRow(row, v)}
            ariaLabel={`Priorità — ${macchina}`}
            disabled={loading || !canEditWorkOrders}
            title={prioritaLabel(row.priorita)}
          >
            <option value={row.priorita}>{prioritaLabel(row.priorita)}</option>
          </InlineSelectField>
        </div>
      </td>
      <td className={`${lavTableTdPill} ${lavTableColStatoAddettoInset}`}>
        <div className={lavTableTdPillWrap}>
          <AddettoSelectField
            variant="pill"
            tablePillWidth={lavTablePillFillClass}
            options={tablePillOptions.addetto(addettoKey)}
            shellClass={addettoPillShellClass()}
            shellStyle={addettoPillShellStyleForName(addettoKey, addettoColors)}
            value={addettoKey}
            onChange={(v) => onAddettoRow(row, v)}
            ariaLabel={`Addetto — ${macchina}`}
            disabled={loading || !canEditWorkOrders || addetti.length === 0}
            title={addettoLabel}
          />
        </div>
      </td>
      <td className={lavTableTdAzioni}>
        <div className={lavTableActionsRow}>
          <IconActionButton
            label="Concludi"
            disabled={mutPendingBlocking || loading || !canEditWorkOrders || row.archived === true}
            className={`${lavTableActionBtnSecondary}${awaitingCompletata ? " opacity-50" : ""}`}
            tooltipContent={
              row.stato === "completata" ? "Concludi" : "Imposta come completata per archiviarla"
            }
            onClick={() => onConcludiAction(row)}
          >
            <IconCloseWork />
          </IconActionButton>
          <IconActionButton
            label="Informazioni"
            className={lavTableActionBtnInfo}
            disabled={mutPendingBlocking}
            onClick={() => onOpenInfo(row)}
          >
            <IconInfo />
          </IconActionButton>
          <IconActionButton
            label="Schede"
            className={`${lavTableActionBtnPrimary} ${dsTableActionBtnWithBadge}`}
            disabled={mutPendingBlocking}
            onClick={() => onOpenSchede(row)}
          >
            <IconSchede />
            <span className={dsTableActionBadge} aria-hidden>
              {schedeBadge}
            </span>
          </IconActionButton>
        </div>
      </td>
    </tr>
  );
}

export const LavorazioneAttivaTableRow = memo(LavorazioneAttivaTableRowInner);

export type LavorazioneArchivioTableRowProps = {
  row: LavorazioneListRow;
  bundle?: LavorazioneSchedeBundle;
  flash: boolean;
  navBulkFlash: boolean;
  rowIndex: number;
  rowCount: number;
  canEditWorkOrders: boolean;
  mutPendingBlocking: boolean;
  loading: boolean;
  addettoLogs?: readonly LogModificaRow[];
  addettoColors: GlobalOptionsSlice["lavorazioni"]["addettoColors"];
  addettiRecords: GlobalOptionsSlice["lavorazioni"]["addettiRecords"];
  onRipristina: (row: LavorazioneListRow) => void;
  onOpenInfo: (row: LavorazioneListRow) => void;
  onOpenSchede: (row: LavorazioneListRow) => void;
  onEditCompletamento?: (row: LavorazioneListRow) => void;
  completamentoEditDisabled?: boolean;
};

function LavorazioneArchivioTableRowInner({
  row,
  bundle,
  flash,
  navBulkFlash,
  rowIndex,
  rowCount,
  canEditWorkOrders,
  mutPendingBlocking,
  loading,
  addettoLogs,
  addettoColors,
  addettiRecords,
  onRipristina,
  onOpenInfo,
  onOpenSchede,
  onEditCompletamento,
  completamentoEditDisabled = false,
}: LavorazioneArchivioTableRowProps) {
  const schedeStore = lavorazioneSchedeStoreSlice(row.id, bundle);
  const macchina = lavorazioneOggettoLabel(row, schedeStore);
  const schedeBadge = formatLavorazioneSchedeBadge(bundle);
  const addettoLabel = lavorazioneAddettoLabel(row, schedeStore, addettoLogs, addettiRecords);
  const addettoKey = lavorazioneAddettoNomeKey(row, schedeStore, addettoLogs, addettiRecords);

  return (
    <tr
      id={`lavorazioni-storico-row-${row.id}`}
      data-gestionale-row-tone={gestionaleListTableRowTone({ flash: flash || navBulkFlash })}
      {...(gestionaleListTableIsLastRow(rowIndex, rowCount)
        ? { [gestionaleListTableLastRowAttr]: "true" }
        : {})}
      className={gestionaleListTableRowClass}
    >
      <td className={lavTableTd}>
        <LavorazioneIngressoDateCell row={row} schedeStore={schedeStore} />
      </td>
      <td className={lavTableTd}>
        <ClienteUtilizzatoreCell row={row} bundle={bundle} />
      </td>
      <td className={`${lavTableTd} min-w-0 text-sm text-zinc-700 dark:text-zinc-200`}>
        <span className="line-clamp-2 break-words">{lavorazioneCantiereLabel(row, schedeStore)}</span>
      </td>
      <td className={`${lavTableTd} min-w-0`}>
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className={`truncate ${lavTablePrimaryTextClass}`}>
            {macchina}
          </div>
        </div>
      </td>
      <MezzoIdentCells row={row} bundle={bundle} />
      <td className={`${lavTableTd} gestionale-list-table-col-note min-w-0 text-sm text-zinc-600 dark:text-zinc-300`}>
        <span className="line-clamp-2">{lavorazioneNoteOperative(row, schedeStore) || "—"}</span>
      </td>
      <td className={`${lavTableTdPill} ${lavTableColStatoAddettoInset}`}>
        <div className={lavTableTdPillWrap}>
          <LavorazioneCompletamentoDatePill
            iso={lavorazioneDataCompletamentoIso(row)}
            onClick={
              canEditWorkOrders && onEditCompletamento
                ? () => onEditCompletamento(row)
                : undefined
            }
            disabled={
              !canEditWorkOrders ||
              mutPendingBlocking ||
              loading ||
              completamentoEditDisabled
            }
          />
        </div>
      </td>
      <td className={lavTableTdCenter}>
        <LavorazioneOrePermanenzaCell row={row} schedeStore={schedeStore} />
      </td>
      <td className={`${lavTableTdPill} ${lavTableColStatoAddettoInset}`}>
        <div className={lavTableTdPillWrap}>
          <LavorazioneAddettoReadOnlyPill
            addetto={addettoLabel}
            colorKey={addettoKey}
            addettoColors={addettoColors}
          />
        </div>
      </td>
      <td className={lavTableTdAzioni}>
        <div className={lavTableActionsRow}>
          <IconActionButton
            label="Ripristina"
            tooltipContent={canEditWorkOrders ? "Ripristina" : "Sola lettura"}
            className={lavTableActionBtnDanger}
            disabled={!canEditWorkOrders || mutPendingBlocking || loading}
            onClick={() => onRipristina(row)}
          >
            <IconRipristinaDaArchivio />
          </IconActionButton>
          <IconActionButton
            label="Informazioni"
            className={lavTableActionBtnInfo}
            onClick={() => onOpenInfo(row)}
          >
            <IconInfo />
          </IconActionButton>
          <IconActionButton
            label="Schede"
            className={`${lavTableActionBtnPrimary} ${dsTableActionBtnWithBadge}`}
            onClick={() => onOpenSchede(row)}
          >
            <IconSchede />
            <span className={dsTableActionBadge} aria-hidden>
              {schedeBadge}
            </span>
          </IconActionButton>
        </div>
      </td>
    </tr>
  );
}

export const LavorazioneArchivioTableRow = memo(
  LavorazioneArchivioTableRowInner,
  (prev, next) =>
    prev.row === next.row &&
    prev.flash === next.flash &&
    prev.navBulkFlash === next.navBulkFlash &&
    prev.rowIndex === next.rowIndex &&
    prev.rowCount === next.rowCount &&
    prev.canEditWorkOrders === next.canEditWorkOrders &&
    prev.mutPendingBlocking === next.mutPendingBlocking &&
    prev.loading === next.loading &&
    prev.addettoLogs === next.addettoLogs &&
    prev.addettoColors === next.addettoColors &&
    prev.addettiRecords === next.addettiRecords &&
    prev.onRipristina === next.onRipristina &&
    prev.onOpenInfo === next.onOpenInfo &&
    prev.onOpenSchede === next.onOpenSchede &&
    prev.onEditCompletamento === next.onEditCompletamento &&
    prev.completamentoEditDisabled === next.completamentoEditDisabled &&
    lavorazioneSchedeBundleRevision(prev.bundle) === lavorazioneSchedeBundleRevision(next.bundle),
);
