"use client";

import { useEffect, useMemo, useState } from "react";
import {
  pageActionCreateItem,
  pageActionFiltersItem,
  usePageActionMenu,
  type PageActionItem,
} from "@/components/ui";
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
import { FatturazioneAdvancedFilterPanel } from "@/components/fatturazione/fatturazione-advanced-filter-panel";
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
  invoiceListContextForRow,
  invoiceRowMatchesPageFilters,
  sortInvoices,
  type FatturazioneSortKey,
} from "@/lib/fatturazione/fatturazione-list-ui-filters";
import type { InvoiceLinkRow, InvoiceRow } from "@/src/types/supabase-tables";
import {
  CardMobile,
  CardMobileActions,
  LoadingFatturazioneListSkeleton,
  PageToolbar,
  PageToolbarCtaLabel,
  PageToolbarResultCount,
} from "@/components/design-system";
import {
  GESTIONALE_LIST_DESKTOP_ONLY_CLASS,
  GESTIONALE_LIST_MOBILE_ONLY_CLASS,
  useGestionaleListLayout,
} from "@/lib/ui/use-gestionale-list-layout";
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

export type FatturazioneFattureSectionProps = {
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
  const { layout } = useGestionaleListLayout();
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

  const filtered = useMemo(() => {
    const rows = invoices.filter((inv) => {
      const ctx = invoiceListContextForRow(inv, links);
      return invoiceRowMatchesPageFilters(inv, ctx, filters);
    });
    if (!sortCol) return rows;
    return sortInvoices(rows, sortCol, sortPhase === "asc");
  }, [filters, invoices, links, sortCol, sortPhase]);

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

  const onSort = (key: FatturazioneSortKey) => {
    const next = cycleGlobalTableSort(sortCol, sortPhase, key);
    setSortCol(next.column as FatturazioneSortKey | null);
    setSortPhase(next.phase);
  };

  const fattureMenuItems = useMemo((): PageActionItem[] => {
    const items: PageActionItem[] = [];
    if (canWrite) {
      items.push(
        pageActionCreateItem({
          id: "new-fattura",
          label: "Nuova fattura",
          description: "Crea una fattura manuale",
          shortLabel: "+ Nuova",
          onSelect: onNewManuale,
          module: "fatturazione",
          requireWrite: true,
        }),
        {
          id: "from-preventivo",
          label: "Da preventivo",
          description: "Genera fattura da preventivo approvato",
          onSelect: onNewPreventivo,
        },
      );
    }
    items.push(
      pageActionFiltersItem({
        expanded: filtriEspansi,
        active: fatturazionePageFiltersActive(filters),
        onToggle: () => setFiltriEspansi((o) => !o),
      }),
      {
        id: "export-csv",
        label: "Esporta CSV",
        description: "Esporta l'elenco fatture filtrato",
        onSelect: () => {
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
        },
      },
    );
    return items;
  }, [canWrite, filtriEspansi, filters, filtered.length, onNewManuale, onNewPreventivo]);

  usePageActionMenu(fattureMenuItems, { group: "fatture", deps: [fattureMenuItems] });

  return (
    <ShellCard>
      <section aria-label="Azioni e filtri fatturazione">
        <PageToolbar
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
            <FatturazioneAdvancedFilterPanel filters={filters} onChange={(p) => setFilters((f) => ({ ...f, ...p }))} />
          }
          onFilterReset={() => setFilters(FATTURAZIONE_PAGE_FILTERS_EMPTY)}
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
        <LoadingFatturazioneListSkeleton withToolbar={false} />
      ) : layout === "desktop" ? (
        <GestionaleListTable
          wrapClassName="mt-4"
          visibilityClass={GESTIONALE_LIST_DESKTOP_ONLY_CLASS}
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
        >
          {pagedRows.map((row) => (
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
          ))}
        </GestionaleListTable>
      ) : null}
      {!isLoading && layout === "mobile" ? (
        <div className={`mt-4 space-y-3 ${GESTIONALE_LIST_MOBILE_ONLY_CLASS}`}>
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
      ) : null}
      {showPager ? <TablePagination page={page} pageCount={pageCount} onPageChange={setPage} label={label} /> : null}
    </ShellCard>
  );
}
