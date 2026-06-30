"use client";

import "@/components/gestionale/lavorazioni/lavorazioni-scroll.css";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { PageHeader } from "@/components/gestionale/page-header";
import { GestionaleRefreshToolbarButton, gestionalePageToolbarActionsInnerClass } from "@/components/gestionale/page-header-toolbar";
import { ClientContattaciButton } from "@/components/lavorazioni-clienti/client-contattaci-button";
import { ClientContattaciDialog } from "@/components/lavorazioni-clienti/client-contattaci-dialog";
import { ShellCard } from "@/components/gestionale/shell-card";
import { CollapsibleAccordionProvider } from "@/lib/ui/collapsible-accordion";
import { GestionaleSearchField } from "@/components/gestionale/gestionale-search-field";
import { LavorazioniAdvancedFilterPanel } from "@/components/gestionale/lavorazioni/lavorazioni-advanced-filter-panel";
import { lavorazioniAdvancedFiltersActive } from "@/lib/lavorazioni/lavorazioni-advanced-filters";
import { ClientLavorazioniLoadingSkeleton } from "@/components/lavorazioni-clienti/client-lavorazioni-loading-skeleton";
import {
  IconActionButton,
  LoadingErrorState,
  PageToolbar,
  PageToolbarResultCount,
} from "@/components/design-system";
import { HubIconOpen } from "@/components/design-system/hub-table-action-icons";
import {
  formatLavorazioneMobileIdentLine,
  LavMobileInlineField,
  LavorazioneMobileCardFooter,
  LavorazioneMobileCardHeader,
  LavorazioneMobileUltimaModifica,
  LavorazioneMobileCardShell,
  LavorazioneMobileControlsPanel,
  LavorazioneMobileMetaGrid,
  LavorazioneMobileMetaItem,
  LavorazioneMobileNote,
} from "@/components/gestionale/lavorazioni/lavorazione-mobile-card";
import { ClientLavorazioneIngressoDialog } from "@/components/lavorazioni-clienti/client-lavorazione-ingresso-dialog";
import {
  IconInfo,
  IconQrCode,
  IconSchedeIngresso,
} from "@/components/lavorazioni-clienti/client-lavorazioni-icons";
import { ClientLavorazionePhotoStrip } from "@/components/lavorazioni-clienti/client-lavorazione-photos";
import { ClientLavorazioneQrDialog } from "@/components/lavorazioni-clienti/client-lavorazione-qr-dialog";
import {
  buildClientPortalRowFields,
  type ClientPortalRowFields,
} from "@/lib/lavorazioni/client-portal-row-fields";
import {
  buildClientPortalFilterCatalog,
  clientPortalFiltersActive,
  CLIENT_PORTAL_FILTERS_EMPTY,
  filterClientPortalBundles,
  loadClientPortalFiltersPersisted,
  logClientPortalPipelineDebug,
  saveClientPortalFiltersPersisted,
  type ClientPortalListFilters,
  type ClientPortalRowBundle,
} from "@/lib/lavorazioni/client-portal-list-filters";
import { clientLavorazioniDetailPath, PORTALE_CLIENTI_LABEL } from "@/lib/lavorazioni/client-portal-access";
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
  dsTableActionBtnWithBadge,
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
  lavTableTdPill,
  lavTableTdPillWrap,
  LavorazioniClienteUtilStack,
  LavorazioniMezzoIdentStack,
  cycleLavorazioniTableSort,
  useLavorazioniListTableColStyles,
  type LavorazioniListTableColStyles,
} from "@/components/gestionale/lavorazioni/lavorazioni-table-shared";
import { lavorazioneDataCompletamentoIso } from "@/lib/lavorazioni/lavorazioni-list-table-display";
import {
  buildLavorazioneRowProfileResolver,
  resolveLavorazioneUltimaModifica,
} from "@/lib/lavorazioni/lavorazione-ultima-modifica";
import { gestionaleLavorazioniDenseTableClass } from "@/lib/ui/gestionale-list-table";
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
  useGestionaleListLayout,
  type GestionaleListLayout,
} from "@/lib/ui/use-gestionale-list-layout";
import { layoutPageRoot } from "@/lib/ui/responsive-layout-core";
import { useViewQueryOpts } from "@/lib/view/view-query-opts";
import { useClientLavorazioniArchivioQuery, useClientLavorazioniInCorsoQuery } from "@/src/hooks/gestionale/use-client-lavorazioni-queries";
import { useLogListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { useClientLavorazioniRefresh } from "@/src/hooks/use-client-lavorazioni-refresh";
import { useSchedeBundlesQuery } from "@/src/hooks/use-schede-store-query";
import { useClientLavorazioniAccess } from "@/src/hooks/use-client-lavorazioni-access";
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import {
  lavorazioniDomainQueryKeys,
  stableLavorazioniFiltersKey,
} from "@/src/services/domain/lavorazioni-domain.queries";
import { statoLavorazioneLabel } from "@/src/shared/selectors";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LogModificaRow } from "@/src/types/supabase-tables";
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

/** Colonna Note — note intervento (scheda ingresso), come lavorazioni principali. */
function lavorazioneNoteInterventoText(fields: ClientPortalRowFields): string {
  const t = fields.noteIntervento.trim();
  return t || "—";
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
        className={`${lavTableActionBtnPrimary} ${dsTableActionBtnWithBadge} no-underline`}
        onClick={(e) => e.stopPropagation()}
      >
        <IconInfo />
        <span
          className="pointer-events-none absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-[4px] border border-[color:color-mix(in_srgb,var(--cab-primary)_45%,var(--cab-border))] bg-[var(--cab-card)] text-[color:var(--cab-primary)] shadow-[var(--cab-shadow-sm)]"
          aria-hidden
        >
          <HubIconOpen className="h-2 w-2" />
        </span>
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
        <col className={lavTableColIngressoClass} />
        <col className={lavTableColClienteClass} />
        <col className={lavTableColCantiereClass} />
        <col className={lavTableColAttrezzaturaClass} />
        <col className={lavTableColIdentificazioneClass} />
        <col className={lavTableColNoteClass} />
        <col style={colStyles.statoPillColStyle} />
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
        <col style={colStyles.statoPillColStyle} />
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
      visibilityClass={GESTIONALE_LIST_DESKTOP_ONLY_CLASS}
      className={gestionaleLavorazioniDenseTableClass}
      colgroup={colgroup}
      headRow={headRow}
      empty={bundles.length === 0}
      emptyMessage={emptyMessage}
      colSpan={9}
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
            <span className="line-clamp-2">{lavorazioneNoteInterventoText(fields)}</span>
          </td>
          {variant === "active" ? (
            <>
              <td className={lavTableTdPill}>
                <div className={lavTableTdPillWrap}>
                  <StatoReadOnlyPill stato={row.stato} statiOpts={statiOpts} />
                </div>
              </td>
            </>
          ) : (
            <td className={lavTableTdPill}>
              <div className={lavTableTdPillWrap}>
                <LavorazioneCompletamentoDatePill iso={lavorazioneDataCompletamentoIso(row)} />
              </div>
            </td>
          )}
          <td className={lavTableTdPill}>
            <div className={lavTableTdPillWrap}>
              <LavorazioneAddettoReadOnlyPill addetto={fields.addetto} addettoColors={addettoColors} />
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
    <div className={`mt-4 space-y-2 ${GESTIONALE_LIST_MOBILE_ONLY_CLASS}`}>
      {bundles.map(({ row, fields }) => {
        const identLine = formatLavorazioneMobileIdentLine({
          targa: fields.targa,
          matricola: fields.matricola,
          scuderia: fields.nScuderia,
        });
        const utilizzatore =
          fields.utilizzatore.trim() && fields.utilizzatore !== "—" ? fields.utilizzatore : null;

        return (
          <LavorazioneMobileCardShell key={row.id}>
            <LavorazioneMobileCardHeader
              macchina={fields.attrezzatura}
              identLine={identLine}
              ingresso={<LavorazioneIngressoDateCellFromIso iso={fields.dataIngressoAt} />}
              secondaryDate={
                variant === "archive"
                  ? {
                      label: "Completamento",
                      value: (
                        <LavorazioneCompletamentoDatePill iso={lavorazioneDataCompletamentoIso(row)} />
                      ),
                    }
                  : undefined
              }
            />
            <LavorazioneMobileMetaGrid>
              <LavorazioneMobileMetaItem label="Cliente" value={fields.cliente} />
              <LavorazioneMobileMetaItem label="Cantiere" value={fields.cantiere} />
              {utilizzatore ? (
                <LavorazioneMobileMetaItem label="Utilizzatore" value={utilizzatore} className="col-span-2" />
              ) : null}
            </LavorazioneMobileMetaGrid>
            <LavorazioneMobileNote text={lavorazioneNoteInterventoText(fields)} />
            <LavorazioneMobileControlsPanel
              ariaLabel={variant === "archive" ? "Addetto" : "Stato e addetto"}
            >
              {variant === "active" ? (
                <LavMobileInlineField label="Stato" layout="stack">
                  <StatoReadOnlyPill stato={row.stato} statiOpts={statiOpts} />
                </LavMobileInlineField>
              ) : null}
              <LavMobileInlineField
                label="Addetto"
                layout="stack"
                className={variant === "archive" ? "col-span-2" : undefined}
              >
                <LavorazioneAddettoReadOnlyPill addetto={fields.addetto} addettoColors={addettoColors} />
              </LavMobileInlineField>
            </LavorazioneMobileControlsPanel>
            <div className="mt-2.5">
              <ClientLavorazionePhotoStrip lavorazioneId={row.id} max={3} lazy sizeClass="h-12 w-12" />
            </div>
            <LavorazioneMobileCardFooter
              meta={
                <LavorazioneMobileUltimaModifica
                  info={resolveLavorazioneUltimaModifica(row, schedeStore[row.id], {
                    resolveUserId: buildLavorazioneRowProfileResolver(row),
                  })}
                />
              }
            >
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
  const { containerRef: listLayoutRef, layout: listLayout, layoutClassName: listLayoutClassName } = useGestionaleListLayout({ tier: "xl" });
  const access = useClientLavorazioniAccess();
  const globalOpts = useGlobalOptions({ debugTag: "ClientLavorazioniView" });
  const statiOpts = useMemo(
    () => filterClientPortalStatiOptions(globalOpts.lavorazioni.stati),
    [globalOpts.lavorazioni.stati],
  );
  const statoOrderIds = useMemo(() => statiOpts.map((s) => s.id), [statiOpts]);
  const addettiGlobali = globalOpts.lavorazioni.addetti;
  const colStyles = useLavorazioniListTableColStyles(statiOpts, [], addettiGlobali);
  const addettoColors = globalOpts.lavorazioni.addettoColors;
  const viewOpts = useViewQueryOpts();
  const inCorsoQ = useClientLavorazioniInCorsoQuery(access.allowed);
  const archivioQ = useClientLavorazioniArchivioQuery(access.allowed);
  const schedeLavorazioneIds = useMemo(
    () => [...(inCorsoQ.data ?? []), ...(archivioQ.data ?? [])].map((row) => row.id),
    [inCorsoQ.data, archivioQ.data],
  );
  const { store: schedeStore } = useSchedeBundlesQuery(access.allowed, {
    viewLayer: true,
    lavorazioneIds: schedeLavorazioneIds,
  });
  const logsQ = useLogListQuery(
    { entita: "lavorazioni", limit: 2000 },
    {
      enabled: access.allowed,
      ...viewOpts,
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

  const [filters, setFilters] = useState<ClientPortalListFilters>(CLIENT_PORTAL_FILTERS_EMPTY);
  const [searchInput, setSearchInput] = useState("");
  const [filtersHydrated, setFiltersHydrated] = useState(false);

  useEffect(() => {
    const initial = loadClientPortalFiltersPersisted() ?? CLIENT_PORTAL_FILTERS_EMPTY;
    setFilters(initial);
    setSearchInput(initial.search);
    setFiltersHydrated(true);
  }, []);
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
  const [ingressoRow, setIngressoRow] = useState<LavorazioneListRow | null>(null);
  const [contattaciOpen, setContattaciOpen] = useState(false);

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
    return buildClientPortalFilterCatalog(
      [...allInCorsoBundles, ...allArchivioBundles],
      schedeStore,
      addettiGlobali,
      defaultAddetto,
      logsByLav,
    );
  }, [allInCorsoBundles, allArchivioBundles, schedeStore, addettiGlobali, defaultAddetto, logsByLav]);

  const inCorsoBundles = useMemo(
    () => filterClientPortalBundles(allInCorsoBundles, filters, schedeStore, defaultAddetto, "in_corso", logsByLav),
    [allInCorsoBundles, filters, schedeStore, defaultAddetto, logsByLav],
  );

  const archivioBundles = useMemo(
    () => filterClientPortalBundles(allArchivioBundles, filters, schedeStore, defaultAddetto, "archivio", logsByLav),
    [allArchivioBundles, filters, schedeStore, defaultAddetto, logsByLav],
  );

  useEffect(() => {
    if (!access.allowed) return;
    logClientPortalPipelineDebug({
      inCorsoRaw: inCorsoQ.data?.length ?? 0,
      archivioRaw: archivioQ.data?.length ?? 0,
      bundlesInCorso: allInCorsoBundles.length,
      bundlesArchivio: allArchivioBundles.length,
      filteredInCorso: inCorsoBundles.length,
      filteredArchivio: archivioBundles.length,
      filters,
      filtersActive,
      queryKeyInCorso: lavorazioniDomainQueryKeys.list(
        stableLavorazioniFiltersKey({ archived: false, includeMezzo: true }),
        true,
      ),
    });
  }, [
    access.allowed,
    allArchivioBundles.length,
    allInCorsoBundles.length,
    archivioQ.data,
    filters,
    filtersActive,
    inCorsoBundles.length,
    archivioBundles.length,
    inCorsoQ.data,
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
    setFiltriEspansi(false);
  }, []);

  if (!access.allowed) {
    return (
      <>
        <PageHeader title={PORTALE_CLIENTI_LABEL} />
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

  const listLoading = !filtersHydrated || inCorsoQ.isLoading || archivioQ.isLoading;
  const listError = inCorsoQ.error ?? archivioQ.error;

  const listInitialLoading =
    listLoading && inCorsoQ.data === undefined && archivioQ.data === undefined;

  let bodyContent: ReactNode;
  if (listInitialLoading) {
    bodyContent = (
      <ShellCard title="Lavorazioni in corso">
        <ClientLavorazioniLoadingSkeleton />
      </ShellCard>
    );
  } else if (listError) {
    bodyContent = (
      <ShellCard>
        <LoadingErrorState
          title="Impossibile caricare le lavorazioni"
          description="Controlla la connessione e riprova."
          onRetry={() => {
            void inCorsoQ.refetch();
            void archivioQ.refetch();
          }}
        />
      </ShellCard>
    );
  } else {
    bodyContent = (
      <>
        <CollapsibleAccordionProvider initialOpenId={showInCorso ? "in-corso" : showArchivio ? "archivio" : null}>
        {showInCorso ? (
          <ShellCard
            title={`Lavorazioni in corso (${sortedInCorsoBundles.length})`}
            collapsible
            accordionId="in-corso"
            defaultCollapsed={false}
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
            title={`Lavorazioni completate (${sortedArchivioBundles.length})`}
            collapsible
            accordionId="archivio"
            defaultCollapsed={true}
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
        </CollapsibleAccordionProvider>
      </>
    );
  }

  return (
    <div ref={listLayoutRef} className={`lavorazioni-scroll-scope ${layoutPageRoot} ${listLayoutClassName}`.trim()}>
    <>
      <PageHeader
        title={PORTALE_CLIENTI_LABEL}
        actions={
          <div className={gestionalePageToolbarActionsInnerClass}>
            <span className="hidden sm:inline-flex">
              <ClientContattaciButton variant="toolbar" onClick={() => setContattaciOpen(true)} />
            </span>
            <GestionaleRefreshToolbarButton busy={refreshBusy} onClick={() => void refreshClientData()} />
          </div>
        }
      />

      <div className={dsStackPage}>
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
                  statiOpts={statiOpts}
                  showSectionFilter
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

        {bodyContent}
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
          logs={logsByLav.get(ingressoRow.id) ?? []}
          addettiGlobali={addettiGlobali}
        />
      ) : null}

      {contattaciOpen ? <ClientContattaciDialog open onClose={() => setContattaciOpen(false)} /> : null}
    </>
    </div>
  );
}
