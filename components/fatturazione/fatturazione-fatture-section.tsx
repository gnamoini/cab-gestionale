"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  GestionaleListTable,
  GestionaleListTableActionsHead,
  GlobalTableSortTh,
  cycleGlobalTableSort,
  type GlobalTableSortPhase,
} from "@/components/gestionale/global-table";
import { useAuthUserId } from "@/context/auth-context";
import { ShellCard } from "@/components/gestionale/shell-card";
import {
  collapsibleExpandedBoolPref,
  useCollapsiblePreference,
} from "@/lib/ui/collapsible-prefs";
import { TablePagination } from "@/components/gestionale/table-pagination";
import { GestionaleListSearchField } from "@/components/gestionale/gestionale-list-search-field";
import {
  FatturaStatusBadge,
  formatInvoiceDate,
  formatInvoiceMoney,
} from "@/components/fatturazione/fattura-status-badge";
import { downloadInvoicesCsv } from "@/lib/fatturazione/fatturazione-csv-export";
import { appendBillingEvent } from "@/lib/fatturazione/invoice-events";
import {
  FATTURAZIONE_PAGE_FILTERS_EMPTY,
  fatturazionePageFiltersActive,
  invoiceDisplayNumber,
  type FatturazioneSortKey,
} from "@/lib/fatturazione/fatturazione-list-ui-filters";
import { useFatturazioneListDerived } from "@/lib/fatturazione/use-fatturazione-list-derived";
import type { InvoiceLinkRow, InvoiceRow } from "@/src/types/supabase-tables";
import { FatturazioneTabSection } from "@/components/fatturazione/fatturazione-page-structure";
import {
  CardMobile,
  CardMobileActions,
  PageToolbar,
  PageToolbarCtaLabel,
  PageToolbarResultCount,
} from "@/components/design-system";
import type { ListSurface } from "@/lib/ui/resolve-list-surface";
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import { useResponsiveListPageSize } from "@/lib/ui/use-responsive-list-page-size";
import {
  dsPageToolbarBtn,
  dsPageToolbarCtaCompact,
  dsTableActionBtnPrimary,
  dsTableActionBtnSecondary,
  dsTableActionsGroup,
  GESTIONALE_SEARCH_PLACEHOLDER,
} from "@/lib/ui/design-system";
import {
  gestionaleListTableMobileEmptyClass,
  gestionaleListTableRowClass,
  gestionaleListTableTd,
  gestionaleListTableTdAzioni,
  gestionaleListTableTdPill,
} from "@/lib/ui/gestionale-list-table";

const FatturazioneAdvancedFilterPanel = dynamic(
  () =>
    import("@/components/fatturazione/fatturazione-advanced-filter-panel").then((m) => m.FatturazioneAdvancedFilterPanel),
  { ssr: false },
);

export type FatturazioneFattureSectionProps = {
  listSurface: ListSurface;
  invoices: InvoiceRow[];
  links: InvoiceLinkRow[];
  isLoading: boolean;
  canWrite: boolean;
  onOpenDetail: (id: string) => void;
  onNewManuale: () => void;
  onNewPreventivo: () => void;
  externalFilters?: Partial<typeof FATTURAZIONE_PAGE_FILTERS_EMPTY>;
};

export function FatturazioneFattureSection({
  listSurface,
  invoices,
  links,
  isLoading,
  canWrite,
  onOpenDetail,
  onNewManuale,
  onNewPreventivo,
  externalFilters,
}: FatturazioneFattureSectionProps) {
  const userId = useAuthUserId();
  const pageSize = useResponsiveListPageSize();
  const [filters, setFilters] = useState(FATTURAZIONE_PAGE_FILTERS_EMPTY);
  const [filtriEspansi, setFiltriEspansi] = useCollapsiblePreference(
    collapsibleExpandedBoolPref(false, { scope: "fatturazione", key: "filters", userId }),
  );
  const [sortCol, setSortCol] = useState<FatturazioneSortKey | null>("data");
  const [sortPhase, setSortPhase] = useState<GlobalTableSortPhase>("desc");
  const [overflowOpen, setOverflowOpen] = useState(false);

  useEffect(() => {
    if (!externalFilters) return;
    setFilters((f) => ({ ...f, ...externalFilters }));
  }, [externalFilters]);

  const { filtered } = useFatturazioneListDerived(invoices, links, filters, sortCol, sortPhase);

  const pagerDeps = useMemo(
    () => `${filters.search}|${JSON.stringify(filters)}|${sortCol ?? ""}|${sortPhase}`,
    [filters, sortCol, sortPhase],
  );
  const { page, setPage, pageCount, sliceItems, showPager, label, resetPage } = useClientPagination(
    filtered.length,
    pageSize,
  );
  useEffect(() => {
    resetPage();
  }, [pagerDeps, pageSize, resetPage]);
  const pagedRows = useMemo(() => sliceItems(filtered), [filtered, sliceItems]);

  const renderFatturaRow = useCallback(
    (index: number) => {
      const row = pagedRows[index];
      if (!row) return null;
      return (
        <tr key={row.id} className={gestionaleListTableRowClass}>
          <td className={gestionaleListTableTd}>{invoiceDisplayNumber(row)}</td>
          <td className={gestionaleListTableTd}>{formatInvoiceDate(row.data_emissione)}</td>
          <td className={gestionaleListTableTd}>{row.cliente_label}</td>
          <td className={`${gestionaleListTableTd} text-right tabular-nums`}>{formatInvoiceMoney(row.totale)}</td>
          <td className={`${gestionaleListTableTd} text-right tabular-nums`}>{formatInvoiceMoney(row.residuo)}</td>
          <td className={gestionaleListTableTd}>{formatInvoiceDate(row.data_scadenza)}</td>
          <td className={gestionaleListTableTdPill}>
            <FatturaStatusBadge status={row.status} />
          </td>
          <td className={gestionaleListTableTdAzioni}>
            <div className={dsTableActionsGroup}>
              <button type="button" className={dsTableActionBtnPrimary} onClick={() => onOpenDetail(row.id)}>
                Dettaglio
              </button>
            </div>
          </td>
        </tr>
      );
    },
    [onOpenDetail, pagedRows],
  );

  const onSort = (key: FatturazioneSortKey) => {
    const next = cycleGlobalTableSort(sortCol, sortPhase, key);
    setSortCol(next.column as FatturazioneSortKey | null);
    setSortPhase(next.phase);
  };

  return (
    <ShellCard>
      <section aria-label="Azioni e filtri fatturazione">
        <PageToolbar
          primaryAction={
            canWrite ? (
              <div className="flex flex-wrap gap-2">
                <button type="button" className={dsPageToolbarCtaCompact} onClick={onNewManuale}>
                  <PageToolbarCtaLabel short="+ Nuova" full="+ Nuova fattura" />
                </button>
                <button type="button" className={dsPageToolbarBtn} onClick={onNewPreventivo}>
                  Da preventivo
                </button>
              </div>
            ) : null
          }
          search={
            <GestionaleListSearchField
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder={GESTIONALE_SEARCH_PLACEHOLDER}
              aria-label="Cerca fatture"
            />
          }
          filtersExpanded={filtriEspansi}
          onFiltersToggle={() => setFiltriEspansi((o) => !o)}
          filtersActive={fatturazionePageFiltersActive(filters)}
          filtersPanel={
            filtriEspansi ? (
              <FatturazioneAdvancedFilterPanel filters={filters} onChange={(p) => setFilters((f) => ({ ...f, ...p }))} />
            ) : null
          }
          onFilterReset={() => setFilters(FATTURAZIONE_PAGE_FILTERS_EMPTY)}
          overflowOpen={overflowOpen}
          onOverflowToggle={() => setOverflowOpen((o) => !o)}
          overflowActions={
            <button
              type="button"
              className={dsPageToolbarBtn}
              onClick={() => {
                void appendBillingEvent({
                  entityType: "export",
                  entityId: crypto.randomUUID(),
                  aggregateType: "fatturazione_list",
                  aggregateId: crypto.randomUUID(),
                  invoiceId: null,
                  eventCategory: "audit",
                  eventType: "export",
                  payload: { count: filtered.length },
                });
                downloadInvoicesCsv(filtered);
              }}
            >
              Esporta CSV
            </button>
          }
          meta={
            <PageToolbarResultCount
              count={filtered.length}
              filtersActive={fatturazionePageFiltersActive(filters)}
              searchActive={filters.search.trim().length > 0}
              onFilterReset={() => setFilters(FATTURAZIONE_PAGE_FILTERS_EMPTY)}
              onSearchReset={() => setFilters((f) => ({ ...f, search: "" }))}
              singularLabel="fattura"
              pluralLabel="fatture"
            />
          }
        />
      </section>
      {isLoading ? (
        <FatturazioneTabSection mode="skeleton" />
      ) : listSurface === "table" ? (
        <GestionaleListTable
          wrapClassName="mt-4"
          headRow={
            <>
              <GlobalTableSortTh label="N." columnKey="numero" sortColumn={sortCol} sortPhase={sortPhase} onSort={() => onSort("numero")} />
              <GlobalTableSortTh label="Data" columnKey="data" sortColumn={sortCol} sortPhase={sortPhase} onSort={() => onSort("data")} />
              <GlobalTableSortTh label="Cliente" columnKey="cliente" sortColumn={sortCol} sortPhase={sortPhase} onSort={() => onSort("cliente")} />
              <GlobalTableSortTh label="Totale" columnKey="totale" sortColumn={sortCol} sortPhase={sortPhase} align="right" onSort={() => onSort("totale")} />
              <GlobalTableSortTh label="Residuo" columnKey="residuo" sortColumn={sortCol} sortPhase={sortPhase} align="right" onSort={() => onSort("residuo")} />
              <GlobalTableSortTh label="Scadenza" columnKey="scadenza" sortColumn={sortCol} sortPhase={sortPhase} onSort={() => onSort("scadenza")} />
              <GlobalTableSortTh label="Stato" columnKey="status" sortColumn={sortCol} sortPhase={sortPhase} onSort={() => onSort("status")} />
              <GestionaleListTableActionsHead />
            </>
          }
          empty={pagedRows.length === 0}
          emptyMessage="Nessuna fattura corrisponde ai criteri selezionati."
          colSpan={8}
          virtualRows={{
            rowCount: pagedRows.length,
            renderRow: renderFatturaRow,
            estimateRowHeight: 48,
          }}
        >
          {null}
        </GestionaleListTable>
      ) : (
        <div className="mt-4 space-y-3">
          {pagedRows.length === 0 ? (
            <p className={gestionaleListTableMobileEmptyClass}>Nessuna fattura corrisponde ai criteri selezionati.</p>
          ) : (
            pagedRows.map((row) => (
              <CardMobile key={row.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs font-semibold tabular-nums text-zinc-500 dark:text-zinc-400">
                      {invoiceDisplayNumber(row)}
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-50">{row.cliente_label}</p>
                    <p className="mt-1 text-sm tabular-nums text-zinc-700 dark:text-zinc-200">
                      {formatInvoiceMoney(row.totale)} · <FatturaStatusBadge status={row.status} />
                    </p>
                  </div>
                </div>
                <CardMobileActions>
                  <button type="button" className={dsTableActionBtnSecondary} onClick={() => onOpenDetail(row.id)}>
                    Dettaglio
                  </button>
                </CardMobileActions>
              </CardMobile>
            ))
          )}
        </div>
      )}
      {showPager ? <TablePagination page={page} pageCount={pageCount} onPageChange={setPage} label={label} /> : null}
    </ShellCard>
  );
}
