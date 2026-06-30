"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  GestionaleListTable,
  GestionaleListTableActionsHead,
  GlobalTableSortTh,
  type GlobalTableSortPhase,
} from "@/components/gestionale/global-table";
import { ShellCard } from "@/components/gestionale/shell-card";
import { TablePagination } from "@/components/gestionale/table-pagination";
import { GestionaleListSearchField } from "@/components/gestionale/gestionale-list-search-field";
import { GlobalSettingsListSelect } from "@/components/gestionale/global-input/global-settings-list-select";
import {
  formatOrdineFornitoreDate,
  OrdineFornitoreStatusBadge,
} from "@/components/ordini-fornitori/ordine-fornitore-status-badge";
import { buildEmptyOrdineFornitore } from "@/lib/ordini-fornitori/build-empty-ordine-fornitore";
import {
  buildOrdiniFornitoriSearchSuggestions,
  ORDINI_FORNITORI_FILTERS_EMPTY,
  ordineFornitoreRowMatchesPageFilters,
  ordiniFornitoriFiltersActive,
  type OrdiniFornitoriPageFilters,
} from "@/lib/ordini-fornitori/ordine-fornitore-list-ui-filters";
import { openOrdineFornitorePdfInNewTab } from "@/lib/ordini-fornitori/ordine-fornitore-pdf";
import type { OrdineFornitoreRecord, OrdineFornitoreSortKey } from "@/lib/ordini-fornitori/types";
import { ordiniFornitoriListQueryKey } from "@/lib/render/query-key-factory";
import {
  GESTIONALE_LIST_DESKTOP_ONLY_CLASS,
  GESTIONALE_LIST_MOBILE_ONLY_CLASS,
  useGestionaleListLayout,
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
  GESTIONALE_SEARCH_PLACEHOLDER,
} from "@/lib/ui/design-system";
import {
  gestionaleListTableMobileEmptyClass,
  gestionaleListTableRowClass,
  gestionaleListTableTd,
  gestionaleListTableTdAzioni,
  gestionaleListTableActionsGroup,
} from "@/lib/ui/gestionale-list-table";
import { usePermissions } from "@/src/hooks/use-permissions";
import { useOrdiniFornitoriQuery } from "@/src/hooks/gestionale/use-ordini-fornitori-query";
import { READONLY_PERMISSION_HINT } from "@/src/lib/auth/permissions";
import { ordiniFornitoriService } from "@/src/services/ordini-fornitori.service";
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

const SEARCH_DEBOUNCE_MS = 320;

function compareOrdini(a: OrdineFornitoreRecord, b: OrdineFornitoreRecord, key: OrdineFornitoreSortKey, asc: boolean): number {
  const dir = asc ? 1 : -1;
  switch (key) {
    case "numero":
      return dir * a.numero.localeCompare(b.numero, "it");
    case "dataOrdine":
      return dir * a.dataOrdine.localeCompare(b.dataOrdine);
    case "fornitore":
      return dir * a.fornitoreLabel.localeCompare(b.fornitoreLabel, "it");
    case "destinazione":
      return dir * a.destinazione.localeCompare(b.destinazione, "it");
    case "totale":
      return dir * (a.totale - b.totale);
    case "status":
      return dir * a.status.localeCompare(b.status);
    default:
      return 0;
  }
}

export function OrdiniFornitoriView() {
  const qc = useQueryClient();
  const gestToast = useGestionaleToast();
  const perm = usePermissions("ordini_fornitori");
  const canWrite = perm.canWrite;
  const { records, isLoading, refetch } = useOrdiniFornitoriQuery(perm.canRead);

  const [searchInput, setSearchInput] = useState("");
  const [searchApplied, setSearchApplied] = useState("");
  useEffect(() => {
    const t = window.setTimeout(() => setSearchApplied(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [searchInput]);
  const [filters, setFilters] = useState<OrdiniFornitoriPageFilters>(ORDINI_FORNITORI_FILTERS_EMPTY);
  const [filtriEspansi, setFiltriEspansi] = useState(false);
  const [sortColumn, setSortColumn] = useState<OrdineFornitoreSortKey | null>("dataOrdine");
  const [sortPhase, setSortPhase] = useState<GlobalTableSortPhase>("desc");
  const [editor, setEditor] = useState<{ open: boolean; record: OrdineFornitoreRecord; isNew: boolean } | null>(
    null,
  );

  const pageFilters = useMemo(
    (): OrdiniFornitoriPageFilters => ({ ...filters, search: searchApplied }),
    [filters, searchApplied],
  );

  const filteredRows = useMemo(
    () => records.filter((r) => ordineFornitoreRowMatchesPageFilters(r, pageFilters)),
    [records, pageFilters],
  );

  const sortedRows = useMemo(() => {
    const copy = [...filteredRows];
    if (sortColumn === null || sortPhase === "natural") {
      copy.sort((a, b) => b.dataOrdine.localeCompare(a.dataOrdine));
      return copy;
    }
    copy.sort((a, b) => compareOrdini(a, b, sortColumn, sortPhase === "asc"));
    return copy;
  }, [filteredRows, sortColumn, sortPhase]);

  const pageSize = useResponsiveListPageSize();
  const { page, setPage, pageCount, sliceItems, showPager, label } = useClientPagination(sortedRows.length, pageSize);
  const pageRows = sliceItems(sortedRows);

  const { layout: listLayout } = useGestionaleListLayout();
  const searchSuggestionPool = useMemo(() => buildOrdiniFornitoriSearchSuggestions(records), [records]);

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

  const reload = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ordiniFornitoriListQueryKey() });
    void refetch();
  }, [qc, refetch]);

  async function handleAnnulla(record: OrdineFornitoreRecord) {
    if (!canWrite) return;
    const res = await ordiniFornitoriService.annulla(record.id);
    if (!res.success) {
      gestToast.errorOnce("ordine-annulla", res.error ?? "Errore annullamento.");
      return;
    }
    gestToast.successOnce("ordine-annulla", "Ordine annullato.");
    reload();
  }

  async function handleDelete(record: OrdineFornitoreRecord) {
    if (!canWrite || record.status !== "bozza") return;
    const res = await ordiniFornitoriService.deleteBozza(record.id);
    if (!res.success) {
      gestToast.errorOnce("ordine-delete", res.error ?? "Errore eliminazione.");
      return;
    }
    gestToast.successOnce("ordine-delete", "Bozza eliminata.");
    reload();
  }

  return (
    <>
      <ShellCard>
        <section aria-label="Azioni e filtri ordini fornitori">
          <PageToolbar
            primaryAction={
              <button
                type="button"
                onClick={() =>
                  canWrite &&
                  setEditor({ open: true, record: buildEmptyOrdineFornitore(records), isNew: true })
                }
                className={dsPageToolbarCtaCompact}
                disabled={!canWrite}
                title={canWrite ? "Nuovo ordine fornitore" : READONLY_PERMISSION_HINT}
              >
                <PageToolbarCtaLabel short="+ Nuovo" full="+ Nuovo ordine" />
              </button>
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
                    listKey="magazzino:fornitori"
                    value={filters.fornitore}
                    onChange={(v) => setFilters((f) => ({ ...f, fornitore: v }))}
                    placeholder="Tutti"
                    emptyOptionLabel="Tutti"
                  />
                </div>
                <div>
                  <label className={dsLabel} htmlFor="ordini-filter-status">
                    Stato
                  </label>
                  <select
                    id="ordini-filter-status"
                    className={dsInput}
                    value={filters.status}
                    onChange={(e) =>
                      setFilters((f) => ({
                        ...f,
                        status: e.target.value as OrdiniFornitoriPageFilters["status"],
                      }))
                    }
                  >
                    <option value="">Tutti</option>
                    <option value="bozza">Bozza</option>
                    <option value="inviato">Inviato</option>
                    <option value="confermato">Confermato</option>
                    <option value="annullato">Annullato</option>
                  </select>
                </div>
                <div>
                  <label className={dsLabel} htmlFor="ordini-filter-from">
                    Da data
                  </label>
                  <input
                    id="ordini-filter-from"
                    type="date"
                    className={dsInput}
                    value={filters.dateFrom}
                    onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={dsLabel} htmlFor="ordini-filter-to">
                    A data
                  </label>
                  <input
                    id="ordini-filter-to"
                    type="date"
                    className={dsInput}
                    value={filters.dateTo}
                    onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
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

        {isLoading ? (
          listLayout === "desktop" ? (
            <LoadingTableSkeleton preset="generic" wrapClassName="mt-4" visibilityClass={GESTIONALE_LIST_DESKTOP_ONLY_CLASS} actionButtonCount={3} />
          ) : (
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <LoadingCardSkeleton key={i} minHeightClass="min-h-[120px]" rows={3} />
              ))}
            </div>
          )
        ) : listLayout === "desktop" ? (
          <GestionaleListTable masterScrollScope={false} wrapClassName={`mt-4 ${GESTIONALE_LIST_DESKTOP_ONLY_CLASS}`}
            headRow={
              <>
                <GlobalTableSortTh label="Numero" columnKey="numero" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSortMain} />
                <GlobalTableSortTh label="Data" columnKey="dataOrdine" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSortMain} />
                <GlobalTableSortTh label="Fornitore" columnKey="fornitore" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSortMain} />
                <GlobalTableSortTh label="Destinazione" columnKey="destinazione" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSortMain} />
                <GlobalTableSortTh label="Totale" columnKey="totale" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSortMain} align="right" />
                <GlobalTableSortTh label="Stato" columnKey="status" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSortMain} />
                <GestionaleListTableActionsHead />
              </>
            }
          >
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className={gestionaleListTableMobileEmptyClass}>
                    Nessun ordine trovato.
                  </td>
                </tr>
              ) : (
                pageRows.map((o) => (
                  <tr key={o.id} className={gestionaleListTableRowClass}>
                    <td className={`whitespace-nowrap ${gestionaleListTableTd} font-mono text-xs font-semibold tabular-nums`}>
                      {o.numero || "—"}
                    </td>
                    <td className={`whitespace-nowrap ${gestionaleListTableTd} text-xs tabular-nums`}>
                      {formatOrdineFornitoreDate(o.dataOrdine)}
                    </td>
                    <td className={`min-w-0 ${gestionaleListTableTd}`}>{o.fornitoreLabel || "—"}</td>
                    <td className={`min-w-0 max-w-[1px] ${gestionaleListTableTd} truncate`}>{o.destinazione || "—"}</td>
                    <td className={`whitespace-nowrap ${gestionaleListTableTd} text-sm font-medium tabular-nums`}>
                      {o.totale.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </td>
                    <td className={gestionaleListTableTd}>
                      <OrdineFornitoreStatusBadge status={o.status} />
                    </td>
                    <td className={gestionaleListTableTdAzioni}>
                      <div className={gestionaleListTableActionsGroup}>
                        <IconActionButton
                          label="Modifica"
                          className={dsTableActionBtnPrimary}
                          disabled={!canWrite && o.status === "bozza"}
                          onClick={() => setEditor({ open: true, record: o, isNew: false })}
                        >
                          <svg className={dsTableActionGlyph} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
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
                        {canWrite && o.status === "bozza" ? (
                          <IconActionButton
                            label="Elimina bozza"
                            className={dsTableActionBtnDanger}
                            onClick={() => void handleDelete(o)}
                          >
                            <svg className={dsTableActionGlyph} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </IconActionButton>
                        ) : null}
                        {canWrite && o.status !== "annullato" && o.status !== "bozza" ? (
                          <button type="button" className={dsBtnNeutral} onClick={() => void handleAnnulla(o)}>
                            Annulla
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
          </GestionaleListTable>
        ) : (
          <div className={`mt-4 space-y-3 ${GESTIONALE_LIST_MOBILE_ONLY_CLASS}`}>
            {pageRows.length === 0 ? (
              <p className={gestionaleListTableMobileEmptyClass}>Nessun ordine trovato.</p>
            ) : (
              pageRows.map((o) => (
                <CardMobile key={o.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs font-semibold tabular-nums">{o.numero || "—"}</p>
                      <p className="mt-1 text-sm font-semibold">{o.fornitoreLabel || "—"}</p>
                      <p className="mt-1 text-xs text-[color:var(--cab-text-muted)]">
                        {formatOrdineFornitoreDate(o.dataOrdine)}
                      </p>
                      <div className="mt-2">
                        <OrdineFornitoreStatusBadge status={o.status} />
                      </div>
                    </div>
                    <p className="shrink-0 text-right text-base font-semibold tabular-nums">
                      {o.totale.toLocaleString("it-IT", { minimumFractionDigits: 2 })} €
                    </p>
                  </div>
                  <CardMobileActions>
                    <button type="button" className={dsBtnNeutral} onClick={() => setEditor({ open: true, record: o, isNew: false })}>
                      Apri
                    </button>
                  </CardMobileActions>
                </CardMobile>
              ))
            )}
          </div>
        )}

        {showPager ? (
          <TablePagination page={page} pageCount={pageCount} onPageChange={setPage} label={label} className="mt-4" />
        ) : null}
      </ShellCard>

      {editor?.open ? (
        <OrdineFornitoreEditorModal
          record={editor.record}
          isNew={editor.isNew}
          canWrite={canWrite}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            reload();
          }}
        />
      ) : null}
    </>
  );
}
