"use client";

import { Tooltip } from "@/components/ui";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  GestionaleListTable,
  GestionaleListTableActionsHead,
  GlobalTableSortTh,
  type GlobalTableSortPhase,
} from "@/components/gestionale/global-table";
import { GestionaleAiActionButton } from "@/components/design-system/gestionale-ai-action-button";
import { useAuthUserId } from "@/context/auth-context";
import { ShellCard } from "@/components/gestionale/shell-card";
import {
  collapsibleExpandedBoolPref,
  useCollapsiblePreference,
} from "@/lib/ui/collapsible-prefs";
import { TablePagination } from "@/components/gestionale/table-pagination";
import { GestionaleListSearchField } from "@/components/gestionale/gestionale-list-search-field";
import { GlobalDatePickerYmd, GlobalFixedListPillSelect } from "@/components/gestionale/global-input";
import { GlobalSettingsListSelect } from "@/components/gestionale/global-input/global-settings-list-select";
import {
  formatOrdineFornitoreDate,
} from "@/components/ordini-fornitori/ordine-fornitore-status-badge";
import { OrdineFornitoreStatusCell } from "@/components/ordini-fornitori/ordine-fornitore-status-cell";
import {
  ORDINE_FORNITORE_FILTER_NEUTRAL_STYLE,
  ORDINE_FORNITORE_STATUS_FILTER_ITEMS,
  ORDINE_FORNITORE_STATUS_PILL_SHELL,
} from "@/lib/ordini-fornitori/ordine-fornitore-status-ui";
import { buildEmptyOrdineFornitore } from "@/lib/ordini-fornitori/build-empty-ordine-fornitore";
import { cloneOrdineFornitoreRecord } from "@/lib/ordini-fornitori/clone-ordine-fornitore";
import {
  ordineFornitoreRowMatchesPageFiltersDerived,
  useOrdiniFornitoriListDerived,
} from "@/lib/ordini-fornitori/use-ordini-fornitori-list-derived";
import {
  ORDINI_FORNITORI_FILTERS_EMPTY,
  ordineFornitoreListDestinazioneTipo,
  ordineFornitoreListOggetto,
  ordiniFornitoriFiltersActive,
  type OrdiniFornitoriPageFilters,
} from "@/lib/ordini-fornitori/ordine-fornitore-list-ui-filters";
import { openOrdineFornitorePdfInNewTab } from "@/lib/ordini-fornitori/ordine-fornitore-pdf";
import type { OrdineFornitoreEditorImportMeta, OrdineFornitoreImportAnalyzeResult } from "@/lib/ordini-fornitori/import/ordine-fornitore-import-types";
import type { OrdineFornitoreRecord, OrdineFornitoreSortKey, OrdineFornitoreStatus } from "@/lib/ordini-fornitori/types";
import { ordiniFornitoriListQueryKey } from "@/lib/render/query-key-factory";
import { clearDedupForQueryKey } from "@/lib/query/query-dedup-registry";
import {
  GESTIONALE_LIST_DESKTOP_ONLY_CLASS,
  GESTIONALE_LIST_MOBILE_ONLY_CLASS,
} from "@/lib/ui/use-gestionale-list-layout";
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import { useResponsiveListPageSize } from "@/lib/ui/use-responsive-list-page-size";
import {
  dsBtnNeutral,
  dsInput,
  dsLabel,
  dsPageToolbarCtaCompact,
  dsTableActionBtnDanger,
  dsTableActionBtnPrimary,
  dsTableActionBtnSecondary,
  dsTableActionGlyph,
  dsTableActionTextBtnDanger,
  dsTableActionTextBtnPrimary,
  GESTIONALE_SEARCH_PLACEHOLDER,
} from "@/lib/ui/design-system";
import {
  gestionaleListTableMobileEmptyClass,
  gestionaleListTableRowClass,
  gestionaleListTableTd,
  gestionaleListTableTdAzioni,
  gestionaleListTableTdPill,
  gestionaleListTableTdPillWrap,
  gestionaleListTableActionsGroup,
} from "@/lib/ui/gestionale-list-table";
import { useOrdiniFornitoriQuery } from "@/src/hooks/gestionale/use-ordini-fornitori-query";
import { READONLY_PERMISSION_HINT } from "@/src/lib/auth/permissions";
import { ordiniFornitoriEntry } from "@/lib/domain/ordini-fornitori-entry";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import {
  CardMobile,
  CardMobileActions,
  IconActionButton,
  LoadingCardSkeleton,
  LoadingTableSkeleton,
  PageToolbar,
  PageToolbarCtaLabel,
  PageToolbarResultCount,
} from "@/components/design-system";

const OrdineFornitoreEditorModal = dynamic(
  () =>
    import("@/components/ordini-fornitori/ordine-fornitore-editor-modal").then(
      (m) => m.OrdineFornitoreEditorModal,
    ),
  { ssr: false },
);

const OrdineFornitoreImportModal = dynamic(
  () =>
    import("@/components/ordini-fornitori/ordine-fornitore-import-modal").then(
      (m) => m.OrdineFornitoreImportModal,
    ),
  { ssr: false },
);

const OrdineFornitoreEliminaConfirmDialog = dynamic(
  () =>
    import("@/components/ordini-fornitori/ordine-fornitore-elimina-confirm-dialog").then(
      (m) => m.OrdineFornitoreEliminaConfirmDialog,
    ),
  { ssr: false },
);

const SEARCH_DEBOUNCE_MS = 320;

function compareCreatedDesc(a: OrdineFornitoreRecord, b: OrdineFornitoreRecord): number {
  return b.createdAt.localeCompare(a.createdAt);
}

function compareOrdini(a: OrdineFornitoreRecord, b: OrdineFornitoreRecord, key: OrdineFornitoreSortKey, asc: boolean): number {
  const dir = asc ? 1 : -1;
  switch (key) {
    case "numero":
      return dir * (a.numero.localeCompare(b.numero, "it") || compareCreatedDesc(a, b));
    case "dataOrdine":
      return dir * (a.dataOrdine.localeCompare(b.dataOrdine) || compareCreatedDesc(a, b));
    case "fornitore":
      return dir * a.fornitoreLabel.localeCompare(b.fornitoreLabel, "it");
    case "oggettoOrdine":
      return dir * (ordineFornitoreListOggetto(a).localeCompare(ordineFornitoreListOggetto(b), "it") || compareCreatedDesc(a, b));
    case "destinazioneTipo":
      return dir * (ordineFornitoreListDestinazioneTipo(a).localeCompare(ordineFornitoreListDestinazioneTipo(b), "it") || compareCreatedDesc(a, b));
    case "totale":
      return dir * (a.totale - b.totale);
    case "status":
      return dir * a.status.localeCompare(b.status);
    default:
      return 0;
  }
}

export function OrdiniFornitoriView({
  canRead,
  canWrite,
}: {
  /** Permessi pagina Preventivi (read = visualizza, write = modifica). */
  canRead: boolean;
  canWrite: boolean;
}) {
  const userId = useAuthUserId();
  const qc = useQueryClient();
  const gestToast = useGestionaleToast();
  const { records, isLoading, isError, refetch } = useOrdiniFornitoriQuery(canRead);
  const { searchHaystackById, searchSuggestionPool } = useOrdiniFornitoriListDerived(records);

  const [searchInput, setSearchInput] = useState("");
  const [searchApplied, setSearchApplied] = useState("");
  useEffect(() => {
    const t = window.setTimeout(() => setSearchApplied(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [searchInput]);
  const [filters, setFilters] = useState<OrdiniFornitoriPageFilters>(ORDINI_FORNITORI_FILTERS_EMPTY);
  const [filtriEspansi, setFiltriEspansi] = useCollapsiblePreference(
    collapsibleExpandedBoolPref(false, { scope: "ordini-fornitori", key: "filters", userId }),
  );
  const [sortColumn, setSortColumn] = useState<OrdineFornitoreSortKey | null>(null);
  const [sortPhase, setSortPhase] = useState<GlobalTableSortPhase>("natural");
  const [editor, setEditor] = useState<{
    open: boolean;
    record: OrdineFornitoreRecord;
    isNew: boolean;
    mode?: "view" | "edit";
    importMeta?: OrdineFornitoreEditorImportMeta;
  } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<OrdineFornitoreRecord | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const pendingStatusRef = useRef(new Set<string>());

  const pageFilters = useMemo(
    (): OrdiniFornitoriPageFilters => ({ ...filters, search: searchApplied }),
    [filters, searchApplied],
  );

  const filteredRows = useMemo(
    () =>
      records.filter((r) =>
        ordineFornitoreRowMatchesPageFiltersDerived(r, pageFilters, searchHaystackById.get(r.id) ?? ""),
      ),
    [records, pageFilters, searchHaystackById],
  );

  const sortedRows = useMemo(() => {
    const copy = [...filteredRows];
    if (sortColumn === null || sortPhase === "natural") {
      copy.sort(compareCreatedDesc);
      return copy;
    }
    copy.sort((a, b) => compareOrdini(a, b, sortColumn, sortPhase === "asc"));
    return copy;
  }, [filteredRows, sortColumn, sortPhase]);

  const pageSize = useResponsiveListPageSize();
  const ordiniPagerDeps = useMemo(
    () =>
      `${pageFilters.fornitore}|${pageFilters.status}|${pageFilters.dateFrom}|${pageFilters.dateTo}|${searchApplied}`,
    [pageFilters.fornitore, pageFilters.status, pageFilters.dateFrom, pageFilters.dateTo, searchApplied],
  );
  const { page, setPage, pageCount, sliceItems, showPager, label, resetPage } = useClientPagination(
    sortedRows.length,
    pageSize,
  );
  const pageRows = sliceItems(sortedRows);

  useEffect(() => {
    resetPage();
  }, [ordiniPagerDeps, pageSize, resetPage]);

  const hasOrdiniListFilters =
    ordiniFornitoriFiltersActive(filters) || searchInput.trim().length > 0;
  const tableEmptyMessage = hasOrdiniListFilters
    ? "Nessun ordine corrisponde alla ricerca o ai filtri selezionati."
    : "Nessun ordine in archivio.";

  function onSortMain(k: OrdineFornitoreSortKey) {
    if (sortColumn !== k) {
      setSortColumn(k);
      setSortPhase("asc");
      return;
    }
    if (sortPhase === "asc") {
      setSortPhase("desc");
    } else if (sortPhase === "desc") {
      setSortColumn(null);
      setSortPhase("natural");
    } else {
      setSortColumn(k);
      setSortPhase("asc");
    }
  }

  const reload = useCallback(async () => {
    clearDedupForQueryKey(ordiniFornitoriListQueryKey());
    await qc.invalidateQueries({ queryKey: ordiniFornitoriListQueryKey() });
  }, [qc]);

  const upsertOrdineInListCache = useCallback(
    (record: OrdineFornitoreRecord) => {
      qc.setQueryData<OrdineFornitoreRecord[]>(ordiniFornitoriListQueryKey(), (old) => {
        const list = old ?? [];
        const idx = list.findIndex((r) => r.id === record.id);
        if (idx >= 0) {
          const next = [...list];
          next[idx] = record;
          return next;
        }
        return [record, ...list];
      });
    },
    [qc],
  );

  const handleSaved = useCallback(
    async (info?: { record?: OrdineFornitoreRecord }) => {
      resetPage();
      setSearchInput("");
      setFilters(ORDINI_FORNITORI_FILTERS_EMPTY);
      if (info?.record) {
        upsertOrdineInListCache(info.record);
        setEditor(null);
        return;
      }
      setEditor(null);
      await reload();
    },
    [reload, resetPage, upsertOrdineInListCache],
  );

  const openView = useCallback(
    async (record: OrdineFornitoreRecord) => {
      const res = await ordiniFornitoriEntry.getDetail(record.id);
      if (!res.success || !res.data) {
        gestToast.errorOnce("ordine-view", res.error ?? "Ordine non trovato.");
        return;
      }
      setEditor({ open: true, record: res.data, isNew: false, mode: "view" });
    },
    [gestToast],
  );

  const openDuplicate = useCallback(
    (record: OrdineFornitoreRecord) => {
      if (!canWrite) return;
      const clone = cloneOrdineFornitoreRecord(record, records);
      setEditor({ open: true, record: clone, isNew: true, mode: "edit" });
    },
    [canWrite, records],
  );

  async function handleAnnulla(record: OrdineFornitoreRecord) {
    if (!canWrite) return;
    const res = await ordiniFornitoriEntry.annulla(record.id);
    if (!res.success) {
      gestToast.errorOnce("ordine-annulla", res.error ?? "Errore annullamento.");
      return;
    }
    gestToast.successOnce("ordine-annulla", "Ordine annullato.");
    void reload();
  }

  function openDeleteConfirm(record: OrdineFornitoreRecord) {
    if (!canWrite) return;
    setDeleteTarget(record);
  }

  async function executeDelete() {
    if (!deleteTarget || !canWrite) return;
    setDeletePending(true);
    try {
      const res = await ordiniFornitoriEntry.deleteOrdine(deleteTarget.id);
      if (!res.success) {
        gestToast.errorOnce("ordine-delete", res.error ?? "Errore eliminazione.");
        return;
      }
      if (editor?.record.id === deleteTarget.id) setEditor(null);
      gestToast.successOnce("ordine-delete", "Ordine eliminato.");
      setDeleteTarget(null);
      void reload();
    } finally {
      setDeletePending(false);
    }
  }

  const onStatusRow = useCallback(
    (record: OrdineFornitoreRecord, next: OrdineFornitoreStatus) => {
      if (!canWrite || record.status === "annullato" || next === record.status) return;
      if (pendingStatusRef.current.has(record.id)) return;
      pendingStatusRef.current.add(record.id);

      const previous = record.status;
      qc.setQueryData<OrdineFornitoreRecord[]>(ordiniFornitoriListQueryKey(), (old) =>
        old?.map((r) => (r.id === record.id ? { ...r, status: next } : r)) ?? [],
      );

      void (async () => {
        const res = await ordiniFornitoriEntry.updateStatus(record.id, next, record.updatedAt);
        pendingStatusRef.current.delete(record.id);
        if (!res.success) {
          qc.setQueryData<OrdineFornitoreRecord[]>(ordiniFornitoriListQueryKey(), (old) =>
            old?.map((r) => (r.id === record.id ? { ...r, status: previous } : r)) ?? [],
          );
          gestToast.errorOnce(`ordine-stato-${record.id}`, res.error ?? "Errore aggiornamento stato.", {
            module: "ordini_fornitori",
            action: "update",
          });
          void refetch();
          return;
        }
        gestToast.successOnce(`ordine-stato-${record.id}`, "Stato ordine aggiornato.");
        void reload();
      })();
    },
    [canWrite, gestToast, qc, refetch, reload],
  );

  return (
    <>
      <ShellCard>
        <section aria-label="Azioni e filtri ordini fornitori">
          <PageToolbar
            primaryAction={
              <div className="flex flex-wrap gap-2">
                <Tooltip content={canWrite ? "Nuovo ordine fornitore" : READONLY_PERMISSION_HINT}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!canWrite) return;
                      setEditor({ open: true, record: buildEmptyOrdineFornitore(records), isNew: true });
                    }}
                    className={dsPageToolbarCtaCompact}
                    disabled={!canWrite}
                  >
                    <PageToolbarCtaLabel short="+ Nuovo" full="+ Nuovo ordine" />
                  </button>
                </Tooltip>
                <GestionaleAiActionButton
                  type="button"
                  variant="primary"
                  size="sm"
                  className="h-11 shrink-0"
                  disabled={!canWrite}
                  title={canWrite ? "Importa ordine da preventivo fornitore" : READONLY_PERMISSION_HINT}
                  onClick={() => {
                    if (!canWrite) return;
                    setImportOpen(true);
                  }}
                >
                  <span className="hidden sm:inline">Importa da preventivo</span>
                  <span className="sm:hidden">Importa</span>
                </GestionaleAiActionButton>
              </div>
            }
            search={
              <GestionaleListSearchField
                id="ordini-fornitori-search"
                wrapperClassName="min-w-0 flex-1"
                placeholder={GESTIONALE_SEARCH_PLACEHOLDER}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                suggestionPool={searchSuggestionPool}
                aria-label="Cerca ordini fornitori"
              />
            }
            filtersExpanded={filtriEspansi}
            onFiltersToggle={() => setFiltriEspansi((o) => !o)}
            filtersActive={ordiniFornitoriFiltersActive(filters)}
            filtersPanel={
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className={dsLabel} htmlFor="ordini-filter-fornitore">
                    Fornitore
                  </label>
                  <GlobalSettingsListSelect
                    id="ordini-filter-fornitore"
                    listKey="magazzino:fornitoriOrdine"
                    value={filters.fornitore}
                    onChange={(v) => setFilters((f) => ({ ...f, fornitore: v }))}
                    placeholder="Tutti"
                    emptyOptionLabel="Tutti"
                  />
                </div>
                <div>
                  <span className={dsLabel}>Stato</span>
                  <GlobalFixedListPillSelect
                    value={filters.status}
                    onChange={(v) =>
                      setFilters((f) => ({
                        ...f,
                        status: v as OrdiniFornitoriPageFilters["status"],
                      }))
                    }
                    options={ORDINE_FORNITORE_STATUS_FILTER_ITEMS}
                    ariaLabel="Filtra per stato"
                    shellClass={ORDINE_FORNITORE_STATUS_PILL_SHELL}
                    fallbackPillStyle={ORDINE_FORNITORE_FILTER_NEUTRAL_STYLE}
                  />
                </div>
                <div>
                  <label className={dsLabel} htmlFor="ordini-filter-from">
                    Da data
                  </label>
                  <GlobalDatePickerYmd
                    id="ordini-filter-from"
                    valueYmd={filters.dateFrom}
                    onChangeYmd={(ymd) => setFilters((f) => ({ ...f, dateFrom: ymd }))}
                    aria-label="Da data"
                  />
                </div>
                <div>
                  <label className={dsLabel} htmlFor="ordini-filter-to">
                    A data
                  </label>
                  <GlobalDatePickerYmd
                    id="ordini-filter-to"
                    valueYmd={filters.dateTo}
                    onChangeYmd={(ymd) => setFilters((f) => ({ ...f, dateTo: ymd }))}
                    aria-label="A data"
                  />
                </div>
              </div>
            }
            onFilterReset={() => setFilters(ORDINI_FORNITORI_FILTERS_EMPTY)}
            meta={
              <PageToolbarResultCount
                count={sortedRows.length}
                filtersActive={ordiniFornitoriFiltersActive(filters)}
                searchActive={searchInput.trim().length > 0}
                onSearchReset={() => setSearchInput("")}
                onFilterReset={() => setFilters(ORDINI_FORNITORI_FILTERS_EMPTY)}
              />
            }
          />
        </section>

        {isError ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            <p>Impossibile caricare l&apos;elenco ordini.</p>
            <button type="button" className={`${dsBtnNeutral} mt-2`} onClick={() => void reload()}>
              Riprova
            </button>
          </div>
        ) : isLoading ? (
          <>
            <LoadingTableSkeleton
              preset="generic"
              wrapClassName={`mt-4 ${GESTIONALE_LIST_DESKTOP_ONLY_CLASS}`}
              actionButtonCount={5}
            />
            <div className={`mt-4 space-y-3 ${GESTIONALE_LIST_MOBILE_ONLY_CLASS}`}>
              {Array.from({ length: 3 }).map((_, i) => (
                <LoadingCardSkeleton key={i} minHeightClass="min-h-[120px]" rows={3} />
              ))}
            </div>
          </>
        ) : (
          <>
            <GestionaleListTable
              masterScrollScope={false}
              wrapClassName={`mt-4 ${GESTIONALE_LIST_DESKTOP_ONLY_CLASS}`}
              headRow={
                <>
                  <GlobalTableSortTh label="Numero" columnKey="numero" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSortMain} />
                  <GlobalTableSortTh label="Data" columnKey="dataOrdine" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSortMain} />
                  <GlobalTableSortTh label="Fornitore" columnKey="fornitore" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSortMain} />
                  <GlobalTableSortTh label="Oggetto" columnKey="oggettoOrdine" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSortMain} />
                  <GlobalTableSortTh label="Destinazione" columnKey="destinazioneTipo" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSortMain} />
                  <GlobalTableSortTh label="Totale" columnKey="totale" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSortMain} align="right" />
                  <GlobalTableSortTh label="Stato" columnKey="status" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSortMain} />
                  <GestionaleListTableActionsHead />
                </>
              }
              empty={pageRows.length === 0}
              emptyMessage={tableEmptyMessage}
              colSpan={8}
            >
              {pageRows.map((o) => (
                  <tr key={o.id} className={gestionaleListTableRowClass}>
                    <td className={`whitespace-nowrap ${gestionaleListTableTd} font-mono text-xs font-semibold tabular-nums`}>
                      {o.numero || "—"}
                    </td>
                    <td className={`whitespace-nowrap ${gestionaleListTableTd} text-xs tabular-nums`}>
                      {formatOrdineFornitoreDate(o.dataOrdine)}
                    </td>
                    <td className={`min-w-0 ${gestionaleListTableTd}`}>{o.fornitoreLabel || "—"}</td>
                    <td className={`min-w-0 max-w-[1px] ${gestionaleListTableTd} truncate`}>
                      {ordineFornitoreListOggetto(o) || "—"}
                    </td>
                    <td className={`min-w-0 ${gestionaleListTableTd}`}>
                      {ordineFornitoreListDestinazioneTipo(o)}
                    </td>
                    <td className={`whitespace-nowrap ${gestionaleListTableTd} text-sm font-medium tabular-nums`}>
                      {o.totale.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </td>
                    <td className={gestionaleListTableTdPill}>
                      <div className={gestionaleListTableTdPillWrap}>
                        <OrdineFornitoreStatusCell
                          record={o}
                          canWrite={canWrite}
                          onStatusChange={onStatusRow}
                        />
                      </div>
                    </td>
                    <td className={gestionaleListTableTdAzioni}>
                      <div className={gestionaleListTableActionsGroup}>
                        <IconActionButton
                          label="Visualizza"
                          className={dsTableActionBtnPrimary}
                          onClick={() => void openView(o)}
                        >
                          <svg className={dsTableActionGlyph} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </IconActionButton>
                        <IconActionButton
                          label="Duplica"
                          tooltipContent={canWrite ? "Duplica" : READONLY_PERMISSION_HINT}
                          className={dsTableActionBtnSecondary}
                          disabled={!canWrite}
                          onClick={() => openDuplicate(o)}
                        >
                          <svg className={dsTableActionGlyph} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </IconActionButton>
                        <IconActionButton
                          label="PDF"
                          className={dsTableActionBtnSecondary}
                          onClick={() => void openOrdineFornitorePdfInNewTab(o)}
                        >
                          <svg className={dsTableActionGlyph} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </IconActionButton>
                        <IconActionButton
                          label="Elimina"
                          tooltipContent={canWrite ? "Elimina" : READONLY_PERMISSION_HINT}
                          className={dsTableActionBtnDanger}
                          disabled={!canWrite}
                          onClick={() => openDeleteConfirm(o)}
                        >
                          <svg className={dsTableActionGlyph} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </IconActionButton>
                        {o.status !== "annullato" && o.status !== "bozza" ? (
                          <Tooltip content={canWrite ? "Annulla ordine" : READONLY_PERMISSION_HINT}><button type="button" className={dsBtnNeutral} disabled={!canWrite} onClick={() => void handleAnnulla(o)}>
                            Annulla
                          </button></Tooltip>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
            </GestionaleListTable>

            <div className={`mt-4 space-y-3 ${GESTIONALE_LIST_MOBILE_ONLY_CLASS}`}>
              {pageRows.length === 0 ? (
                <p className={gestionaleListTableMobileEmptyClass}>{tableEmptyMessage}</p>
              ) : (
                pageRows.map((o) => (
                <CardMobile key={o.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs font-semibold tabular-nums">{o.numero || "—"}</p>
                      <p className="mt-1 text-sm font-semibold">{o.fornitoreLabel || "—"}</p>
                      {ordineFornitoreListOggetto(o) ? (
                        <p className="mt-1 text-xs text-[color:var(--cab-text-muted)] truncate">
                          {ordineFornitoreListOggetto(o)}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-[color:var(--cab-text-muted)]">
                        {formatOrdineFornitoreDate(o.dataOrdine)} · {ordineFornitoreListDestinazioneTipo(o)}
                      </p>
                      <div className="mt-2 max-w-[12rem]">
                        <OrdineFornitoreStatusCell
                          record={o}
                          canWrite={canWrite}
                          onStatusChange={onStatusRow}
                        />
                      </div>
                    </div>
                    <p className="shrink-0 text-right text-base font-semibold tabular-nums">
                      {o.totale.toLocaleString("it-IT", { minimumFractionDigits: 2 })} €
                    </p>
                  </div>
                  <CardMobileActions>
                    <button type="button" className={dsTableActionTextBtnPrimary} onClick={() => void openView(o)}>
                      Visualizza
                    </button>
                    <Tooltip content={canWrite ? "Duplica ordine" : READONLY_PERMISSION_HINT}><button type="button" className={dsBtnNeutral} disabled={!canWrite} onClick={() => openDuplicate(o)}>
                      Duplica
                    </button></Tooltip>
                    <Tooltip content={canWrite ? "Elimina ordine" : READONLY_PERMISSION_HINT}><button type="button" className={dsTableActionTextBtnDanger} disabled={!canWrite} onClick={() => openDeleteConfirm(o)}>
                      Elimina
                    </button></Tooltip>
                  </CardMobileActions>
                </CardMobile>
              ))
            )}
            </div>
          </>
        )}

        {showPager ? (
          <TablePagination page={page} pageCount={pageCount} onPageChange={setPage} label={label} className="mt-4" />
        ) : null}
      </ShellCard>

      {importOpen ? (
        <OrdineFornitoreImportModal
          open={importOpen}
          onClose={() => setImportOpen(false)}
          onComplete={(result: OrdineFornitoreImportAnalyzeResult) => {
            setImportOpen(false);
            setEditor({
              open: true,
              record: result.record,
              isNew: true,
              importMeta: {
                source: result.source,
                contentHash: result.contentHash,
                semanticKey: result.semanticKey,
                quality: result.quality,
                saved: false,
              },
            });
          }}
        />
      ) : null}

      {editor?.open ? (
        <OrdineFornitoreEditorModal
          record={editor.record}
          isNew={editor.isNew}
          mode={editor.mode ?? "edit"}
          canWrite={canWrite}
          importMeta={editor.importMeta}
          onClose={() => setEditor(null)}
          onSaved={handleSaved}
          onSwitchToEdit={() => {
            if (!canWrite) return;
            setEditor((prev) => (prev ? { ...prev, mode: "edit" } : prev));
          }}
          onDelete={() => {
            if (!canWrite) return;
            openDeleteConfirm(editor.record);
          }}
        />
      ) : null}

      <OrdineFornitoreEliminaConfirmDialog
        open={deleteTarget != null}
        record={deleteTarget}
        pending={deletePending}
        onCancel={() => {
          if (!deletePending) setDeleteTarget(null);
        }}
        onConfirm={() => void executeDelete()}
      />
    </>
  );
}
