"use client";

import { Tooltip } from "@/components/ui";
import type { ChangeEvent, MutableRefObject, ReactNode } from "react";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import { PageHeader } from "@/components/gestionale/page-header";
import { ShellCard } from "@/components/gestionale/shell-card";
import { GestionaleSearchField } from "@/components/gestionale/gestionale-search-field";
import { LavorazioniAdvancedFilterPanel } from "@/components/gestionale/lavorazioni/lavorazioni-advanced-filter-panel";
import {
  PageToolbar,
  PageToolbarCtaLabel,
  PageToolbarResultCount,
} from "@/components/design-system";
import { dsPageToolbarCtaCompact, dsTypoSmall, GESTIONALE_SEARCH_PLACEHOLDER } from "@/lib/ui/design-system";
import type {
  LavorazioniAdvancedFilters,
  LavorazioniFilterCatalog,
} from "@/lib/lavorazioni/lavorazioni-advanced-filters";
import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import { READONLY_PERMISSION_HINT } from "@/src/lib/auth/permissions";
import type {
  CaptureSchedeOpenRequest,
  LavorazioniCapturePageDropHandle,
} from "@/components/document-capture/lavorazioni-digital-capture-launcher";

const LavorazioniDigitalCaptureLauncher = dynamic(
  () =>
    import("@/components/document-capture/lavorazioni-digital-capture-launcher").then(
      (m) => m.LavorazioniDigitalCaptureLauncher,
    ),
  { ssr: false },
);
import {
  DOCUMENT_CAPTURE_UPLOAD_ACCEPT,
  DOCUMENT_CAPTURE_UPLOAD_FORMAT_HINT,
} from "@/lib/document-capture/capture-upload-accept";
import { GestionaleUploadDropExpand } from "@/components/gestionale/upload";
import type { GlobalOptionsSlice } from "@/src/hooks/use-global-options";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type { LavorazioneSchedeStore } from "@/types/schede";
import {
  PageActionMenu,
  PageActionMenuProvider,
  pageActionLogItem,
  usePageActionMenu,
  type PageActionItem,
} from "@/components/ui";
import { IconSchedaBlank } from "@/components/document-capture/scheda-blank-pdf-actions";

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

export type LavorazioniPageMenuProviderProps = {
  children: ReactNode;
  listRefreshBusy: boolean;
  printBusy?: boolean;
  onRefresh: () => void;
  onOpenLog: () => void;
  onPrint: () => void;
  listViewMode: "table" | "kanban";
  onToggleListViewMode: () => void;
  filtersActive: boolean;
};

function LavorazioniPageMenuRegistrar({
  printBusy = false,
  onOpenLog,
  onPrint,
  listViewMode,
  onToggleListViewMode,
}: Omit<LavorazioniPageMenuProviderProps, "children" | "listRefreshBusy" | "onRefresh" | "filtersActive">) {
  const items = useMemo((): PageActionItem[] => [
    {
      id: "schede-pdf",
      label: "Schede da stampare",
      description: "Scarica schede vuote in PDF",
      icon: <IconSchedaBlank />,
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
  ], [onOpenLog, onPrint, printBusy, listViewMode, onToggleListViewMode]);

  usePageActionMenu(items, {
    deps: [printBusy, listViewMode],
  });

  return null;
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
    >
      <LavorazioniPageMenuRegistrar {...registrarProps} />
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
      actions={<PageActionMenu />}
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
  addettiRecords?: readonly AddettoRecord[];
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
  capturePageDropRef?: MutableRefObject<LavorazioniCapturePageDropHandle | null>;
  capturePageDropDisabled?: boolean;
  onCapturePageDrop?: (file: File) => void;
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
  addettiRecords = [],
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
  capturePageDropRef,
  capturePageDropDisabled = true,
  onCapturePageDrop,
}: LavorazioniListToolbarProps) {
  const filtersActive = hasPageClientFilters || navMezzoFilterActive;
  const searchActive = searchApplied.trim().length > 0 || searchInput.trim().length > 0;

  const metaExtra: ReactNode =
    filtersActive ? (
      <span className={dsTypoSmall}>
        {attiveFilteredCount} in corso · {chiuseFilteredCount} in archivio
      </span>
    ) : null;

  return (
    <GestionaleUploadDropExpand
      overlay
      clickToPick={false}
      accept={DOCUMENT_CAPTURE_UPLOAD_ACCEPT}
      disabled={capturePageDropDisabled}
      onFile={(file) => onCapturePageDrop?.(file)}
      dropTitle="Rilascia per acquisire la scheda"
      dropHint={`Word ed Excel verranno convertiti in PDF per la lettura AI · ${DOCUMENT_CAPTURE_UPLOAD_FORMAT_HINT}`}
      className="min-w-0"
    >
    <ShellCard>
      <section aria-label="Azioni e filtri lavorazioni (in corso e archivio)">
        <PageToolbar
          testId="page-ready-toolbar"
          primaryAction={
            <div className="flex min-w-0 shrink-0 flex-nowrap items-center gap-2">
              <Tooltip
                content={
                  !canEditWorkOrders
                    ? READONLY_PERMISSION_HINT
                    : !createdBy
                      ? "Accedi per creare una lavorazione."
                      : undefined
                }
              >
                <button
                  type="button"
                  onClick={onOpenCreate}
                  onPointerEnter={onPrimeCreate}
                  className={dsPageToolbarCtaCompact}
                  disabled={mutPendingBlocking || !createdBy || !canEditWorkOrders}
                >
                  <PageToolbarCtaLabel short="+ Nuova" full="+ Nuova lavorazione" />
                </button>
              </Tooltip>
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
                pageDropRef={capturePageDropRef}
                size="md"
                className="h-11 shrink-0"
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
              addettiRecords={addettiRecords}
              statiOpts={statiOpts}
            />
          }
          onFilterReset={onFilterReset}
          meta={
            <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-x-2 gap-y-1 sm:flex-wrap">
              {mutPendingBlocking ? (
                <span className={`${dsTypoSmall} font-medium`}>
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
    </GestionaleUploadDropExpand>
  );
}
