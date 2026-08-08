"use client";

import { Tooltip } from "@/components/ui";
import type { MutableRefObject, ReactNode } from "react";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import { PageHeaderPageActionMenu } from "@/components/gestionale/page-header-actions-portal";
import { ShellCard } from "@/components/gestionale/shell-card";
import { LavorazioniAdvancedFilterPanel } from "@/components/gestionale/lavorazioni/lavorazioni-advanced-filter-panel";
import {
  PageToolbar,
  PageToolbarCtaLabel,
  PageToolbarMetaToggle,
  PageToolbarResultCount,
} from "@/components/design-system";
import { dsPageToolbarCtaCompact, dsTypoSmall } from "@/lib/ui/design-system";
import type {
  LavorazioniAdvancedFilters,
  LavorazioniFilterCatalog,
} from "@/lib/lavorazioni/lavorazioni-advanced-filters";
import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import { READONLY_PERMISSION_HINT } from "@/src/lib/auth/permissions";
import type {
  CaptureSchedeOpenRequest,
  CaptureViewExistingSchedaRequest,
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
  pageActionLogItem,
  type PageActionItem,
} from "@/components/ui";
import { IconSchedaBlank } from "@/components/document-capture/scheda-blank-pdf-actions";
import { openUrlInNewTab } from "@/lib/pdf/open-url-new-tab";

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

/** SSOT voci menu header Lavorazioni. */
export function useLavorazioniPageMenuItems({
  printBusy = false,
  onOpenLog,
  onPrint,
}: {
  printBusy?: boolean;
  onOpenLog: () => void;
  onPrint: () => void;
}): PageActionItem[] {
  return useMemo((): PageActionItem[] => [
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
          openUrlInNewTab(`/api/pdf/artifacts/scheda-blank/${t.id}`, {
            context: "scheda",
            label: t.label,
          });
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
    pageActionLogItem(onOpenLog, "Log attività"),
  ], [onOpenLog, onPrint, printBusy]);
}

export type LavorazioniPageHeaderToolbarProps = {
  items: PageActionItem[];
};

/** Azioni header Lavorazioni — portal nella riga PageHeader (hamburger + titolo). */
export function LavorazioniPageHeaderToolbar({ items }: LavorazioniPageHeaderToolbarProps) {
  return <PageHeaderPageActionMenu items={items} />;
}

export type LavorazioniListToolbarProps = {
  canEditWorkOrders: boolean;
  createdBy: string | null | undefined;
  mutPendingBlocking: boolean;
  search: ReactNode;
  filtriAttiviEspansi: boolean;
  onFiltersToggle: () => void;
  hasPageClientFilters: boolean;
  navMezzoFilterActive: boolean;
  advancedFilters: LavorazioniAdvancedFilters;
  onAdvancedFiltersChange: (patch: Partial<LavorazioniAdvancedFilters>) => void;
  filterCatalog: LavorazioniFilterCatalog;
  addettiRecords?: readonly AddettoRecord[];
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
  onViewExistingScheda?: (request: CaptureViewExistingSchedaRequest) => void | Promise<boolean>;
  captureMezzi?: readonly MezzoGestito[];
  captureSchedeStore?: LavorazioneSchedeStore;
  captureAttive?: readonly LavorazioneAttiva[];
  captureStorico?: readonly LavorazioneArchiviata[];
  captureSharedGlobalOpts?: GlobalOptionsSlice;
  captureSharedMezziCatalog?: readonly MezzoGestito[];
  capturePageDropRef?: MutableRefObject<LavorazioniCapturePageDropHandle | null>;
  capturePageDropDisabled?: boolean;
  onCapturePageDrop?: (file: File) => void;
  listViewMode?: "table" | "kanban";
  onListViewModeChange?: (mode: "table" | "kanban") => void;
};

/** Toolbar ricerca/filtri lista Lavorazioni â€” presentational. */
export function LavorazioniListToolbar({
  canEditWorkOrders,
  createdBy,
  mutPendingBlocking,
  search,
  filtriAttiviEspansi,
  onFiltersToggle,
  hasPageClientFilters,
  navMezzoFilterActive,
  advancedFilters,
  onAdvancedFiltersChange,
  filterCatalog,
  addettiRecords = [],
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
  onViewExistingScheda,
  captureMezzi,
  captureSchedeStore,
  captureAttive,
  captureStorico,
  captureSharedGlobalOpts,
  captureSharedMezziCatalog,
  capturePageDropRef,
  capturePageDropDisabled = true,
  onCapturePageDrop,
  listViewMode = "table",
  onListViewModeChange,
}: LavorazioniListToolbarProps) {
  const filtersActive = hasPageClientFilters || navMezzoFilterActive;
  const searchActive = searchApplied.trim().length > 0;

  const metaExtra: ReactNode =
    filtersActive ? (
      <span className={dsTypoSmall}>
        {attiveFilteredCount} in corso Â· {chiuseFilteredCount} in archivio
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
      dropHint={`Word ed Excel verranno convertiti in PDF per la lettura AI Â· ${DOCUMENT_CAPTURE_UPLOAD_FORMAT_HINT}`}
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
                onViewExistingScheda={onViewExistingScheda}
                pageDropRef={capturePageDropRef}
                size="md"
                className="h-11 shrink-0"
              />
            </div>
          }
          search={search}
          filtersExpanded={filtriAttiviEspansi}
          onFiltersToggle={onFiltersToggle}
          filtersActive={filtersActive}
          filtersPanel={
            <LavorazioniAdvancedFilterPanel
              filters={advancedFilters}
              onChange={onAdvancedFiltersChange}
              catalog={filterCatalog}
              addettiRecords={addettiRecords}
            />
          }
          onFilterReset={onFilterReset}
          meta={
            <div className="flex min-w-0 w-full max-w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
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
                  className="min-w-0 sm:flex-1"
                  count={totalFilteredCount}
                  filtersActive={filtersActive}
                  searchActive={searchActive}
                  onSearchReset={onSearchReset}
                  onFilterReset={onFilterReset}
                />
                {metaExtra}
              </div>
              {onListViewModeChange ? (
                <div className="flex w-full min-w-0 flex-nowrap items-stretch gap-2 sm:ms-auto sm:w-auto sm:justify-end">
                  <PageToolbarMetaToggle
                    className="min-h-10 min-w-0 flex-1 sm:min-h-9 sm:flex-none sm:shrink-0"
                    label="Vista Kanban"
                    shortLabel="Kanban"
                    checked={listViewMode === "kanban"}
                    onChange={(next) => onListViewModeChange(next ? "kanban" : "table")}
                    title="Mostra le lavorazioni in corso come board Kanban"
                  />
                </div>
              ) : null}
            </div>
          }
        />
      </section>
    </ShellCard>
    </GestionaleUploadDropExpand>
  );
}
