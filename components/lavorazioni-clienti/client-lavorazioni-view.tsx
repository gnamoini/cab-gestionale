"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { PageHeader } from "@/components/gestionale/page-header";
import { ShellCard } from "@/components/gestionale/shell-card";
import { GestionaleSearchField } from "@/components/gestionale/gestionale-search-field";
import { LavorazioniAdvancedFilterPanel } from "@/components/gestionale/lavorazioni/lavorazioni-advanced-filter-panel";
import { buildLavorazioniFilterCatalog } from "@/lib/lavorazioni/lavorazioni-advanced-filters";
import { CardMobile, CardMobileActions, PageToolbar, PageToolbarActions, PageToolbarResultCount } from "@/components/design-system";
import { IconGestionaleRefresh } from "@/components/gestionale/gestionale-log-ui";
import { ClientLavorazioneIngressoDialog } from "@/components/lavorazioni-clienti/client-lavorazione-ingresso-dialog";
import { ClientLavorazioneDocumentsDialog } from "@/components/lavorazioni-clienti/client-lavorazione-documents";
import {
  IconDocument,
  IconInfo,
  IconQrCode,
  IconSchedeIngresso,
} from "@/components/lavorazioni-clienti/client-lavorazioni-icons";
import { ClientLavorazionePhotoStrip } from "@/components/lavorazioni-clienti/client-lavorazione-photos";
import { ClientLavorazioneQrDialog } from "@/components/lavorazioni-clienti/client-lavorazione-qr-dialog";
import {
  buildClientPortalRowFields,
  clientPortalDataCompletamentoLabel,
  type ClientPortalRowFields,
} from "@/lib/lavorazioni/client-portal-row-fields";
import {
  CLIENT_PORTAL_FILTERS_EMPTY,
  clientPortalFiltersActive,
  filterClientPortalBundles,
  loadClientPortalFiltersPersisted,
  saveClientPortalFiltersPersisted,
  type ClientPortalListFilters,
  type ClientPortalRowBundle,
} from "@/lib/lavorazioni/client-portal-list-filters";
import { clientLavorazioniDetailPath } from "@/lib/lavorazioni/client-portal-access";
import { filterClientPortalStatiOptions } from "@/lib/lavorazioni/client-portal-stati";
import { lavorazioneRefLabel } from "@/lib/lavorazioni/client-portal-ui";
import { statoDisplayColor } from "@/lib/lavorazioni/lavorazioni-theme";
import { readablePillStyleFromHex } from "@/lib/lavorazioni/table-pill-readability";
import {
  GestionaleListTable,
  GestionaleListTableActionsHead,
  GlobalTableSortTh,
  type GlobalTableSortPhase,
} from "@/components/gestionale/global-table";
import {
  prioritaLabel,
  prioritaPillShellClass,
  statoPillShellClassDynamic,
} from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import {
  LavorazioneIngressoDateCellFromIso,
  lavTableActionBtnInfo,
  lavTableActionBtnPrimary,
  lavTableActionBtnSecondary,
  lavTableActionsRow,
  lavTableColAttrezzaturaClass,
  lavTableColAzioniClass,
  lavTableColCantiereClass,
  lavTableColClienteClass,
  lavTableColIdentificazioneClass,
  lavTableColIngressoClass,
  lavTableColNoteClass,
  lavTableTd,
  lavTableTdAzioni,
  lavTableTdCenter,
  lavTableTdPill,
  lavTableTdPillWrap,
  lavTablePillTextClass,
  LavorazioniClienteUtilStack,
  LavorazioniMezzoIdentStack,
  cycleLavorazioniTableSort,
  useLavorazioniListTableColStyles,
  type LavorazioniListTableColStyles,
} from "@/components/gestionale/lavorazioni/lavorazioni-table-shared";
import { lavorazioneDataCompletamentoIso } from "@/lib/lavorazioni/lavorazioni-list-table-display";
import { prioritaDisplayColor } from "@/lib/lavorazioni/lavorazioni-theme";
import { orderPrioritaList } from "@/lib/lavorazioni/priorita-order";
import type { PrioritaLavorazione } from "@/src/types/supabase-tables";
import type { PrioritaLav } from "@/lib/lavorazioni/types";
import {
  sortClientPortalBundles,
  type ClientPortalSortKey,
} from "@/lib/lavorazioni/client-portal-table-sort";
import {
  dsBtnNeutral,
  dsPageToolbarBtn,
  dsStackPage,
  dsTableRow,
  dsTypoSectionTitle,
  GESTIONALE_SEARCH_PLACEHOLDER,
} from "@/lib/ui/design-system";
import { useClientLavorazioniArchivioQuery, useClientLavorazioniInCorsoQuery, useClientPortalQueryOpts } from "@/src/hooks/gestionale/use-client-lavorazioni-queries";
import { useLogListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { useClientLavorazioniRefresh } from "@/src/hooks/use-client-lavorazioni-refresh";
import { useLavorazioneSchedeStoreSync } from "@/src/hooks/use-lavorazione-schede-store-sync";
import { useClientLavorazioniAccess } from "@/src/hooks/use-client-lavorazioni-access";
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import { resolveStatoToDbEnum, statoLavorazioneLabel } from "@/src/shared/selectors";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LogModificaRow } from "@/src/types/supabase-tables";
import type { LavorazioneSchedeStore } from "@/types/schede";

const SEARCH_DEBOUNCE_MS = 400;

type RowBundle = ClientPortalRowBundle;

function StatoReadOnlyPill({ stato, statiOpts }: { stato: string; statiOpts: { id: string; label: string; color?: string }[] }) {
  const safeStato = resolveStatoToDbEnum(stato);
  const label = statoLavorazioneLabel(safeStato, statiOpts) || safeStato;
  return (
    <span
      className={`${statoPillShellClassDynamic()} inline-flex w-full min-w-0 max-w-full justify-center px-2 py-1 ${lavTablePillTextClass} whitespace-nowrap`}
      style={readablePillStyleFromHex(statoDisplayColor(safeStato, statiOpts))}
      title={label}
    >
      {label}
    </span>
  );
}

function PrioritaReadOnlyPill({
  priorita,
  prioritaColors,
}: {
  priorita: string;
  prioritaColors: Record<string, string | undefined>;
}) {
  const p = priorita as PrioritaLavorazione;
  const label = prioritaLabel(p);
  const hex =
    p === "urgente" ? "#b91c1c" : prioritaDisplayColor(p as PrioritaLav, prioritaColors);
  return (
    <span
      className={`${prioritaPillShellClass()} inline-flex w-full min-w-0 max-w-full justify-center px-2 py-1 ${lavTablePillTextClass} whitespace-nowrap`}
      style={readablePillStyleFromHex(hex)}
      title={label}
    >
      {label}
    </span>
  );
}

function lavorazioneNoteText(row: LavorazioneListRow, fields: ClientPortalRowFields): string {
  return (row.note ?? "").trim() || fields.descrizioneProblema.trim() || "—";
}

function RowActions({
  rowId,
  onIngresso,
  onQr,
  onDocuments,
}: {
  rowId: string;
  onIngresso: () => void;
  onQr: () => void;
  onDocuments: () => void;
}) {
  return (
    <div className={lavTableActionsRow}>
      <button
        type="button"
        className={lavTableActionBtnPrimary}
        title="Scheda ingresso"
        aria-label="Scheda ingresso"
        onClick={(e) => {
          e.stopPropagation();
          onIngresso();
        }}
      >
        <IconSchedeIngresso />
      </button>
      <button
        type="button"
        className={lavTableActionBtnSecondary}
        title="Documenti PDF"
        aria-label="Documenti PDF"
        onClick={(e) => {
          e.stopPropagation();
          onDocuments();
        }}
      >
        <IconDocument />
      </button>
      <button
        type="button"
        className={lavTableActionBtnSecondary}
        title="QR lavorazione"
        aria-label="QR lavorazione"
        onClick={(e) => {
          e.stopPropagation();
          onQr();
        }}
      >
        <IconQrCode />
      </button>
      <Link
        href={clientLavorazioniDetailPath(rowId)}
        className={`${lavTableActionBtnInfo} no-underline`}
        title="Informazioni e avanzamento"
        aria-label="Informazioni e avanzamento"
        onClick={(e) => e.stopPropagation()}
      >
        <IconInfo />
      </Link>
    </div>
  );
}

function DesktopTable({
  bundles,
  variant,
  statiOpts,
  colStyles,
  prioritaColors,
  emptyMessage,
  sortColumn,
  sortPhase,
  onSort,
  onIngresso,
  onQr,
  onDocuments,
}: {
  bundles: RowBundle[];
  variant: "active" | "archive";
  statiOpts: { id: string; label: string; color?: string }[];
  colStyles: LavorazioniListTableColStyles;
  prioritaColors: Record<string, string | undefined>;
  emptyMessage: string;
  sortColumn: ClientPortalSortKey | null;
  sortPhase: GlobalTableSortPhase;
  onSort: (k: ClientPortalSortKey) => void;
  onIngresso: (row: LavorazioneListRow) => void;
  onQr: (row: LavorazioneListRow) => void;
  onDocuments: (row: LavorazioneListRow) => void;
}) {
  const colgroup =
    variant === "active" ? (
      <>
        <col className={lavTableColIngressoClass} />
        <col className={lavTableColClienteClass} />
        <col className={lavTableColCantiereClass} />
        <col className={lavTableColAttrezzaturaClass} />
        <col className={lavTableColIdentificazioneClass} />
        <col className={lavTableColNoteClass} />
        <col style={colStyles.statoPillColStyle} />
        <col style={colStyles.prioritaPillColStyle} />
        <col style={colStyles.addettoPillColStyle} />
        <col className={lavTableColAzioniClass} />
      </>
    ) : (
      <>
        <col className={lavTableColIngressoClass} />
        <col className={lavTableColClienteClass} />
        <col className={lavTableColCantiereClass} />
        <col className={lavTableColAttrezzaturaClass} />
        <col className={lavTableColIdentificazioneClass} />
        <col className={lavTableColNoteClass} />
        <col style={colStyles.archivioMiddleColStyle} />
        <col style={colStyles.addettoPillColStyle} />
        <col className={lavTableColAzioniClass} />
      </>
    );

  const headRow =
    variant === "active" ? (
      <>
        <GlobalTableSortTh label="Ingresso" columnKey="ingresso" sortColumn={sortColumn} sortPhase={sortPhase} align="left" onSort={onSort} />
        <GlobalTableSortTh label="Cliente" columnKey="cliente" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} />
        <GlobalTableSortTh label="Cantiere" columnKey="cantiere" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} />
        <GlobalTableSortTh label="Attrezzatura" columnKey="attrezzatura" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} />
        <GlobalTableSortTh label="Identificazione" columnKey="mezzoIdent" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} />
        <GlobalTableSortTh label="Note" columnKey="note" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} />
        <GlobalTableSortTh label="Stato" columnKey="stato" sortColumn={sortColumn} sortPhase={sortPhase} align="center" onSort={onSort} />
        <GlobalTableSortTh label="Priorità" columnKey="priorita" sortColumn={sortColumn} sortPhase={sortPhase} align="center" onSort={onSort} />
        <GlobalTableSortTh label="Addetto" columnKey="addetto" sortColumn={sortColumn} sortPhase={sortPhase} align="center" onSort={onSort} />
        <GestionaleListTableActionsHead />
      </>
    ) : (
      <>
        <GlobalTableSortTh label="Ingresso" columnKey="ingresso" sortColumn={sortColumn} sortPhase={sortPhase} align="left" onSort={onSort} />
        <GlobalTableSortTh label="Cliente" columnKey="cliente" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} />
        <GlobalTableSortTh label="Cantiere" columnKey="cantiere" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} />
        <GlobalTableSortTh label="Attrezzatura" columnKey="attrezzatura" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} />
        <GlobalTableSortTh label="Identificazione" columnKey="mezzoIdent" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} />
        <GlobalTableSortTh label="Note" columnKey="note" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} />
        <GlobalTableSortTh label="Completamento" columnKey="completamento" sortColumn={sortColumn} sortPhase={sortPhase} align="center" onSort={onSort} />
        <GlobalTableSortTh label="Addetto" columnKey="addetto" sortColumn={sortColumn} sortPhase={sortPhase} align="center" onSort={onSort} />
        <GestionaleListTableActionsHead />
      </>
    );

  return (
    <GestionaleListTable
      visibilityClass="hidden md:block"
      colgroup={colgroup}
      headRow={headRow}
      empty={bundles.length === 0}
      emptyMessage={emptyMessage}
      colSpan={variant === "active" ? 10 : 9}
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
            <div className="truncate text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100">{fields.attrezzatura}</div>
          </td>
          <td className={lavTableTd}>
            <LavorazioniMezzoIdentStack targa={fields.targa} matricola={fields.matricola} nScuderia={fields.nScuderia} />
          </td>
          <td className={`${lavTableTd} min-w-0 text-sm text-zinc-600 dark:text-zinc-300`}>
            <span className="line-clamp-2">{lavorazioneNoteText(row, fields)}</span>
          </td>
          {variant === "active" ? (
            <>
              <td className={lavTableTdPill}>
                <div className={lavTableTdPillWrap} style={colStyles.statoPillWrapStyle}>
                  <StatoReadOnlyPill stato={row.stato} statiOpts={statiOpts} />
                </div>
              </td>
              <td className={lavTableTdPill}>
                <div className={lavTableTdPillWrap} style={colStyles.prioritaPillWrapStyle}>
                  <PrioritaReadOnlyPill priorita={row.priorita} prioritaColors={prioritaColors} />
                </div>
              </td>
            </>
          ) : (
            <td className={lavTableTdCenter}>
              <LavorazioneIngressoDateCellFromIso iso={lavorazioneDataCompletamentoIso(row)} align="center" />
            </td>
          )}
          <td className={lavTableTdPill}>
            <div className={lavTableTdPillWrap} style={colStyles.addettoPillWrapStyle}>
              <span className={`whitespace-nowrap ${lavTablePillTextClass} text-zinc-800 dark:text-zinc-100`}>
                {fields.addetto}
              </span>
            </div>
          </td>
          <td className={lavTableTdAzioni}>
            <RowActions
              rowId={row.id}
              onIngresso={() => onIngresso(row)}
              onDocuments={() => onDocuments(row)}
              onQr={() => onQr(row)}
            />
          </td>
        </tr>
      ))}
    </GestionaleListTable>
  );
}

function MobileCards({
  bundles,
  variant,
  statiOpts,
  prioritaColors,
  emptyMessage,
  onIngresso,
  onQr,
  onDocuments,
}: {
  bundles: RowBundle[];
  variant: "active" | "archive";
  statiOpts: { id: string; label: string; color?: string }[];
  prioritaColors: Record<string, string | undefined>;
  emptyMessage: string;
  onIngresso: (row: LavorazioneListRow) => void;
  onQr: (row: LavorazioneListRow) => void;
  onDocuments: (row: LavorazioneListRow) => void;
}) {
  if (bundles.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400 md:hidden">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-3 md:hidden">
      {bundles.map(({ row, fields }) => (
        <CardMobile key={row.id}>
          <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{fields.attrezzatura}</p>
          <LavorazioniMezzoIdentStack targa={fields.targa} matricola={fields.matricola} nScuderia={fields.nScuderia} />
          <div className="mt-2 grid gap-1 text-xs text-zinc-600 dark:text-zinc-300">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Ingresso</span>
              <LavorazioneIngressoDateCellFromIso iso={fields.dataIngressoAt} />
            </div>
            {variant === "archive" ? (
              <p>
                <span className="font-semibold uppercase tracking-wide text-zinc-500">Completamento:</span>{" "}
                {clientPortalDataCompletamentoLabel(row)}
              </p>
            ) : null}
            <p>
              <span className="font-semibold uppercase tracking-wide text-zinc-500">Cliente:</span> {fields.cliente}
            </p>
            <p className="pl-0 text-[11px] text-zinc-500">{fields.utilizzatore}</p>
            <p>
              <span className="font-semibold uppercase tracking-wide text-zinc-500">Cantiere:</span> {fields.cantiere}
            </p>
            <p>
              <span className="font-semibold uppercase tracking-wide text-zinc-500">Addetto:</span> {fields.addetto}
            </p>
          </div>
          <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{lavorazioneNoteText(row, fields)}</p>
          {variant === "active" ? (
            <div className="mt-2 flex flex-wrap gap-2">
              <StatoReadOnlyPill stato={row.stato} statiOpts={statiOpts} />
              <PrioritaReadOnlyPill priorita={row.priorita} prioritaColors={prioritaColors} />
            </div>
          ) : null}
          <div className="mt-2">
            <ClientLavorazionePhotoStrip lavorazioneId={row.id} max={3} lazy={false} sizeClass="h-12 w-12" />
          </div>
          <CardMobileActions>
            <button
              type="button"
              className={lavTableActionBtnPrimary}
              title="Scheda ingresso"
              aria-label="Scheda ingresso"
              onClick={() => onIngresso(row)}
            >
              <IconSchedeIngresso />
            </button>
            <button
              type="button"
              className={lavTableActionBtnSecondary}
              title="Documenti PDF"
              aria-label="Documenti PDF"
              onClick={() => onDocuments(row)}
            >
              <IconDocument />
            </button>
            <button
              type="button"
              className={lavTableActionBtnSecondary}
              title="QR lavorazione"
              aria-label="QR lavorazione"
              onClick={() => onQr(row)}
            >
              <IconQrCode />
            </button>
            <Link
              href={clientLavorazioniDetailPath(row.id)}
              className={`${lavTableActionBtnInfo} no-underline`}
              title="Informazioni e avanzamento"
              aria-label="Informazioni e avanzamento"
            >
              <IconInfo />
            </Link>
          </CardMobileActions>
        </CardMobile>
      ))}
    </div>
  );
}

function LavorazioniSection({
  title,
  bundles,
  variant,
  statiOpts,
  colStyles,
  prioritaColors,
  emptyDefault,
  filtersActive,
  sortColumn,
  sortPhase,
  onSort,
  onIngresso,
  onQr,
  onDocuments,
}: {
  title: string;
  bundles: RowBundle[];
  variant: "active" | "archive";
  statiOpts: { id: string; label: string; color?: string }[];
  colStyles: LavorazioniListTableColStyles;
  prioritaColors: Record<string, string | undefined>;
  emptyDefault: string;
  filtersActive: boolean;
  sortColumn: ClientPortalSortKey | null;
  sortPhase: GlobalTableSortPhase;
  onSort: (k: ClientPortalSortKey) => void;
  onIngresso: (row: LavorazioneListRow) => void;
  onQr: (row: LavorazioneListRow) => void;
  onDocuments: (row: LavorazioneListRow) => void;
}) {
  const emptyMessage = filtersActive ? "Nessun risultato con i filtri attuali." : emptyDefault;

  return (
    <section className="space-y-3">
      <div>
        <h2 className={dsTypoSectionTitle}>{title}</h2>
      </div>
      <DesktopTable
        bundles={bundles}
        variant={variant}
        statiOpts={statiOpts}
        colStyles={colStyles}
        prioritaColors={prioritaColors}
        emptyMessage={emptyMessage}
        sortColumn={sortColumn}
        sortPhase={sortPhase}
        onSort={onSort}
        onIngresso={onIngresso}
        onQr={onQr}
        onDocuments={onDocuments}
      />
      <MobileCards
        bundles={bundles}
        variant={variant}
        statiOpts={statiOpts}
        prioritaColors={prioritaColors}
        emptyMessage={emptyMessage}
        onIngresso={onIngresso}
        onQr={onQr}
        onDocuments={onDocuments}
      />
    </section>
  );
}

function buildRowBundles(
  rows: LavorazioneListRow[],
  schedeStore: LavorazioneSchedeStore,
  logsByLav: Map<string, LogModificaRow[]>,
  addettiGlobali: readonly string[],
): RowBundle[] {
  return rows.map((row) => ({
    row,
    fields: buildClientPortalRowFields(row, schedeStore, logsByLav.get(row.id) ?? [], addettiGlobali),
  }));
}

export function ClientLavorazioniView() {
  const access = useClientLavorazioniAccess();
  const globalOpts = useGlobalOptions({ debugTag: "ClientLavorazioniView" });
  const statiOpts = useMemo(
    () => filterClientPortalStatiOptions(globalOpts.lavorazioni.stati),
    [globalOpts.lavorazioni.stati],
  );
  const statoOrderIds = useMemo(() => statiOpts.map((s) => s.id), [statiOpts]);
  const addettiGlobali = globalOpts.lavorazioni.addetti;
  const prioritaOpts = useMemo(
    () => orderPrioritaList(globalOpts.lavorazioni.prioritaDb),
    [globalOpts.lavorazioni.prioritaDb],
  );
  const colStyles = useLavorazioniListTableColStyles(statiOpts, prioritaOpts, addettiGlobali);
  const prioritaColors = globalOpts.lavorazioni.prioritaColors;
  const schedeStore = useLavorazioneSchedeStoreSync();
  const clientPortalOpts = useClientPortalQueryOpts();
  const inCorsoQ = useClientLavorazioniInCorsoQuery(access.allowed);
  const archivioQ = useClientLavorazioniArchivioQuery(access.allowed);
  const logsQ = useLogListQuery(
    { entita: "lavorazioni", limit: 2000 },
    {
      enabled: access.allowed,
      ...clientPortalOpts,
    },
  );
  const { refresh: refreshClientData, busy: refreshBusy } = useClientLavorazioniRefresh(inCorsoQ, archivioQ, logsQ);

  const logsByLav = useMemo(() => {
    const map = new Map<string, NonNullable<typeof logsQ.data>>();
    for (const lg of logsQ.data ?? []) {
      const id = lg.entita_id;
      if (!id) continue;
      const arr = map.get(id) ?? [];
      arr.push(lg);
      map.set(id, arr);
    }
    return map;
  }, [logsQ.data]);

  const [filters, setFilters] = useState<ClientPortalListFilters>(() => {
    const initial = loadClientPortalFiltersPersisted() ?? CLIENT_PORTAL_FILTERS_EMPTY;
    return initial;
  });
  const [searchInput, setSearchInput] = useState(() => filters.search);
  const [filtriEspansi, setFiltriEspansi] = useState(false);

  const patchFilters = useCallback((patch: Partial<ClientPortalListFilters>) => {
    setFilters((prev) => {
      const next = { ...prev, ...patch };
      saveClientPortalFiltersPersisted(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => patchFilters({ search: searchInput.trim() }), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [searchInput, patchFilters]);

  const [qrRow, setQrRow] = useState<LavorazioneListRow | null>(null);
  const [docsRow, setDocsRow] = useState<LavorazioneListRow | null>(null);
  const [ingressoRow, setIngressoRow] = useState<LavorazioneListRow | null>(null);

  const [sortInCorsoCol, setSortInCorsoCol] = useState<ClientPortalSortKey | null>(null);
  const [sortInCorsoPhase, setSortInCorsoPhase] = useState<GlobalTableSortPhase>("natural");
  const [sortArchivioCol, setSortArchivioCol] = useState<ClientPortalSortKey | null>(null);
  const [sortArchivioPhase, setSortArchivioPhase] = useState<GlobalTableSortPhase>("natural");

  const filtersActive = clientPortalFiltersActive(filters);

  const allInCorsoBundles = useMemo(
    () => buildRowBundles(inCorsoQ.data ?? [], schedeStore, logsByLav, addettiGlobali),
    [inCorsoQ.data, schedeStore, logsByLav, addettiGlobali],
  );

  const allArchivioBundles = useMemo(
    () => buildRowBundles(archivioQ.data ?? [], schedeStore, logsByLav, addettiGlobali),
    [archivioQ.data, schedeStore, logsByLav, addettiGlobali],
  );

  const defaultAddetto = addettiGlobali[0] ?? "";

  const filterCatalog = useMemo(() => {
    const rows = [...allInCorsoBundles, ...allArchivioBundles].map((b) => b.row);
    return buildLavorazioniFilterCatalog(rows, schedeStore, addettiGlobali, [], defaultAddetto);
  }, [allInCorsoBundles, allArchivioBundles, schedeStore, addettiGlobali, defaultAddetto]);

  const inCorsoBundles = useMemo(
    () => filterClientPortalBundles(allInCorsoBundles, filters, schedeStore, defaultAddetto, "in_corso"),
    [allInCorsoBundles, filters, schedeStore, defaultAddetto],
  );

  const archivioBundles = useMemo(
    () => filterClientPortalBundles(allArchivioBundles, filters, schedeStore, defaultAddetto, "archivio"),
    [allArchivioBundles, filters, schedeStore, defaultAddetto],
  );

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

  const onSortInCorso = useCallback(
    (k: ClientPortalSortKey) =>
      cycleLavorazioniTableSort(sortInCorsoCol, setSortInCorsoCol, setSortInCorsoPhase, k),
    [sortInCorsoCol],
  );

  const onSortArchivio = useCallback(
    (k: ClientPortalSortKey) =>
      cycleLavorazioniTableSort(sortArchivioCol, setSortArchivioCol, setSortArchivioPhase, k),
    [sortArchivioCol],
  );

  const showInCorso = filters.section !== "archivio";
  const showArchivio = filters.section !== "in_corso";

  const totalResults =
    (showInCorso ? inCorsoBundles.length : 0) + (showArchivio ? archivioBundles.length : 0);

  const resetRicerca = useCallback(() => {
    setSearchInput("");
    patchFilters({ search: "" });
  }, [patchFilters]);

  const resetFiltri = useCallback(() => {
    setSearchInput("");
    setFilters(CLIENT_PORTAL_FILTERS_EMPTY);
    saveClientPortalFiltersPersisted(CLIENT_PORTAL_FILTERS_EMPTY);
  }, []);

  if (access.isLoading) {
    return (
      <>
        <PageHeader title="Lavorazioni (Clienti)" />
        <div className={dsStackPage}>
          <p className="text-sm text-zinc-500">Verifica accesso…</p>
        </div>
      </>
    );
  }

  if (!access.allowed) {
    return (
      <>
        <PageHeader title="Lavorazioni (Clienti)" />
        <div className={dsStackPage}>
          <ShellCard>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Non hai permesso per consultare il portale clienti. Contatta un amministratore per abilitare l&apos;accesso da Sicurezza → Accesso Lavorazioni Clienti.
            </p>
            <Link href="/dashboard" className={`mt-4 inline-flex ${dsBtnNeutral}`}>
              Torna alla dashboard
            </Link>
          </ShellCard>
        </div>
      </>
    );
  }

  const listLoading = inCorsoQ.isLoading || archivioQ.isLoading;
  const listError = inCorsoQ.error ?? archivioQ.error;

  let bodyContent: ReactNode;
  if (listLoading) {
    bodyContent = <p className="text-sm text-zinc-500">Caricamento…</p>;
  } else {
    bodyContent = (
      <div className="space-y-8">
        {showInCorso ? (
          <LavorazioniSection
            title="Lavorazioni in corso"
            bundles={sortedInCorsoBundles}
            variant="active"
            statiOpts={statiOpts}
            colStyles={colStyles}
            prioritaColors={prioritaColors}
            emptyDefault="Nessuna lavorazione in corso."
            filtersActive={filtersActive}
            sortColumn={sortInCorsoCol}
            sortPhase={sortInCorsoPhase}
            onSort={onSortInCorso}
            onIngresso={setIngressoRow}
            onQr={setQrRow}
            onDocuments={setDocsRow}
          />
        ) : null}
        {showArchivio ? (
          <LavorazioniSection
            title="Lavorazioni completate"
            bundles={sortedArchivioBundles}
            variant="archive"
            statiOpts={statiOpts}
            colStyles={colStyles}
            prioritaColors={prioritaColors}
            emptyDefault="Nessuna lavorazione in archivio."
            filtersActive={filtersActive}
            sortColumn={sortArchivioCol}
            sortPhase={sortArchivioPhase}
            onSort={onSortArchivio}
            onIngresso={setIngressoRow}
            onQr={setQrRow}
            onDocuments={setDocsRow}
          />
        ) : null}
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Lavorazioni (Clienti)" />

      <div className={dsStackPage}>
        {listError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100">
            {listError.message ?? "Errore caricamento."}
          </div>
        ) : null}

        <PageToolbar
          primaryAction={null}
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
              statiOpts={statiOpts}
              showSectionFilter
            />
          }
          meta={
            <>
              <PageToolbarResultCount count={totalResults} filtersActive={filtersActive} />
              <PageToolbarActions>
                <button
                  type="button"
                  className={dsPageToolbarBtn}
                  onClick={() => void refreshClientData()}
                  disabled={refreshBusy}
                  aria-busy={refreshBusy}
                >
                  <IconGestionaleRefresh className={refreshBusy ? "animate-spin" : undefined} />
                  {refreshBusy ? "Aggiornamento…" : "Aggiorna"}
                </button>
                <button type="button" className={dsPageToolbarBtn} onClick={resetRicerca}>
                  Pulisci ricerca
                </button>
                <button type="button" className={dsPageToolbarBtn} onClick={resetFiltri}>
                  Reimposta filtri
                </button>
              </PageToolbarActions>
            </>
          }
        />

        <ShellCard>{bodyContent}</ShellCard>
      </div>

      {qrRow ? (
        <ClientLavorazioneQrDialog
          open
          onClose={() => setQrRow(null)}
          lavorazioneId={qrRow.id}
          refLabel={lavorazioneRefLabel(qrRow.id)}
        />
      ) : null}

      {ingressoRow ? (
        <ClientLavorazioneIngressoDialog
          open
          onClose={() => setIngressoRow(null)}
          row={ingressoRow}
          schedeStore={schedeStore}
          logs={logsByLav.get(ingressoRow.id) ?? []}
          addettiGlobali={addettiGlobali}
        />
      ) : null}

      {docsRow ? (
        <ClientLavorazioneDocumentsDialog
          open
          onClose={() => setDocsRow(null)}
          lavorazioneId={docsRow.id}
          refLabel={lavorazioneRefLabel(docsRow.id)}
        />
      ) : null}
    </>
  );
}
