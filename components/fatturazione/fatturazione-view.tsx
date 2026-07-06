"use client";

import "@/components/gestionale/lavorazioni/lavorazioni-scroll.css";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import {
  GestionaleListTable,
  GestionaleListTableActionsHead,
  GlobalTableSortTh,
  cycleGlobalTableSort,
  type GlobalTableSortPhase,
} from "@/components/gestionale/global-table";
import { PageHeader } from "@/components/gestionale/page-header";
import { GestionalePageToolbarActions } from "@/components/gestionale/page-header-toolbar";
import { ShellCard } from "@/components/gestionale/shell-card";
import { TablePagination } from "@/components/gestionale/table-pagination";
import { GestionaleListSearchField } from "@/components/gestionale/gestionale-list-search-field";
import { FatturazioneAdvancedFilterPanel } from "@/components/fatturazione/fatturazione-advanced-filter-panel";
import { FatturazioneDetailDrawer } from "@/components/fatturazione/fatturazione-detail-drawer";
import { FatturaPaymentModal } from "@/components/fatturazione/fattura-payment-modal";
import { FatturazioneKpiGrid } from "@/components/fatturazione/fatturazione-kpi-grid";
import {
  FatturaStatusBadge,
  formatInvoiceDate,
  formatInvoiceMoney,
} from "@/components/fatturazione/fattura-status-badge";
import { buildInvoiceKpi } from "@/lib/fatturazione/invoice-calculations";
import { downloadInvoicesCsv } from "@/lib/fatturazione/fatturazione-csv-export";
import {
  FATTURAZIONE_PAGE_FILTERS_EMPTY,
  fatturazionePageFiltersActive,
  invoiceDisplayNumber,
  invoiceListContextForRow,
  invoiceRowMatchesPageFilters,
  sortInvoices,
  type FatturazioneSortKey,
} from "@/lib/fatturazione/fatturazione-list-ui-filters";
import type { FatturazioneOrigine, InvoiceDetail } from "@/lib/fatturazione/types";
import type { InvoiceRow } from "@/src/types/supabase-tables";
import { invoicesEntry } from "@/lib/domain/invoices-entry";
import { useInvoicesQuery } from "@/src/hooks/gestionale/use-invoices-query";
import { usePreventiviRecordsQuery } from "@/src/hooks/gestionale/use-preventivi-records-query";
import { usePermissionsSnapshot } from "@/src/hooks/use-permissions";
import { READONLY_PERMISSION_HINT } from "@/src/lib/auth/permissions";
import { GestionaleSectionGate } from "@/components/gestionale/gestionale-section-gate";
import {
  CardMobile,
  CardMobileActions,
  Drawer,
  LoadingFatturazioneListSkeleton,
  PageToolbar,
  PageToolbarCtaLabel,
  PageToolbarResultCount,
} from "@/components/design-system";
import {
  buildLogModificheDisplayEntries,
  logAutoreLabel,
} from "@/lib/gestionale-log/log-modifiche-view-model";
import {
  GestionaleLogEmpty,
  GestionaleLogEntryFourLines,
  GestionaleLogList,
  gestionaleLogDrawerPanelClass,
  gestionaleLogScrollEmbeddedClass,
} from "@/components/gestionale/gestionale-log-ui";
import { layoutPageRoot } from "@/lib/ui/responsive-layout-core";
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
  dsStackPage,
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
import { useLogListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";

const FatturazioneWizardModal = dynamic(
  () => import("@/components/fatturazione/fatturazione-wizard-modal").then((m) => m.FatturazioneWizardModal),
  { ssr: false },
);

export function FatturazioneView() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const authorName = user?.nome?.trim() || user?.email?.split("@")[0]?.trim() || "Operatore";
  const { global, modules: permModules } = usePermissionsSnapshot();
  const perms = permModules.fatturazione;
  const { containerRef, layout, layoutClassName } = useGestionaleListLayout();
  const pageSize = useResponsiveListPageSize();
  const { invoices, links, customers, preventiviBilling, isLoading, refetch } = useInvoicesQuery();
  const preventiviQuery = usePreventiviRecordsQuery();
  const logQuery = useLogListQuery({ entita: "invoices", limit: 100 });

  const [filters, setFilters] = useState(FATTURAZIONE_PAGE_FILTERS_EMPTY);
  const [filtriEspansi, setFiltriEspansi] = useState(false);
  const [sortCol, setSortCol] = useState<FatturazioneSortKey | null>("data");
  const [sortPhase, setSortPhase] = useState<GlobalTableSortPhase>("desc");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<InvoiceDetail | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardOrigine, setWizardOrigine] = useState<FatturazioneOrigine>("manuale");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<InvoiceDetail | null>(null);

  const kpi = useMemo(() => buildInvoiceKpi(invoices), [invoices]);

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

  const logEntries = useMemo(
    () =>
      buildLogModificheDisplayEntries(logQuery.data ?? [], (row) =>
        logAutoreLabel(row, user?.id ?? null, authorName),
      ),
    [authorName, logQuery.data, user?.id],
  );

  const openDetail = useCallback(async (id: string) => {
    const res = await invoicesEntry.getDetail(id);
    if (res.success && res.data) {
      setDetail(res.data);
      setDetailOpen(true);
    }
  }, []);

  useEffect(() => {
    const openId = searchParams.get("fattOpen");
    if (openId) void openDetail(openId);
    if (searchParams.get("nuovo") === "1") setWizardOpen(true);
  }, [openDetail, searchParams]);

  const onSort = (key: FatturazioneSortKey) => {
    const next = cycleGlobalTableSort(sortCol, sortPhase, key);
    setSortCol(next.column as FatturazioneSortKey | null);
    setSortPhase(next.phase);
  };

  return (
    <GestionaleSectionGate module="fatturazione">
      <div ref={containerRef} className={`lavorazioni-scroll-scope ${layoutPageRoot} ${layoutClassName}`}>
        <PageHeader
          title="Fatturazione"
          actions={
            <GestionalePageToolbarActions
              canUndo={false}
              onOpenLog={() => setLogOpen(true)}
              logTitle="Log fatturazione"
            />
          }
        />
        <div className={dsStackPage}>
          <FatturazioneKpiGrid
            kpi={kpi}
            onScaduteClick={() => setFilters((f) => ({ ...f, scadenzaPreset: "scadute" }))}
            onDaIncassareClick={() => setFilters((f) => ({ ...f, status: "parzialmente_pagata" }))}
          />
          <ShellCard>
            <section aria-label="Azioni e filtri fatturazione">
              <PageToolbar
                primaryAction={
                  perms.canWrite ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={dsPageToolbarCtaCompact}
                        onClick={() => {
                          setWizardOrigine("manuale");
                          setWizardOpen(true);
                        }}
                      >
                        <PageToolbarCtaLabel short="+ Nuova" full="+ Nuova fattura" />
                      </button>
                      <button
                        type="button"
                        className={dsPageToolbarBtn}
                        onClick={() => {
                          setWizardOrigine("preventivo");
                          setWizardOpen(true);
                        }}
                      >
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
                  <FatturazioneAdvancedFilterPanel filters={filters} onChange={(p) => setFilters((f) => ({ ...f, ...p }))} />
                }
                onFilterReset={() => setFilters(FATTURAZIONE_PAGE_FILTERS_EMPTY)}
                overflowOpen={overflowOpen}
                onOverflowToggle={() => setOverflowOpen((o) => !o)}
                overflowActions={
                  <button type="button" className={dsPageToolbarBtn} onClick={() => downloadInvoicesCsv(filtered)}>
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
                {pagedRows.map((row: InvoiceRow) => (
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
                        <button type="button" className={dsTableActionBtnPrimary} onClick={() => void openDetail(row.id)}>
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
                  pagedRows.map((row: InvoiceRow) => (
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
                        <button type="button" className={dsTableActionBtnSecondary} onClick={() => void openDetail(row.id)}>
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
        </div>

        <FatturazioneDetailDrawer
          detail={detail}
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          canWrite={perms.canWrite}
          isAdmin={global.isAdmin}
          onChanged={() => void refetch()}
          onRegisterPayment={() => setPaymentOpen(true)}
          onEditDraft={
            perms.canWrite
              ? () => {
                  if (!detail) return;
                  setEditDraft(detail);
                  setWizardOpen(true);
                  setDetailOpen(false);
                }
              : undefined
          }
        />

        {paymentOpen && detail ? (
          <FatturaPaymentModal
            invoice={detail.invoice}
            onRequestClose={() => setPaymentOpen(false)}
            onSaved={() => {
              void refetch();
              void openDetail(detail.invoice.id);
            }}
          />
        ) : null}

        {wizardOpen ? (
          <FatturazioneWizardModal
            onRequestClose={() => {
              setWizardOpen(false);
              setEditDraft(null);
            }}
            onSaved={() => void refetch()}
            preventiviRecords={preventiviQuery.records}
            preventiviBilling={preventiviBilling}
            billingCustomers={customers}
            initialOrigine={wizardOrigine}
            editDetail={editDraft}
          />
        ) : null}

        <Drawer open={logOpen} onClose={() => setLogOpen(false)} title="Log fatturazione" ariaLabel="Log fatturazione">
          <div className={gestionaleLogDrawerPanelClass}>
            <div className={gestionaleLogScrollEmbeddedClass}>
              {logQuery.isLoading ? (
                <p className="p-4 text-sm text-[color:var(--cab-text-muted)]">Caricamento…</p>
              ) : logEntries.length === 0 ? (
                <GestionaleLogEmpty message="Nessuna voce di log." />
              ) : (
                <GestionaleLogList>
                  {logEntries.map((entry) => (
                    <li key={entry.id} className="list-none">
                      <GestionaleLogEntryFourLines vm={entry.vm} />
                    </li>
                  ))}
                </GestionaleLogList>
              )}
            </div>
          </div>
        </Drawer>
      </div>
    </GestionaleSectionGate>
  );
}
