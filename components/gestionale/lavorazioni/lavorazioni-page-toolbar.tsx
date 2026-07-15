"use client";

import type { ChangeEvent, ReactNode } from "react";
import { useMemo, useRef } from "react";
import { PageHeader } from "@/components/gestionale/page-header";
import { ShellCard } from "@/components/gestionale/shell-card";
import { GestionaleSearchField } from "@/components/gestionale/gestionale-search-field";
import { LavorazioniAdvancedFilterPanel } from "@/components/gestionale/lavorazioni/lavorazioni-advanced-filter-panel";
import {
  PageToolbar,
  PageToolbarResultCount,
} from "@/components/design-system";
import { GESTIONALE_SEARCH_PLACEHOLDER } from "@/lib/ui/design-system";
import type {
  LavorazioniAdvancedFilters,
  LavorazioniFilterCatalog,
} from "@/lib/lavorazioni/lavorazioni-advanced-filters";
import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import { READONLY_PERMISSION_HINT } from "@/src/lib/auth/permissions";
import {
  LavorazioniDigitalCaptureLauncher,
  type CaptureSchedeOpenRequest,
} from "@/components/document-capture/lavorazioni-digital-capture-launcher";
import type { GlobalOptionsSlice } from "@/src/hooks/use-global-options";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type { LavorazioneSchedeStore } from "@/types/schede";
import {
  PageActionMenu,
  PageActionMenuProvider,
  pageActionCreateItem,
  pageActionFiltersItem,
  pageActionLogItem,
  usePageActionMenu,
  type PageActionItem,
} from "@/components/ui";

const BLANK_PDF_TYPES = [
  { id: "scheda-ingresso-blank", label: "Scheda ingresso" },
  { id: "scheda-lavorazioni-blank", label: "Scheda lavorazioni" },
  { id: "scheda-ricambi-blank", label: "Scheda ricambi" },
] as const;

function IconPrint({ className = "h-4 w-4 shrink-0" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9V4h12v5M6 14h12M7 17h10v3H7z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 9h14a2 2 0 012 2v4a2 2 0 01-2 2h-2v-3H7v3H5a2 2 0 01-2-2v-4a2 2 0 012-2z" />
    </svg>
  );
}

function IconKanban({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H5v14h4V5zm10 0h-4v9h4V5z" />
    </svg>
  );
}

function IconSpark({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" />
    </svg>
  );
}

export type LavorazioniPageMenuProviderProps = {
  children: ReactNode;
  listRefreshBusy: boolean;
  printBusy?: boolean;
  onRefresh: () => void;
  onOpenLog: () => void;
  onPrint: () => void;
  listViewMode: "table" | "kanban";
  onToggleListViewMode: () => void;
  canEditWorkOrders: boolean;
  createdBy: string | null | undefined;
  mutPendingBlocking: boolean;
  filtriAttiviEspansi: boolean;
  onFiltersToggle: () => void;
  filtersActive: boolean;
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

function LavorazioniPageMenuRegistrar({
  printBusy = false,
  onOpenLog,
  onPrint,
  listViewMode,
  onToggleListViewMode,
  canEditWorkOrders,
  createdBy,
  mutPendingBlocking,
  filtriAttiviEspansi,
  onFiltersToggle,
  filtersActive,
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
}: Omit<LavorazioniPageMenuProviderProps, "children" | "listRefreshBusy" | "onRefresh">) {
  const captureRef = useRef<HTMLDivElement>(null);

  const items = useMemo((): PageActionItem[] => {
    const createDisabled = mutPendingBlocking || !createdBy || !canEditWorkOrders;
    const createReason = !canEditWorkOrders
      ? READONLY_PERMISSION_HINT
      : !createdBy
        ? "Accedi per creare una lavorazione."
        : undefined;

    return [
      pageActionCreateItem({
        id: "new-lavorazione",
        label: "Nuova lavorazione",
        description: "Crea una nuova lavorazione in officina",
        shortLabel: "+ Nuova",
        onSelect: () => {
          onPrimeCreate();
          onOpenCreate();
        },
        disabled: createDisabled,
        disabledReason: createReason,
        pageKey: "lavorazioni",
        requireWrite: true,
        shortcut: "Ctrl+N",
      }),
      {
        id: "ai-capture",
        label: "Acquisizione AI",
        description: "Digitalizza schede con intelligenza artificiale",
        icon: <IconSpark />,
        badge: "NEW",
        onSelect: () => {
          captureRef.current?.querySelector("button")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        },
        disabled: createDisabled,
        disabledReason: createReason,
        pageKey: "lavorazioni",
        requireWrite: true,
      },
      pageActionFiltersItem({
        expanded: filtriAttiviEspansi,
        active: filtersActive,
        onToggle: onFiltersToggle,
      }),
      { id: "__divider__", label: "" },
      {
        id: "schede-pdf",
        label: "Schede da stampare",
        description: "Scarica schede vuote in PDF",
        chevron: true,
        submenu: BLANK_PDF_TYPES.map((t) => ({
          id: t.id,
          label: t.label,
          onSelect: () => {
            window.open(`/api/pdf/artifacts/scheda-blank/${t.id}`, "_blank", "noopener,noreferrer");
          },
        })),
      },
      {
        id: "print",
        label: "Stampa lavorazioni",
        description: "Esporta PDF delle lavorazioni in corso",
        icon: <IconPrint />,
        onSelect: onPrint,
        loading: printBusy,
        disabled: printBusy,
      },
      {
        id: "view-mode",
        label: listViewMode === "table" ? "Vista Kanban" : "Vista Tabella",
        description: "Cambia modalità di visualizzazione lista",
        icon: <IconKanban />,
        onSelect: onToggleListViewMode,
      },
      pageActionLogItem(onOpenLog, "Log attività"),
    ];
  }, [
    canEditWorkOrders,
    createdBy,
    mutPendingBlocking,
    filtriAttiviEspansi,
    onFiltersToggle,
    filtersActive,
    onOpenCreate,
    onPrimeCreate,
    onPrint,
    printBusy,
    listViewMode,
    onToggleListViewMode,
    onOpenLog,
  ]);

  usePageActionMenu(items, {
    deps: [
      canEditWorkOrders,
      createdBy,
      mutPendingBlocking,
      filtriAttiviEspansi,
      filtersActive,
      printBusy,
      listViewMode,
    ],
  });

  return (
    <div ref={captureRef} className="sr-only" aria-hidden>
      <LavorazioniDigitalCaptureLauncher
        enabled={canEditWorkOrders}
        createdBy={createdBy ?? null}
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
  );
}

export function LavorazioniPageMenuProvider({
  children,
  listRefreshBusy,
  onRefresh,
  filtersActive,
  ...registrarProps
}: LavorazioniPageMenuProviderProps) {
  return (
    <PageActionMenuProvider
      onRefresh={onRefresh}
      refreshBusy={listRefreshBusy}
      filtersActive={filtersActive}
    >
      <LavorazioniPageMenuRegistrar {...registrarProps} filtersActive={filtersActive} />
      {children}
    </PageActionMenuProvider>
  );
}

export type LavorazioniPageHeaderToolbarProps = {
  listRefreshBusy?: boolean;
};

/** Header Lavorazioni — solo menu overflow ⋮. */
export function LavorazioniPageHeaderToolbar(_props: LavorazioniPageHeaderToolbarProps = {}) {
  return (
    <PageHeader
      title="Lavorazioni"
      actions={<PageActionMenu showFiltersActiveDot />}
    />
  );
}

export type LavorazioniListToolbarProps = {
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
  addettiRecords?: readonly AddettoRecord[];
  statiOpts: { id: string; label: string }[];
  onFilterReset: () => void;
  totalFilteredCount: number;
  searchApplied: string;
  onSearchReset: () => void;
  attiveFilteredCount: number;
  chiuseFilteredCount: number;
  mutPendingBlocking?: boolean;
  createdBy?: string | null;
};

/** Toolbar ricerca/filtri lista Lavorazioni — slim (azioni nel menu). */
export function LavorazioniListToolbar({
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
  addettiRecords = [],
  statiOpts,
  onFilterReset,
  totalFilteredCount,
  searchApplied,
  onSearchReset,
  attiveFilteredCount,
  chiuseFilteredCount,
  mutPendingBlocking = false,
  createdBy,
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
      <section aria-label="Ricerca e filtri lavorazioni">
        <PageToolbar
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
              wrapperClassName="min-w-0 w-full"
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
              addettiRecords={addettiRecords}
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
