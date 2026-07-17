"use client";

import { memo, type CSSProperties, type ReactNode } from "react";
import { GESTIONALE_LIST_MOBILE_ONLY_CLASS } from "@/lib/ui/use-gestionale-list-layout";
import {
  AddettoSelectField,
  InlineSelectField,
  LavorazioneAddettoReadOnlyPill,
  LavorazioneCompletamentoDatePill,
  LavorazionePrioritaReadOnlyPill,
  type TablePillOption,
} from "@/components/gestionale/lavorazioni/lavorazioni-inline-select";
import {
  formatLavorazioneMobileIdentLine,
  LavMobileInlineField,
  LavorazioneMobileCardFooter,
  LavorazioneMobileCardHeader,
  LavorazioneMobileUltimaModifica,
  LavorazioneMobileCardShell,
  LavorazioneMobileStatusSlot,
  LavorazioneMobileControlsPanel,
  LavorazioneMobileMetaGrid,
  LavorazioneMobileMetaItem,
  LavorazioneMobileNote,
} from "@/components/gestionale/lavorazioni/lavorazione-mobile-card";
import {
  LavorazioneIngressoDateCell,
  lavTableActionBtnDanger,
  lavTableActionBtnInfo,
  lavTableActionBtnPrimary,
  dsTableActionBadge,
  dsTableActionBtnWithBadge,
} from "@/components/gestionale/lavorazioni/lavorazioni-table-shared";
import type { buildLavorazioniPillOptionsFromGlobal } from "@/lib/global-list/build-lavorazioni-pill-options";
import { lavorazioneNoteOperative } from "@/lib/lavorazioni/lavorazione-display-helpers";
import { lavorazioneDataCompletamentoIso } from "@/lib/lavorazioni/lavorazioni-list-table-display";
import {
  lavorazioneAddettoLabel,
  lavorazioneAddettoNomeKey,
  lavorazioneCantiereLabel,
  lavorazioneClienteLabel,
  lavorazioneMacchinaLabel,
  lavorazioneOggettoLabel,
  lavorazioneMezzoIdentParts,
  formatLavorazioneSchedeBadge,
  lavorazioneSchedeBundleRevision,
  lavorazioneSchedeStoreSlice,
  lavorazioneUtilizzatoreLabel,
} from "@/lib/lavorazioni/lavorazioni-list-row-labels";
import type { LavorazioneUltimaModificaInfo } from "@/lib/lavorazioni/lavorazione-ultima-modifica";
import {
  addettoPillShellClass,
  addettoPillShellStyleForName,
  IconRipristinaDaArchivio,
  prioritaLabel,
  prioritaPillShellClass,
  statoPillShellClass,
} from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { statoLavorazioneLabel } from "@/src/shared/selectors";
import { IconActionButton } from "@/components/design-system";
import { dsTableActionGlyph } from "@/lib/ui/design-system";
import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import type { GlobalOptionsSlice } from "@/src/hooks/use-global-options";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LogModificaRow, StatoLavorazione } from "@/src/types/supabase-tables";
import type { LavorazioneSchedeBundle } from "@/types/schede";

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

export type LavorazioneAttivaMobileCardProps = {
  row: LavorazioneListRow;
  bundle?: LavorazioneSchedeBundle;
  loading: boolean;
  canEditWorkOrders: boolean;
  mutPendingBlocking: boolean;
  statiOpts: GlobalOptionsSlice["lavorazioni"]["stati"];
  statiRapidiPillOpts: TablePillOption[];
  prioritaPillOpts: TablePillOption[];
  tablePillOptions: ReturnType<typeof buildLavorazioniPillOptionsFromGlobal>;
  statoPillStyle: CSSProperties;
  prioritaPillStyle: CSSProperties;
  addetti: string[];
  addettiRecords: GlobalOptionsSlice["lavorazioni"]["addettiRecords"];
  addettoColors: GlobalOptionsSlice["lavorazioni"]["addettoColors"];
  ultimaModificaInfo: LavorazioneUltimaModificaInfo;
  concludiDisabled: boolean;
  concludiClassName: string;
  concludiTooltip?: string;
  concludiTooltipDisabled?: boolean;
  onStatoRow: (row: LavorazioneListRow, v: string) => void;
  onPrioritaRow: (row: LavorazioneListRow, v: string) => void;
  onAddettoRow: (row: LavorazioneListRow, v: string) => void;
  onConcludi: (row: LavorazioneListRow) => void;
  onOpenInfo: (row: LavorazioneListRow) => void;
  onOpenSchede: (row: LavorazioneListRow) => void;
};

function LavorazioneAttivaMobileCardInner(props: LavorazioneAttivaMobileCardProps) {
  const {
    row,
    bundle,
    loading,
    canEditWorkOrders,
    mutPendingBlocking,
    statiOpts,
    statiRapidiPillOpts,
    prioritaPillOpts,
    tablePillOptions,
    statoPillStyle,
    prioritaPillStyle,
    addetti,
    addettiRecords,
    addettoColors,
    ultimaModificaInfo,
    concludiDisabled,
    concludiClassName,
    concludiTooltip,
    concludiTooltipDisabled,
    onStatoRow,
    onPrioritaRow,
    onAddettoRow,
    onConcludi,
    onOpenInfo,
    onOpenSchede,
  } = props;

  const schedeStore = lavorazioneSchedeStoreSlice(row.id, bundle);
  const macchina = lavorazioneOggettoLabel(row, schedeStore);
  const utilizzatore = lavorazioneUtilizzatoreLabel(row, schedeStore);
  const addettoLabel = lavorazioneAddettoLabel(row, schedeStore, undefined, addettiRecords);
  const addettoKey = lavorazioneAddettoNomeKey(row, schedeStore, undefined, addettiRecords);
  const schedeBadge = formatLavorazioneSchedeBadge(bundle);

  return (
    <LavorazioneMobileCardShell>
      <LavorazioneMobileCardHeader
        macchina={macchina}
        identLine={formatLavorazioneMobileIdentLine(lavorazioneMezzoIdentParts(row, schedeStore))}
        ingresso={<LavorazioneIngressoDateCell row={row} schedeStore={schedeStore} />}
        statusSlot={
          <LavorazioneMobileStatusSlot>
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
            >
              <option value={row.stato}>{statoLavorazioneLabel(row.stato as StatoLavorazione, statiOpts)}</option>
            </InlineSelectField>
          </LavorazioneMobileStatusSlot>
        }
      />
      <LavorazioneMobileMetaGrid>
        <LavorazioneMobileMetaItem label="Cliente" value={lavorazioneClienteLabel(row, schedeStore)} />
        <LavorazioneMobileMetaItem label="Cantiere" value={lavorazioneCantiereLabel(row, schedeStore)} />
        {utilizzatore ? (
          <LavorazioneMobileMetaItem label="Utilizzatore" value={utilizzatore} className="cab-shell-desktop:col-span-2" />
        ) : null}
      </LavorazioneMobileMetaGrid>
      <LavorazioneMobileNote text={lavorazioneNoteOperative(row, schedeStore)} />
      <LavorazioneMobileControlsPanel>
        <LavMobileInlineField label="Priorità" layout="stack">
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
          >
            <option value={row.priorita}>{prioritaLabel(row.priorita)}</option>
          </InlineSelectField>
        </LavMobileInlineField>
        <LavMobileInlineField label="Addetto" layout="stack">
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
          />
        </LavMobileInlineField>
      </LavorazioneMobileControlsPanel>
      <LavorazioneMobileCardFooter meta={<LavorazioneMobileUltimaModifica info={ultimaModificaInfo} />}>
        <IconActionButton
          label="Concludi"
          disabled={concludiDisabled}
          className={concludiClassName}
          tooltipContent={concludiTooltip}
          tooltipDisabled={concludiTooltipDisabled}
          onClick={() => onConcludi(row)}
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
      </LavorazioneMobileCardFooter>
    </LavorazioneMobileCardShell>
  );
}

export const LavorazioneAttivaMobileCard = memo(LavorazioneAttivaMobileCardInner);

export type LavorazioneArchivioMobileCardProps = {
  row: LavorazioneListRow;
  bundle?: LavorazioneSchedeBundle;
  addettoLogs?: readonly LogModificaRow[];
  canEditWorkOrders: boolean;
  mutPendingBlocking: boolean;
  loading: boolean;
  prioritaColors: GlobalOptionsSlice["lavorazioni"]["prioritaColors"];
  addettiRecords: GlobalOptionsSlice["lavorazioni"]["addettiRecords"];
  addettoColors: GlobalOptionsSlice["lavorazioni"]["addettoColors"];
  ultimaModificaInfo: LavorazioneUltimaModificaInfo;
  onRipristina: (row: LavorazioneListRow) => void;
  onOpenInfo: (row: LavorazioneListRow) => void;
  onOpenSchede: (row: LavorazioneListRow) => void;
  onEditCompletamento?: (row: LavorazioneListRow) => void;
  completamentoEditDisabled?: boolean;
};

function LavorazioneArchivioMobileCardInner({
  row,
  bundle,
  addettoLogs,
  canEditWorkOrders,
  mutPendingBlocking,
  loading,
  prioritaColors,
  addettiRecords,
  addettoColors,
  ultimaModificaInfo,
  onRipristina,
  onOpenInfo,
  onOpenSchede,
  onEditCompletamento,
  completamentoEditDisabled = false,
}: LavorazioneArchivioMobileCardProps) {
  const schedeStore = lavorazioneSchedeStoreSlice(row.id, bundle);
  const macchina = lavorazioneOggettoLabel(row, schedeStore);
  const utilizzatore = lavorazioneUtilizzatoreLabel(row, schedeStore);
  const addettoLabel = lavorazioneAddettoLabel(row, schedeStore, addettoLogs, addettiRecords);
  const addettoKey = lavorazioneAddettoNomeKey(row, schedeStore, addettoLogs, addettiRecords);
  const schedeBadge = formatLavorazioneSchedeBadge(bundle);

  return (
    <LavorazioneMobileCardShell>
      <LavorazioneMobileCardHeader
        macchina={macchina}
        identLine={formatLavorazioneMobileIdentLine(lavorazioneMezzoIdentParts(row, schedeStore))}
        ingresso={<LavorazioneIngressoDateCell row={row} schedeStore={schedeStore} />}
        statusSlot={
          <LavorazioneMobileStatusSlot>
            <LavorazioneCompletamentoDatePill
              iso={lavorazioneDataCompletamentoIso(row)}
              fullWidth={false}
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
          </LavorazioneMobileStatusSlot>
        }
      />
      <LavorazioneMobileMetaGrid>
        <LavorazioneMobileMetaItem label="Cliente" value={lavorazioneClienteLabel(row, schedeStore)} />
        <LavorazioneMobileMetaItem label="Cantiere" value={lavorazioneCantiereLabel(row, schedeStore)} />
        {utilizzatore ? (
          <LavorazioneMobileMetaItem label="Utilizzatore" value={utilizzatore} className="cab-shell-desktop:col-span-2" />
        ) : null}
      </LavorazioneMobileMetaGrid>
      <LavorazioneMobileNote text={lavorazioneNoteOperative(row, schedeStore)} />
      <LavorazioneMobileControlsPanel>
        <LavMobileInlineField label="Priorità" layout="stack">
          <LavorazionePrioritaReadOnlyPill priorita={row.priorita} prioritaColors={prioritaColors} />
        </LavMobileInlineField>
        <LavMobileInlineField label="Addetto" layout="stack">
          <LavorazioneAddettoReadOnlyPill
            addetto={addettoLabel}
            colorKey={addettoKey}
            addettoColors={addettoColors}
          />
        </LavMobileInlineField>
      </LavorazioneMobileControlsPanel>
      <LavorazioneMobileCardFooter meta={<LavorazioneMobileUltimaModifica info={ultimaModificaInfo} />}>
        <IconActionButton
          label="Ripristina"
          tooltipContent={canEditWorkOrders ? undefined : "Sola lettura"}
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
      </LavorazioneMobileCardFooter>
    </LavorazioneMobileCardShell>
  );
}

export const LavorazioneArchivioMobileCard = memo(
  LavorazioneArchivioMobileCardInner,
  (prev, next) =>
    prev.row === next.row &&
    prev.canEditWorkOrders === next.canEditWorkOrders &&
    prev.mutPendingBlocking === next.mutPendingBlocking &&
    prev.loading === next.loading &&
    prev.prioritaColors === next.prioritaColors &&
    prev.addettiRecords === next.addettiRecords &&
    prev.addettoColors === next.addettoColors &&
    prev.addettoLogs === next.addettoLogs &&
    prev.ultimaModificaInfo === next.ultimaModificaInfo &&
    prev.onRipristina === next.onRipristina &&
    prev.onOpenInfo === next.onOpenInfo &&
    prev.onOpenSchede === next.onOpenSchede &&
    prev.onEditCompletamento === next.onEditCompletamento &&
    prev.completamentoEditDisabled === next.completamentoEditDisabled &&
    lavorazioneSchedeBundleRevision(prev.bundle) === lavorazioneSchedeBundleRevision(next.bundle),
);

export function LavorazioniMobileEmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
      {message}
    </p>
  );
}

export type LavorazioniMobileListShellProps = {
  empty: boolean;
  emptyMessage: string;
  children: ReactNode;
};

export function LavorazioniMobileListShell({ empty, emptyMessage, children }: LavorazioniMobileListShellProps) {
  return (
    <div className={`mt-4 space-y-2 ${GESTIONALE_LIST_MOBILE_ONLY_CLASS}`}>
      {empty ? <LavorazioniMobileEmptyState message={emptyMessage} /> : children}
    </div>
  );
}
