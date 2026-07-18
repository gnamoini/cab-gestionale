"use client";

import "@/components/gestionale/lavorazioni/lavorazioni-scroll.css";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { PageHeader } from "@/components/gestionale/page-header";
import {
  PageActionMenu,
} from "@/components/ui";
import { useAuth } from "@/context/auth-context";
import {
  collapsibleExpandedBoolPref,
  useCollapsiblePreference,
} from "@/lib/ui/collapsible-prefs";
import { ClientContattaciButton } from "@/components/lavorazioni-clienti/client-contattaci-button";
const ClientContattaciDialog = dynamic(
  () =>
    import("@/components/lavorazioni-clienti/client-contattaci-dialog").then((m) => ({
      default: m.ClientContattaciDialog,
    })),
  { ssr: false },
);
import { ShellCard } from "@/components/gestionale/shell-card";
import { GestionaleSearchField } from "@/components/gestionale/gestionale-search-field";
import { LavorazioniAdvancedFilterPanel } from "@/components/gestionale/lavorazioni/lavorazioni-advanced-filter-panel";
import { lavorazioniAdvancedFiltersActive } from "@/lib/lavorazioni/lavorazioni-advanced-filters";
import {
  clientPortalPageStack,
} from "@/components/lavorazioni-clienti/client-lavorazioni-loading-skeleton";
import {
  IconActionButton,
  LoadingErrorState,
  PageToolbar,
  PageToolbarResultCount,
} from "@/components/design-system";
import { HubIconOpen } from "@/components/design-system/hub-table-action-icons";
import {
  LavMobileInlineField,
  LavorazioneMobileCardFooter,
  LavorazioneMobileCardShell,
} from "@/components/gestionale/lavorazioni/lavorazione-mobile-card";
const ClientLavorazioneIngressoDialog = dynamic(
  () =>
    import("@/components/lavorazioni-clienti/client-lavorazione-ingresso-dialog").then((m) => ({
      default: m.ClientLavorazioneIngressoDialog,
    })),
  { ssr: false },
);
import {
  IconQrCode,
  IconSchedeIngresso,
} from "@/components/lavorazioni-clienti/client-lavorazioni-icons";
import { ClientLavorazionePhotoStrip } from "@/components/lavorazioni-clienti/client-lavorazione-photos";
const ClientLavorazioneQrDialog = dynamic(
  () =>
    import("@/components/lavorazioni-clienti/client-lavorazione-qr-dialog").then((m) => ({
      default: m.ClientLavorazioneQrDialog,
    })),
  { ssr: false },
);
import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import {
  buildClientPortalRowFields,
} from "@/lib/lavorazioni/client-portal-row-fields";
import {
  buildClientPortalFilterCatalog,
  clientPortalFiltersActive,
  filterClientPortalBundles,
  logClientPortalPipelineDebug,
  type ClientPortalRowBundle,
} from "@/lib/lavorazioni/client-portal-list-filters";
import { groupLavorazioniLogsById, buildClientPortalLogAutoreByLavorazioneId } from "@/lib/lavorazioni/client-portal-ui";
import { clientLavorazioniDetailPath, PORTALE_CLIENTI_LABEL } from "@/lib/lavorazioni/client-portal-access";
import { dsTableActionGlyph } from "@/lib/ui/design-system";
import {
  filterClientPortalStatiOptions,
  resolveClientPortalStatoId,
} from "@/lib/lavorazioni/client-portal-stati";
import { lavorazioneRefLabel } from "@/lib/lavorazioni/client-portal-ui";
import { lavorazioneDisplayCodice } from "@/lib/lavorazioni/lavorazione-codice";
import { statoDisplayColor } from "@/lib/lavorazioni/lavorazioni-theme";
import {
  GestionaleListTable,
  GestionaleListTableActionsHead,
  GlobalTableSortTh,
  type GlobalTableSortPhase,
} from "@/components/gestionale/global-table";
import {
  LavorazioneAddettoReadOnlyPill,
  LavorazioneCompletamentoDatePill,
  LavorazioneReadOnlyPill,
} from "@/components/gestionale/lavorazioni/lavorazioni-inline-select";
import {
  statoPillShellClassDynamic,
  statoPillShellStyle,
} from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import {
  LavorazioneIngressoDateCellFromIso,
  lavTablePrimaryTextClass,
  lavTableActionBtnPrimary,
  lavTableActionBtnSecondary,
  lavTableActionsRow,
  lavTableColStatoAddettoInset,
  lavTableTd,
  lavTableTdAzioni,
  lavTableTdPill,
  lavTableTdPillWrap,
  LavorazioniClienteUtilStack,
  LavorazioniMezzoIdentCells,
  cycleLavorazioniTableSort,
  useLavorazioniListTableColStyles,
  type LavorazioniListTableColStyles,
} from "@/components/gestionale/lavorazioni/lavorazioni-table-shared";
import { lavorazioneDataCompletamentoIso } from "@/lib/lavorazioni/lavorazioni-list-table-display";
import {
  buildLavorazioneRowProfileResolver,
  mergeLazyProfileNamesIntoResolver,
} from "@/lib/lavorazioni/lavorazione-ultima-modifica";
import {
  clientPortalColCantiereClass,
  clientPortalColClienteClass,
  clientPortalColIngressoClass,
  clientPortalColMatricolaClass,
  clientPortalColAzioniClass,
  clientPortalColOggettoClass,
  clientPortalColScuderiaClass,
  clientPortalColStatoClass,
  clientPortalColTargaClass,
  gestionaleClientPortalDenseTableClass,
} from "@/lib/ui/client-portal-list-table";
import {
  sortClientPortalBundles,
  type ClientPortalSortKey,
} from "@/lib/lavorazioni/client-portal-table-sort";
import {
  dsBtnNeutral,
  dsStackPage,
  dsTableRow,
  GESTIONALE_SEARCH_PLACEHOLDER,
} from "@/lib/ui/design-system";
import {
  GESTIONALE_LIST_DESKTOP_ONLY_CLASS,
  GESTIONALE_LIST_MOBILE_ONLY_CLASS,
  type GestionaleListLayout,
} from "@/lib/ui/use-gestionale-list-layout";
import { layoutPageRoot } from "@/lib/ui/responsive-layout-core";
import { CLIENTE_HOME_PATH } from "@/lib/auth/rbac";
import type { LogModificaRow } from "@/src/types/supabase-tables";
import { useClientPortalPageOrchestrator } from "@/src/hooks/use-client-portal-page-orchestrator";
import { useClientLavorazioniArchivioCountQuery } from "@/src/hooks/gestionale/use-client-lavorazioni-queries";
import { useRbac } from "@/src/hooks/use-rbac";
import { useUndoableLog } from "@/src/hooks/gestionale/use-undoable-log";
import { useLavorazioneProfileNamesQuery } from "@/src/hooks/use-lavorazione-profile-names-query";
import { statoLavorazioneLabel } from "@/src/shared/selectors";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneSchedeStore } from "@/types/schede";

const SEARCH_DEBOUNCE_MS = 400;

type RowBundle = ClientPortalRowBundle;

function StatoReadOnlyPill({ stato, statiOpts }: { stato: string; statiOpts: { id: string; label: string; color?: string }[] }) {
  const resolvedStato = resolveClientPortalStatoId(stato, statiOpts);
  const label = statoLavorazioneLabel(resolvedStato, statiOpts) || resolvedStato;
  return (
    <LavorazioneReadOnlyPill
      label={label}
      shellClass={statoPillShellClassDynamic()}
      shellStyle={statoPillShellStyle(statoDisplayColor(resolvedStato, statiOpts))}
    />
  );
}

function RowActions({
  rowId,
  onIngresso,
  onQr,
}: {
  rowId: string;
  onIngresso: () => void;
  onQr: () => void;
}) {
  return (
    <div className={lavTableActionsRow}>
      <IconActionButton
        label="Scheda ingresso"
        className={lavTableActionBtnSecondary}
        onClick={(e) => {
          e.stopPropagation();
          onIngresso();
        }}
      >
        <IconSchedeIngresso />
      </IconActionButton>
      <IconActionButton
        label="QR lavorazione"
        className={lavTableActionBtnSecondary}
        onClick={(e) => {
          e.stopPropagation();
          onQr();
        }}
      >
        <IconQrCode />
      </IconActionButton>
      <IconActionButton
        as="link"
        href={clientLavorazioniDetailPath(rowId)}
        label="Informazioni e avanzamento"
        tooltipContent="Informazioni e avanzamento"
        className={`${lavTableActionBtnPrimary} no-underline`}
        onClick={(e) => e.stopPropagation()}
      >
        <HubIconOpen className={dsTableActionGlyph} />
      </IconActionButton>
    </div>
  );
}

function DesktopTable({
  bundles,
  variant,
  statiOpts,
  colStyles,
  addettoColors,
  emptyMessage,
  sortColumn,
  sortPhase,
  onSort,
  onIngresso,
  onQr,
}: {
  bundles: RowBundle[];
  variant: "active" | "archive";
  statiOpts: { id: string; label: string; color?: string }[];
  colStyles: LavorazioniListTableColStyles;
  addettoColors: Record<string, string | undefined>;
  emptyMessage: string;
  sortColumn: ClientPortalSortKey | null;
  sortPhase: GlobalTableSortPhase;
  onSort: (k: ClientPortalSortKey) => void;
  onIngresso: (row: LavorazioneListRow) => void;
  onQr: (row: LavorazioneListRow) => void;
}) {
  const colgroup =
    variant === "active" ? (
      <>
        <col className={clientPortalColIngressoClass} />
        <col className={clientPortalColClienteClass} />
        <col className={clientPortalColCantiereClass} />
        <col className={clientPortalColOggettoClass} />
        <col className={clientPortalColScuderiaClass} />
        <col className={clientPortalColTargaClass} />
        <col className={clientPortalColMatricolaClass} />
        <col className={clientPortalColStatoClass} />
        <col style={colStyles.addettoPillColStyle} />
        <col className={clientPortalColAzioniClass} />
      </>
    ) : (
      <>
        <col className={clientPortalColIngressoClass} />
        <col className={clientPortalColClienteClass} />
        <col className={clientPortalColCantiereClass} />
        <col className={clientPortalColOggettoClass} />
        <col className={clientPortalColScuderiaClass} />
        <col className={clientPortalColTargaClass} />
        <col className={clientPortalColMatricolaClass} />
        <col className={clientPortalColStatoClass} />
        <col style={colStyles.addettoPillColStyle} />
        <col className={clientPortalColAzioniClass} />
      </>
    );

  const headRow =
    variant === "active" ? (
      <>
        <GlobalTableSortTh label="Ingresso" columnKey="ingresso" sortColumn={sortColumn} sortPhase={sortPhase} align="left" onSort={onSort} />
        <GlobalTableSortTh label="Cliente" columnKey="cliente" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} />
        <GlobalTableSortTh label="Cantiere" columnKey="cantiere" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} />
        <GlobalTableSortTh label="Oggetto" columnKey="attrezzatura" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} />
        <GlobalTableSortTh label="Scuderia" columnKey="nScuderia" sortColumn={sortColumn} sortPhase={sortPhase} align="center" thClassName="gestionale-list-table-col-ident" onSort={onSort} />
        <GlobalTableSortTh label="Targa" columnKey="targa" sortColumn={sortColumn} sortPhase={sortPhase} align="center" thClassName="gestionale-list-table-col-ident" onSort={onSort} />
        <GlobalTableSortTh label="Matricola" columnKey="matricola" sortColumn={sortColumn} sortPhase={sortPhase} align="center" thClassName="gestionale-list-table-col-ident" onSort={onSort} />
        <GlobalTableSortTh label="Stato" columnKey="stato" sortColumn={sortColumn} sortPhase={sortPhase} align="center" thClassName={`${lavTableColStatoAddettoInset} ${clientPortalColStatoClass}`} onSort={onSort} />
        <GlobalTableSortTh label="Addetto" columnKey="addetto" sortColumn={sortColumn} sortPhase={sortPhase} align="center" thClassName={lavTableColStatoAddettoInset} onSort={onSort} />
        <GestionaleListTableActionsHead />
      </>
    ) : (
      <>
        <GlobalTableSortTh label="Ingresso" columnKey="ingresso" sortColumn={sortColumn} sortPhase={sortPhase} align="left" onSort={onSort} />
        <GlobalTableSortTh label="Cliente" columnKey="cliente" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} />
        <GlobalTableSortTh label="Cantiere" columnKey="cantiere" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} />
        <GlobalTableSortTh label="Oggetto" columnKey="attrezzatura" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} />
        <GlobalTableSortTh label="Scuderia" columnKey="nScuderia" sortColumn={sortColumn} sortPhase={sortPhase} align="center" thClassName="gestionale-list-table-col-ident" onSort={onSort} />
        <GlobalTableSortTh label="Targa" columnKey="targa" sortColumn={sortColumn} sortPhase={sortPhase} align="center" thClassName="gestionale-list-table-col-ident" onSort={onSort} />
        <GlobalTableSortTh label="Matricola" columnKey="matricola" sortColumn={sortColumn} sortPhase={sortPhase} align="center" thClassName="gestionale-list-table-col-ident" onSort={onSort} />
        <GlobalTableSortTh label="Completamento" columnKey="completamento" sortColumn={sortColumn} sortPhase={sortPhase} align="center" thClassName={`${lavTableColStatoAddettoInset} ${clientPortalColStatoClass}`} onSort={onSort} />
        <GlobalTableSortTh label="Addetto" columnKey="addetto" sortColumn={sortColumn} sortPhase={sortPhase} align="center" thClassName={lavTableColStatoAddettoInset} onSort={onSort} />
        <GestionaleListTableActionsHead />
      </>
    );

  return (
    <GestionaleListTable
      visibilityClass={GESTIONALE_LIST_DESKTOP_ONLY_CLASS}
      className={gestionaleClientPortalDenseTableClass}
      colgroup={colgroup}
      headRow={headRow}
      empty={bundles.length === 0}
      emptyMessage={emptyMessage}
      colSpan={10}
    >
      {bundles.map(({ row, fields }) => (
        <tr key={row.id} className={`${dsTableRow} h-14 bg-white dark:bg-zinc-900/40`}>
          <td className={lavTableTd}>
            <LavorazioneIngressoDateCellFromIso iso={fields.dataIngressoAt} />
          </td>
          <td className={lavTableTd}>
            <LavorazioniClienteUtilStack cliente={fields.cliente} utilizzatore={fields.utilizzatore} />
          </td>
          <td className={`${lavTableTd} min-w-0 text-sm text-zinc-700 dark:text-zinc-200`}>
            <span className="line-clamp-2 break-words">{fields.cantiere}</span>
          </td>
          <td className={`${lavTableTd} min-w-0`}>
            <div className={`truncate ${lavTablePrimaryTextClass}`}>
              {fields.attrezzatura}
            </div>
          </td>
          <LavorazioniMezzoIdentCells targa={fields.targa} matricola={fields.matricola} nScuderia={fields.nScuderia} />
          {variant === "active" ? (
            <>
              <td className={`${lavTableTdPill} ${lavTableColStatoAddettoInset} ${clientPortalColStatoClass}`}>
                <div className={lavTableTdPillWrap}>
                  <StatoReadOnlyPill stato={row.stato} statiOpts={statiOpts} />
                </div>
              </td>
            </>
          ) : (
            <td className={`${lavTableTdPill} ${lavTableColStatoAddettoInset} ${clientPortalColStatoClass}`}>
              <div className={lavTableTdPillWrap}>
                <LavorazioneCompletamentoDatePill iso={lavorazioneDataCompletamentoIso(row)} />
              </div>
            </td>
          )}
          <td className={`${lavTableTdPill} ${lavTableColStatoAddettoInset}`} style={colStyles.addettoPillColStyle}>
            <div className={lavTableTdPillWrap}>
              <LavorazioneAddettoReadOnlyPill
                addetto={fields.addetto}
                colorKey={fields.addettoNome}
                addettoColors={addettoColors}
              />
            </div>
          </td>
          <td className={lavTableTdAzioni}>
            <RowActions
              rowId={row.id}
              onIngresso={() => onIngresso(row)}
              onQr={() => onQr(row)}
            />
          </td>
        </tr>
      ))}
    </GestionaleListTable>
  );
}

const clientPortalMobileMetaLabelClass =
  "text-[10px] font-medium text-zinc-500 dark:text-zinc-400";
const clientPortalMobileMetaValueClass =
  "mt-0.5 text-xs font-medium leading-snug text-zinc-800 dark:text-zinc-200";

function clientPortalFieldHasValue(value: string): boolean {
  const t = value.trim();
  return Boolean(t && t !== "—");
}

function ClientPortalMobileField({
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
  if (!alwaysShow && !clientPortalFieldHasValue(value)) return null;
  const display = clientPortalFieldHasValue(value) ? value.trim() : "—";
  return (
    <div className={`min-w-0 ${className}`.trim()}>
      <p className={clientPortalMobileMetaLabelClass}>{label}</p>
      <p
        className={`${clientPortalMobileMetaValueClass} break-words${tabular ? " tabular-nums" : ""}`}
        title={display}
      >
        {display}
      </p>
    </div>
  );
}

function ClientPortalMobileCardHeader({
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
  ].filter((f) => clientPortalFieldHasValue(f.value));

  const identificazioneFields = [
    { label: "Scuderia", value: scuderia, tabular: true },
    { label: "Targa", value: targa, tabular: true },
    { label: "Matricola", value: matricola, tabular: true },
  ].filter((f) => clientPortalFieldHasValue(f.value));

  return (
    <div className="pb-1">
      <div className="grid grid-cols-3 gap-x-2 gap-y-2">
        {clientPortalFieldHasValue(oggetto) ? (
          <div className="col-span-2 min-w-0">
            <p className={clientPortalMobileMetaLabelClass}>Oggetto</p>
            <p
              className="mt-0.5 break-words text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-50"
              title={oggetto}
            >
              {oggetto}
            </p>
          </div>
        ) : null}
        <div className={`min-w-0${clientPortalFieldHasValue(oggetto) ? "" : " col-start-3"}`}>
          <p className={clientPortalMobileMetaLabelClass}>Ingresso</p>
          <div className={`${clientPortalMobileMetaValueClass} tabular-nums`}>{ingresso}</div>
        </div>
        {secondaryDate ? (
          <div className="col-start-3 min-w-0">
            <p className={clientPortalMobileMetaLabelClass}>{secondaryDate.label}</p>
            <div className={`${clientPortalMobileMetaValueClass} tabular-nums`}>{secondaryDate.value}</div>
          </div>
        ) : null}
      </div>
      {anagraficaFields.length > 0 ? (
        <dl className="mt-2 grid grid-cols-3 gap-x-2 gap-y-2">
          {anagraficaFields.map((f) => (
            <ClientPortalMobileField
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
            <ClientPortalMobileField
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

function MobileCards({
  bundles,
  variant,
  statiOpts,
  addettoColors,
  schedeStore,
  emptyMessage,
  onIngresso,
  onQr,
}: {
  bundles: RowBundle[];
  variant: "active" | "archive";
  statiOpts: { id: string; label: string; color?: string }[];
  addettoColors: Record<string, string | undefined>;
  schedeStore: LavorazioneSchedeStore;
  emptyMessage: string;
  onIngresso: (row: LavorazioneListRow) => void;
  onQr: (row: LavorazioneListRow) => void;
}) {
  if (bundles.length === 0) {
    return (
      <p className={`rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400 ${GESTIONALE_LIST_MOBILE_ONLY_CLASS}`}>
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className={`mt-2 grid grid-cols-1 gap-2 md:grid-cols-2 ${GESTIONALE_LIST_MOBILE_ONLY_CLASS}`}>
      {bundles.map(({ row, fields }) => {
        return (
          <LavorazioneMobileCardShell key={row.id} className="min-w-0 h-full">
            <ClientPortalMobileCardHeader
              oggetto={fields.attrezzatura}
              cliente={fields.cliente}
              utilizzatore={fields.utilizzatore}
              cantiere={fields.cantiere}
              targa={fields.targa}
              matricola={fields.matricola}
              scuderia={fields.nScuderia}
              ingresso={<LavorazioneIngressoDateCellFromIso iso={fields.dataIngressoAt} />}
            />
            <div
              className="mt-2 grid grid-cols-1 gap-x-3 gap-y-2 cab-shell-desktop:grid-cols-2"
              role="group"
              aria-label={variant === "archive" ? "Completamento e addetto" : "Stato e addetto"}
            >
              {variant === "active" ? (
                <LavMobileInlineField label="Stato" layout="stack">
                  <StatoReadOnlyPill stato={row.stato} statiOpts={statiOpts} />
                </LavMobileInlineField>
              ) : (
                <LavMobileInlineField label="Completamento" layout="stack">
                  <LavorazioneCompletamentoDatePill iso={lavorazioneDataCompletamentoIso(row)} />
                </LavMobileInlineField>
              )}
              <LavMobileInlineField label="Addetto" layout="stack">
                <LavorazioneAddettoReadOnlyPill
                addetto={fields.addetto}
                colorKey={fields.addettoNome}
                addettoColors={addettoColors}
              />
              </LavMobileInlineField>
            </div>
            <div className="mt-2.5">
              <ClientLavorazionePhotoStrip lavorazioneId={row.id} max={3} lazy sizeClass="h-12 w-12" />
            </div>
            <LavorazioneMobileCardFooter meta={null}>
              <RowActions
                rowId={row.id}
                onIngresso={() => onIngresso(row)}
                onQr={() => onQr(row)}
              />
            </LavorazioneMobileCardFooter>
          </LavorazioneMobileCardShell>
        );
      })}
    </div>
  );
}

function LavorazioniSection({
  listLayout,
  sectionLabel,
  bundles,
  variant,
  statiOpts,
  colStyles,
  addettoColors,
  emptyDefault,
  filtersActive,
  sortColumn,
  sortPhase,
  onSort,
  onIngresso,
  onQr,
  schedeStore,
}: {
  listLayout: GestionaleListLayout;
  /** Etichetta accessibilità (titolo visibile sulla ShellCard). */
  sectionLabel: string;
  bundles: RowBundle[];
  variant: "active" | "archive";
  statiOpts: { id: string; label: string; color?: string }[];
  colStyles: LavorazioniListTableColStyles;
  addettoColors: Record<string, string | undefined>;
  schedeStore: LavorazioneSchedeStore;
  emptyDefault: string;
  filtersActive: boolean;
  sortColumn: ClientPortalSortKey | null;
  sortPhase: GlobalTableSortPhase;
  onSort: (k: ClientPortalSortKey) => void;
  onIngresso: (row: LavorazioneListRow) => void;
  onQr: (row: LavorazioneListRow) => void;
}) {
  const emptyMessage = filtersActive ? "Nessun risultato con i filtri attuali." : emptyDefault;

  return (
    <section className="min-w-0" aria-label={sectionLabel}>
      {listLayout === "desktop" ? (
      <DesktopTable
        bundles={bundles}
        variant={variant}
        statiOpts={statiOpts}
        colStyles={colStyles}
        addettoColors={addettoColors}
        emptyMessage={emptyMessage}
        sortColumn={sortColumn}
        sortPhase={sortPhase}
        onSort={onSort}
        onIngresso={onIngresso}
        onQr={onQr}
      />
      ) : null}
      {listLayout === "mobile" ? (
      <MobileCards
        bundles={bundles}
        variant={variant}
        statiOpts={statiOpts}
        addettoColors={addettoColors}
        schedeStore={schedeStore}
        emptyMessage={emptyMessage}
        onIngresso={onIngresso}
        onQr={onQr}
      />
      ) : null}
    </section>
  );
}

const CLIENT_PORTAL_SCHEde_SORT_KEYS = new Set<ClientPortalSortKey>([
  "cantiere",
  "attrezzatura",
  "nScuderia",
  "targa",
  "matricola",
  "addetto",
]);

function clientPortalSortAllowed(key: ClientPortalSortKey, lsdDegraded: boolean): boolean {
  return !lsdDegraded || !CLIENT_PORTAL_SCHEde_SORT_KEYS.has(key);
}

function buildRowBundles(
  rows: readonly LavorazioneListRow[],
  schedeStore: LavorazioneSchedeStore,
  addettiGlobali: readonly string[],
  addettiRecords: readonly AddettoRecord[],
  logsByLavorazioneId: ReadonlyMap<string, readonly LogModificaRow[]>,
): RowBundle[] {
  return rows.map((row) => ({
    row,
    fields: buildClientPortalRowFields(
      row,
      schedeStore,
      addettiGlobali,
      addettiRecords,
      logsByLavorazioneId,
    ),
  }));
}

export function ClientLavorazioniView() {
  const [archivioExpanded, setArchivioExpanded] = useState(false);
  const o = useClientPortalPageOrchestrator({ archivioExpanded: archivioExpanded });
  const { user, authorName } = useAuth();
  const { isCliente } = useRbac();
  const {
    containerRef: listLayoutRef,
    layout: listLayout,
    layoutClassName: listLayoutClassName,
    canRender,
    accessDenied,
    contract,
    persistence,
    archivioListEnabled,
    refresh: refreshClientData,
    refreshBusy,
  } = o;

  const { filters, searchInput, setSearchInput, patchFilters, resetFilters } = persistence;
  const l0 = contract.l0;
  const schedeStore = contract.l1?.schedeStore ?? {};

  const statiOpts = useMemo(
    () => filterClientPortalStatiOptions(l0?.statiOpts ?? []),
    [l0?.statiOpts],
  );
  const statoOrderIds = useMemo(() => statiOpts.map((s) => s.id), [statiOpts]);
  const addettiGlobali = l0?.addettiGlobali ?? [];
  const addettiRecords = l0?.addettiRecords ?? [];
  const colStyles = useLavorazioniListTableColStyles(statiOpts, [], addettiGlobali);
  const addettoColors = l0?.addettoColors ?? {};
  const lsdMode = contract.lsdMode;
  const lsdDegraded = lsdMode === "degraded";
  const lsdPaginated = lsdMode === "paginated";

  const [qrRow, setQrRow] = useState<LavorazioneListRow | null>(null);
  const [ingressoRow, setIngressoRow] = useState<LavorazioneListRow | null>(null);
  const [contattaciOpen, setContattaciOpen] = useState(false);
  const { logQuery: lavModificheLogQuery } = useUndoableLog("lavorazioni", {
    enabled: ingressoRow != null,
  });
  const logsByLavorazioneId = useMemo(
    () => (ingressoRow ? groupLavorazioniLogsById(lavModificheLogQuery.data ?? []) : new Map()),
    [ingressoRow, lavModificheLogQuery.data],
  );

  useEffect(() => {
    const t = window.setTimeout(() => patchFilters({ search: searchInput.trim() }), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [searchInput, patchFilters]);

  const [filtriEspansi, setFiltriEspansi] = useCollapsiblePreference(
    collapsibleExpandedBoolPref(false, {
      scope: "client-lavorazioni",
      key: "filters",
      userId: user?.id ?? null,
    }),
  );

  const [sortInCorsoCol, setSortInCorsoCol] = useState<ClientPortalSortKey | null>(null);
  const [sortInCorsoPhase, setSortInCorsoPhase] = useState<GlobalTableSortPhase>("natural");
  const [sortArchivioCol, setSortArchivioCol] = useState<ClientPortalSortKey | null>(null);
  const [sortArchivioPhase, setSortArchivioPhase] = useState<GlobalTableSortPhase>("natural");

  const filtersActive = clientPortalFiltersActive(filters);

  const allInCorsoBundles = useMemo(
    () => buildRowBundles(l0?.inCorsoRows ?? [], schedeStore, addettiGlobali, addettiRecords, logsByLavorazioneId),
    [l0?.inCorsoRows, schedeStore, addettiGlobali, addettiRecords, logsByLavorazioneId],
  );

  const allArchivioBundles = useMemo(
    () => buildRowBundles(l0?.archivioRows ?? [], schedeStore, addettiGlobali, addettiRecords, logsByLavorazioneId),
    [l0?.archivioRows, schedeStore, addettiGlobali, addettiRecords, logsByLavorazioneId],
  );

  const filterCatalog = useMemo(() => {
    return buildClientPortalFilterCatalog(
      [...allInCorsoBundles, ...allArchivioBundles],
      schedeStore,
      addettiGlobali,
    );
  }, [allInCorsoBundles, allArchivioBundles, schedeStore, addettiGlobali]);

  const inCorsoBundles = useMemo(
    () => filterClientPortalBundles(allInCorsoBundles, filters, schedeStore, "in_corso"),
    [allInCorsoBundles, filters, schedeStore],
  );

  const archivioBundles = useMemo(
    () => filterClientPortalBundles(allArchivioBundles, filters, schedeStore, "archivio"),
    [allArchivioBundles, filters, schedeStore],
  );

  const profileUserIds = useMemo(() => {
    const ids = new Set<string>();
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    for (const row of [...(l0?.inCorsoRows ?? []), ...(l0?.archivioRows ?? [])]) {
      if (row.updated_by?.trim()) ids.add(row.updated_by.trim());
      if (row.created_by?.trim()) ids.add(row.created_by.trim());
      const schedaUpdatedBy = schedeStore[row.id]?.ingresso?.updatedBy?.trim();
      if (schedaUpdatedBy && uuidRe.test(schedaUpdatedBy)) ids.add(schedaUpdatedBy);
    }
    if (ingressoRow) {
      for (const log of lavModificheLogQuery.data ?? []) {
        const id = log.autore_id?.trim();
        if (id) ids.add(id);
      }
    }
    return [...ids];
  }, [ingressoRow, l0?.archivioRows, l0?.inCorsoRows, lavModificheLogQuery.data, schedeStore]);
  const lazyProfileNames = useLavorazioneProfileNamesQuery(profileUserIds, canRender);
  const logAutoreByLavorazioneId = useMemo(
    () =>
      buildClientPortalLogAutoreByLavorazioneId(lavModificheLogQuery.data ?? [], {
        lazyProfileNames,
        currentUserId: user?.id ?? null,
        currentUserDisplayName: authorName,
        omitUnresolvedAutore: true,
      }),
    [authorName, lavModificheLogQuery.data, lazyProfileNames, user?.id],
  );
  const resolveClientPortalProfile = useCallback(
    (row: LavorazioneListRow) =>
      mergeLazyProfileNamesIntoResolver(
        buildLavorazioneRowProfileResolver(row, user?.id ?? null, authorName),
        lazyProfileNames,
      ),
    [authorName, lazyProfileNames, user?.id],
  );

  useEffect(() => {
    if (accessDenied || !l0) return;
    logClientPortalPipelineDebug({
      inCorsoRaw: l0.inCorsoRows.length,
      archivioRaw: l0.archivioRows.length,
      bundlesInCorso: allInCorsoBundles.length,
      bundlesArchivio: allArchivioBundles.length,
      filteredInCorso: inCorsoBundles.length,
      filteredArchivio: archivioBundles.length,
      filters,
      filtersActive,
    });
  }, [
    accessDenied,
    allArchivioBundles.length,
    allInCorsoBundles.length,
    filters,
    filtersActive,
    inCorsoBundles.length,
    archivioBundles.length,
    l0,
  ]);

  const sortedInCorsoBundles = useMemo(
    () =>
      sortClientPortalBundles(inCorsoBundles, sortInCorsoCol, sortInCorsoPhase, "active", statoOrderIds),
    [inCorsoBundles, sortInCorsoCol, sortInCorsoPhase, statoOrderIds],
  );

  const sortedArchivioBundles = useMemo(
    () =>
      sortClientPortalBundles(archivioBundles, sortArchivioCol, sortArchivioPhase, "archive", statoOrderIds),
    [archivioBundles, sortArchivioCol, sortArchivioPhase, statoOrderIds],
  );

  const archivioCachedCount = contract.archivioQ.data?.length;
  const archivioCountQuery = useClientLavorazioniArchivioCountQuery(
    canRender && !archivioListEnabled && archivioCachedCount === undefined,
  );

  const archivioFilteredCount = archivioListEnabled
    ? sortedArchivioBundles.length
    : archivioCachedCount !== undefined
      ? archivioCachedCount
      : archivioCountQuery.isSuccess
        ? (archivioCountQuery.data ?? 0)
        : null;

  const archivioCardTitle =
    archivioFilteredCount === null
      ? "Lavorazioni completate (…)"
      : `Lavorazioni completate (${archivioFilteredCount})`;

  const onSortInCorso = useCallback(
    (k: ClientPortalSortKey) => {
      if (!clientPortalSortAllowed(k, lsdDegraded)) return;
      cycleLavorazioniTableSort(sortInCorsoCol, setSortInCorsoCol, setSortInCorsoPhase, k);
    },
    [lsdDegraded, sortInCorsoCol],
  );

  const onSortArchivio = useCallback(
    (k: ClientPortalSortKey) => {
      if (!clientPortalSortAllowed(k, lsdDegraded)) return;
      cycleLavorazioniTableSort(sortArchivioCol, setSortArchivioCol, setSortArchivioPhase, k);
    },
    [lsdDegraded, sortArchivioCol],
  );

  const showInCorso = filters.section !== "archivio";
  const showArchivio = filters.section !== "in_corso";

  const totalResults =
    (showInCorso ? inCorsoBundles.length : 0) +
    (showArchivio ? (archivioListEnabled ? archivioBundles.length : (archivioFilteredCount ?? 0)) : 0);

  const resetRicerca = useCallback(() => {
    setSearchInput("");
    patchFilters({ search: "" });
  }, [patchFilters, setSearchInput]);

  const resetFiltri = useCallback(() => {
    resetFilters();
    setFiltriEspansi(false);
  }, [resetFilters]);

  if (accessDenied) {
    return (
      <>
        <PageHeader title={PORTALE_CLIENTI_LABEL} />
        <div className={dsStackPage}>
          <ShellCard>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Non hai permesso per consultare il portale clienti. Contatta un amministratore per assegnare il ruolo Cliente.
            </p>
            <Link href={CLIENTE_HOME_PATH} className={`mt-4 inline-flex ${dsBtnNeutral}`}>
              Torna al portale
            </Link>
          </ShellCard>
        </div>
      </>
    );
  }

  const listError = contract.l0Status === "error" ? contract.error : null;

  let listBody: ReactNode;
  if (lsdPaginated) {
    listBody = (
      <ShellCard>
        <p className="text-sm text-[color:var(--cab-text)]">
          Lo storico lavorazioni supera la soglia consultabile dal portale. Contatta CAB per assistenza.
        </p>
      </ShellCard>
    );
  } else if (listError) {
    listBody = (
      <ShellCard>
        <LoadingErrorState
          title="Impossibile caricare le lavorazioni"
          description="Controlla la connessione e riprova."
          onRetry={() => {
            void contract.retryL0();
          }}
        />
      </ShellCard>
    );
  } else {
    listBody = (
      <>
        {showInCorso ? (
          <ShellCard
            title={`Lavorazioni in corso (${sortedInCorsoBundles.length})`}
            collapsible
            defaultCollapsed={false}
            persistScope="client-lavorazioni"
            persistKey="attive"
          >
            <LavorazioniSection
              listLayout={listLayout}
              sectionLabel="Lavorazioni in corso"
              bundles={sortedInCorsoBundles}
              variant="active"
              statiOpts={statiOpts}
              colStyles={colStyles}
              addettoColors={addettoColors}
              schedeStore={schedeStore}
              emptyDefault="Nessuna lavorazione in corso."
              filtersActive={filtersActive}
              sortColumn={sortInCorsoCol}
              sortPhase={sortInCorsoPhase}
              onSort={onSortInCorso}
              onIngresso={setIngressoRow}
              onQr={setQrRow}
            />
          </ShellCard>
        ) : null}
        {showArchivio ? (
          <ShellCard
            title={archivioCardTitle}
            collapsible
            defaultCollapsed
            persistScope="client-lavorazioni"
            persistKey="archivio"
            persist={false}
            onCollapsedChange={(collapsed) => setArchivioExpanded(!collapsed)}
          >
            <LavorazioniSection
              listLayout={listLayout}
              sectionLabel="Lavorazioni completate"
              bundles={sortedArchivioBundles}
              variant="archive"
              statiOpts={statiOpts}
              colStyles={colStyles}
              addettoColors={addettoColors}
              schedeStore={schedeStore}
              emptyDefault="Nessuna lavorazione in archivio."
              filtersActive={filtersActive}
              sortColumn={sortArchivioCol}
              sortPhase={sortArchivioPhase}
              onSort={onSortArchivio}
              onIngresso={setIngressoRow}
              onQr={setQrRow}
            />
          </ShellCard>
        ) : null}
      </>
    );
  }

  return (
    <div ref={listLayoutRef} className={`lavorazioni-scroll-scope ${layoutPageRoot} ${listLayoutClassName}`.trim()}>
    <>
      <div className="[&_header]:mb-2 sm:[&_header]:mb-3">
        <PageHeader
          title={PORTALE_CLIENTI_LABEL}
          actions={
            <PageActionMenu
              onRefresh={() => void refreshClientData()}
              refreshBusy={refreshBusy}
            />
          }
        />
      </div>

      <div className={clientPortalPageStack}>
        {!canRender ? (
          <div className="min-h-[12rem]" role="status" aria-busy="true" aria-label="Caricamento lavorazioni" />
        ) : (
          <>
            {lsdDegraded ? (
              <ShellCard>
                <p className="text-sm text-[color:var(--cab-text-muted)]">
                  Storico ampio: ordinamento su colonne scheda disabilitato per mantenere la pagina reattiva.
                </p>
              </ShellCard>
            ) : null}
            <ShellCard>
              <section aria-label="Azioni e filtri lavorazioni clienti">
                <PageToolbar
                  primaryAction={
                    <ClientContattaciButton variant="primary" onClick={() => setContattaciOpen(true)} />
                  }
                  search={
                    <GestionaleSearchField
                      id="client-lavorazioni-search"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          patchFilters({ search: searchInput.trim() });
                        }
                      }}
                      placeholder={GESTIONALE_SEARCH_PLACEHOLDER}
                      aria-label="Cerca lavorazioni clienti"
                      wrapperClassName="min-w-0 flex-1 sm:min-w-[12rem]"
                    />
                  }
                  filtersExpanded={filtriEspansi}
                  onFiltersToggle={() => setFiltriEspansi((o) => !o)}
                  filtersActive={filtersActive}
                  filtersPanel={
                    <LavorazioniAdvancedFilterPanel
                      filters={filters}
                      onChange={patchFilters}
                      catalog={filterCatalog}
                      variant="clientPortal"
                      restrictUtilizzatoriToCatalog={isCliente}
                    />
                  }
                  onFilterReset={resetFiltri}
                  meta={
                    <PageToolbarResultCount
                      count={totalResults}
                      filtersActive={lavorazioniAdvancedFiltersActive(filters)}
                      searchActive={filters.search.trim().length > 0 || searchInput.trim().length > 0}
                      onSearchReset={resetRicerca}
                      onFilterReset={resetFiltri}
                    />
                  }
                />
              </section>
            </ShellCard>

            {listBody}
          </>
        )}
      </div>

      {qrRow ? (
        <ClientLavorazioneQrDialog
          open
          onClose={() => setQrRow(null)}
          lavorazioneId={qrRow.id}
          refLabel={lavorazioneRefLabel(qrRow.id, qrRow.codice)}
        />
      ) : null}

      {ingressoRow ? (
        <ClientLavorazioneIngressoDialog
          open
          onClose={() => setIngressoRow(null)}
          row={ingressoRow}
          schedeStore={schedeStore}
          addettiGlobali={addettiGlobali}
          addettiRecords={addettiRecords}
          autoreLog={logAutoreByLavorazioneId.get(ingressoRow.id) ?? ""}
          resolveUserId={resolveClientPortalProfile(ingressoRow)}
        />
      ) : null}

      {contattaciOpen ? <ClientContattaciDialog open onClose={() => setContattaciOpen(false)} /> : null}
    </>
    </div>
  );
}
