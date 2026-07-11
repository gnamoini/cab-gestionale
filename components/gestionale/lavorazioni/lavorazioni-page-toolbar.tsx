"use client";

import { Tooltip } from "@/components/ui";
import type { ChangeEvent, ReactNode } from "react";
import { PageHeader } from "@/components/gestionale/page-header";
import {
  GestionalePageToolbarActions,
  GestionaleRefreshToolbarButton,
} from "@/components/gestionale/page-header-toolbar";
import { ShellCard } from "@/components/gestionale/shell-card";
import { GestionaleSearchField } from "@/components/gestionale/gestionale-search-field";
import { LavorazioniAdvancedFilterPanel } from "@/components/gestionale/lavorazioni/lavorazioni-advanced-filter-panel";
import {
  PageToolbar,
  PageToolbarCtaLabel,
  PageToolbarResultCount,
} from "@/components/design-system";
import { LoadingSpinner } from "@/components/design-system/loading";
import {
  dsPageToolbarBtn,
  dsPageToolbarCtaCompact,
  GESTIONALE_SEARCH_PLACEHOLDER,
} from "@/lib/ui/design-system";
import type {
  LavorazioniAdvancedFilters,
  LavorazioniFilterCatalog,
} from "@/lib/lavorazioni/lavorazioni-advanced-filters";
import { READONLY_PERMISSION_HINT } from "@/src/lib/auth/permissions";
import { LavorazioniDigitalCaptureLauncher, type CaptureSchedeOpenRequest } from "@/components/document-capture/lavorazioni-digital-capture-launcher";
import { SchedaBlankPdfMenu } from "@/components/document-capture/scheda-blank-pdf-actions";
import type { GlobalOptionsSlice } from "@/src/hooks/use-global-options";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type { LavorazioneSchedeStore } from "@/types/schede";

function IconPrint({ className = "h-4 w-4 shrink-0" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9V4h12v5M6 14h12M7 17h10v3H7z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 9h14a2 2 0 012 2v4a2 2 0 01-2 2h-2v-3H7v3H5a2 2 0 01-2-2v-4a2 2 0 012-2z" />
    </svg>
  );
}

export type LavorazioniPageHeaderToolbarProps = {
  listRefreshBusy: boolean;
  printBusy?: boolean;
  onRefresh: () => void;
  onOpenLog: () => void;
  onPrint: () => void;
  listViewMode: "table" | "kanban";
  onToggleListViewMode: () => void;
};

/** Azioni header pagina Lavorazioni — presentational. */
export function LavorazioniPageHeaderToolbar({
  listRefreshBusy,
  printBusy = false,
  onRefresh,
  onOpenLog,
  onPrint,
  listViewMode,
  onToggleListViewMode,
}: LavorazioniPageHeaderToolbarProps) {
  return (
    <PageHeader
      title="Lavorazioni"
      actions={
        <GestionalePageToolbarActions
          leading={
            <GestionaleRefreshToolbarButton busy={listRefreshBusy} onClick={onRefresh} />
          }
          showUndo={false}
          canUndo={false}
          onOpenLog={onOpenLog}
          logTitle="Storico modifiche lavorazioni"
          overflowActions={
            <>
              <SchedaBlankPdfMenu />
              <Tooltip content={printBusy ? "Generazione PDF…" : "Stampa PDF lavorazioni in corso"}><button type="button" className={`${dsPageToolbarBtn}${printBusy ? " !cursor-wait !opacity-100" : ""}`} onClick={onPrint} disabled={printBusy} aria-busy={printBusy} aria-label={printBusy ? "Generazione PDF in corso" : "Stampa lavorazioni in corso"}>
                {printBusy ? (<LoadingSpinner size="sm" label="Generazione PDF…"/>) : (<IconPrint />)}
                {printBusy ? "Generazione PDF…" : "Stampa"}
              </button></Tooltip>
              <button
                type="button"
                className={dsPageToolbarBtn}
                onClick={onToggleListViewMode}
                aria-pressed={listViewMode === "kanban"}
              >
                {listViewMode === "table" ? "Vista Kanban" : "Vista Tabella"}
              </button>
            </>
          }
        />
      }
    />
  );
}

export type LavorazioniListToolbarProps = {
  canEditWorkOrders: boolean;
  createdBy: string | null | undefined;
  mutPendingBlocking: boolean;
  searchInput: string;
  onSearchInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onSearchEnter: () => void;
  filtriAttiviEspansi: boolean;
  onFiltersToggle: () => void;
  hasPageClientFilters: boolean;
  navMezzoFilterActive: boolean;
  advancedFilters: LavorazioniAdvancedFilters;
  onAdvancedFiltersChange: (patch: Partial<LavorazioniAdvancedFilters>) => void;
  filterCatalog: LavorazioniFilterCatalog;
  statiOpts: { id: string; label: string }[];
  onFilterReset: () => void;
  totalFilteredCount: number;
  searchApplied: string;
  onSearchReset: () => void;
  attiveFilteredCount: number;
  chiuseFilteredCount: number;
  onOpenCreate: () => void;
  onPrimeCreate: () => void;
  onCaptureLavorazioneCreated?: (id: string, opts?: { skipTableFocus?: boolean }) => void;
  onOpenSchedeFromCapture?: (request: CaptureSchedeOpenRequest) => void | Promise<boolean>;
  captureMezzi?: readonly MezzoGestito[];
  captureSchedeStore?: LavorazioneSchedeStore;
  captureAttive?: readonly LavorazioneAttiva[];
  captureStorico?: readonly LavorazioneArchiviata[];
  captureSharedGlobalOpts?: GlobalOptionsSlice;
  captureSharedMezziCatalog?: readonly MezzoGestito[];
};

/** Toolbar ricerca/filtri lista Lavorazioni — presentational. */
export function LavorazioniListToolbar({
  canEditWorkOrders,
  createdBy,
  mutPendingBlocking,
  searchInput,
  onSearchInputChange,
  onSearchEnter,
  filtriAttiviEspansi,
  onFiltersToggle,
  hasPageClientFilters,
  navMezzoFilterActive,
  advancedFilters,
  onAdvancedFiltersChange,
  filterCatalog,
  statiOpts,
  onFilterReset,
  totalFilteredCount,
  searchApplied,
  onSearchReset,
  attiveFilteredCount,
  chiuseFilteredCount,
  onOpenCreate,
  onPrimeCreate,
  onCaptureLavorazioneCreated,
  onOpenSchedeFromCapture,
  captureMezzi,
  captureSchedeStore,
  captureAttive,
  captureStorico,
  captureSharedGlobalOpts,
  captureSharedMezziCatalog,
}: LavorazioniListToolbarProps) {
  const filtersActive = hasPageClientFilters || navMezzoFilterActive;
  const searchActive = searchApplied.trim().length > 0 || searchInput.trim().length > 0;

  const metaExtra: ReactNode =
    filtersActive ? (
      <span className="text-xs text-zinc-500 dark:text-zinc-400">
        {attiveFilteredCount} in corso · {chiuseFilteredCount} in archivio
      </span>
    ) : null;

  return (
    <ShellCard>
      <section aria-label="Azioni e filtri lavorazioni (in corso e archivio)">
        <PageToolbar
          primaryAction={
            <div className="flex min-w-0 w-full items-center gap-1.5 overflow-hidden">
              <Tooltip content={!canEditWorkOrders
                    ? READONLY_PERMISSION_HINT
                    : !createdBy
                      ? "Accedi per creare una lavorazione."
                      : undefined}><button type="button" onClick={onOpenCreate} onPointerEnter={onPrimeCreate} className={`${dsPageToolbarCtaCompact} flex-1`} disabled={mutPendingBlocking || !createdBy || !canEditWorkOrders}>
                <PageToolbarCtaLabel short="+ Nuova" full="+ Nuova lavorazione"/>
              </button></Tooltip>
              <LavorazioniDigitalCaptureLauncher
                enabled={canEditWorkOrders}
                createdBy={createdBy ?? null}
                size="md"
                className="shrink-0"
                mobileIconOnly
                mezzi={captureMezzi}
                schedeStore={captureSchedeStore}
                attive={captureAttive}
                storico={captureStorico}
                sharedGlobalOpts={captureSharedGlobalOpts}
                sharedMezziCatalog={captureSharedMezziCatalog}
                onLavorazioneCreated={onCaptureLavorazioneCreated}
                onOpenSchedeFromCapture={onOpenSchedeFromCapture}
              />
            </div>
          }
          search={
            <GestionaleSearchField
              id="lavorazioni-search"
              value={searchInput}
              onChange={onSearchInputChange}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSearchEnter();
                }
              }}
              placeholder={GESTIONALE_SEARCH_PLACEHOLDER}
              aria-label="Cerca in lavorazioni in corso e archivio"
              wrapperClassName="min-w-0 flex-1 sm:min-w-[12rem]"
            />
          }
          filtersExpanded={filtriAttiviEspansi}
          onFiltersToggle={onFiltersToggle}
          filtersActive={filtersActive}
          filtersPanel={
            <LavorazioniAdvancedFilterPanel
              filters={advancedFilters}
              onChange={onAdvancedFiltersChange}
              catalog={filterCatalog}
              statiOpts={statiOpts}
            />
          }
          onFilterReset={onFilterReset}
          meta={
            <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-x-2 gap-y-1 sm:flex-wrap">
              {mutPendingBlocking ? (
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Salvataggio in corso…
                </span>
              ) : null}
              {!createdBy ? (
                <span className="text-xs text-amber-800 dark:text-amber-200">
                  Accedi per registrare nuove lavorazioni.
                </span>
              ) : null}
              <PageToolbarResultCount
                count={totalFilteredCount}
                filtersActive={filtersActive}
                searchActive={searchActive}
                onSearchReset={onSearchReset}
                onFilterReset={onFilterReset}
              />
              {metaExtra}
            </div>
          }
        />
      </section>
    </ShellCard>
  );
}
