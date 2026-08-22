"use client";

import "@/components/gestionale/lavorazioni/lavorazioni-scroll.css";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import {
  GestionaleListTable,
  GestionaleListTableActionsHead,
  GlobalTableHeadLabel,
  GlobalTableSortTh,
} from "@/components/gestionale/global-table";
import { IconNavLavorazioni } from "@/components/gestionale/gestionale-nav-config";
import {
  PageActionMenuProvider,
  clickPageActionHiddenTrigger,
  pageActionLogItem,
  usePageActionMenu,
  type PageActionItem,
} from "@/components/ui";
import { PageHeaderPageActionMenu } from "@/components/gestionale/page-header-actions-portal";
import { ModuleImportEntry } from "@/components/data-import/module-import-entry";
import { ShellCard } from "@/components/gestionale/shell-card";
import { TablePagination } from "@/components/gestionale/table-pagination";
import { LoadingCardSkeleton, LoadingFormSkeleton, SkeletonBoundary } from "@/components/design-system";
import { LoadingSpinner } from "@/components/design-system/loading";
import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { PreventiviTableSection } from "@/components/preventivi/preventivi-page-structure";
const PreventiviEditorModal = dynamic(
  () => import("@/components/preventivi/preventivi-editor-modal").then((m) => m.PreventiviEditorModal),
  {
    ssr: false,
    loading: () => (
      <LavorazioniModalShell modalSize="analytics" title="Preventivo" onRequestClose={() => {}}>
        <LoadingFormSkeleton sections={3} />
      </LavorazioniModalShell>
    ),
  },
);
const PreventiviAdvancedFilterPanel = dynamic(
  () =>
    import("@/components/preventivi/preventivi-advanced-filter-panel").then((m) => m.PreventiviAdvancedFilterPanel),
  { ssr: false },
);
const PreventivoAnalisiEconomicaModal = dynamic(
  () =>
    import("@/components/preventivi/preventivo-analisi-economica-modal").then(
      (m) => m.PreventivoAnalisiEconomicaModal,
    ),
  { ssr: false },
);
const PreventiviLogDrawer = dynamic(
  () => import("@/components/preventivi/preventivi-log-drawer").then((m) => m.PreventiviLogDrawer),
  { ssr: false },
);
const PreventivoEventsDrawer = dynamic(
  () => import("@/components/preventivi/preventivo-events-drawer").then((m) => m.PreventivoEventsDrawer),
  { ssr: false },
);
import type { PreventivoEventViewModel } from "@/lib/preventivi/preventivo-events-types";
import { openDdtPdfInNewTab } from "@/lib/ddt/ddt-pdf";
import { buildDdtDraftFromPreventivoAuto } from "@/lib/ddt/preventivo-to-ddt-draft";
import type { DdtStatus } from "@/lib/ddt/types";
import { PreventivoEliminaConfirmDialog } from "@/components/preventivi/preventivo-elimina-confirm-dialog";
import { PreventivoStatusCell } from "@/components/preventivi/preventivo-status-cell";
import { PreventivoBillingBadge } from "@/components/fatturazione/preventivo-billing-badge";
import { PreventivoTipoDocumentoBadge } from "@/components/preventivi/preventivo-tipo-documento-badge";
import {
  prevTableColAzioniClass,
  prevTableColClienteClass,
  prevTableColDataClass,
  prevTableColIdentClass,
  prevTableColNumeroClass,
  prevTableColOggettoClass,
  prevTableColStatoClass,
  prevTableColTipoClass,
  prevTableColTotaleClass,
  prevTableColProfittoClass,
} from "@/lib/preventivi/preventivi-table-columns";
import {
  PreventiviClienteStack,
  PreventiviIdentificazioneCell,
  PreventiviOggettoCell,
  preventivoOggettoTelaioSubline,
  PreventiviProfittoCell,
  prevTableActionBtnDanger,
  prevTableActionBtnPrimary,
  prevTableActionBtnSecondary,
  prevTableActionsRow,
  prevTableBodyTextClass,
  prevTableColStatoAddettoInset,
  prevTablePrimaryTextClass,
  prevTableTd,
  prevTableTdAzioni,
  prevTableTdPill,
  prevTableTdPillWrap,
} from "@/components/preventivi/preventivi-table-shared";
import { GestionaleListSearchController } from "@/components/gestionale/gestionale-list-search-controller";
import { useAuth } from "@/context/auth-context";
import {
  collapsibleExpandedBoolPref,
  useCollapsiblePreference,
} from "@/lib/ui/collapsible-prefs";
import { usePermissionsSnapshot } from "@/src/hooks/use-permissions";
import { useGestionaleSyncScope } from "@/src/hooks/gestionale/use-gestionale-sync-scope";
import {
  mezziForPendingPreventivoHandoff,
  resolveMezzoForPendingPreventivo,
} from "@/lib/preventivi/resolve-mezzo-for-pending-preventivo";
import { splitLavorazioniListRowsForReport } from "@/lib/lavorazioni/lavorazioni-report-adapter";
import { mezzoFromLavorazione, preventivoMatchesMezzo } from "@/lib/mezzi/mezzi-hub-merge";
import { normMezzoKey } from "@/lib/mezzi/lavorazioni-sync";
import { migrateMezziListePrefs } from "@/lib/mezzi/attrezzature-prefs";
import {
  loadPreventiviLearningMerged,
  migratePreventiviLearningToSettings,
} from "@/lib/preventivi/preventivi-learning-sync";
import { savePreventiviLearning } from "@/lib/preventivi/preventivi-learning-storage";
import {
  loadPreventiviAdvancedFiltersPersisted,
  PREVENTIVI_ADVANCED_FILTERS_EMPTY,
  preventiviAdvancedFiltersActive,
  savePreventiviAdvancedFiltersPersisted,
  type PreventiviAdvancedFilters,
} from "@/lib/preventivi/preventivi-advanced-filters";
import {
  buildPreventiviSearchSuggestions,
  preventivoRowMatchesPageFilters,
  preventivoRowSearchScore,
  type PreventiviPageFilters,
} from "@/lib/preventivi/preventivi-list-ui-filters";
import { createMezziListePrefsDefault } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { buildNewPreventivoFromLavorazioneContext } from "@/lib/preventivi/generate-preventivo-from-lavorazione";
import { buildPreventiviLavorazioneFocusHref } from "@/lib/preventivi/preventivi-lavorazione-href";
import { importPreventiviPdf } from "@/lib/pdf/lazy-pdf-modules";
import { Q_PREVENTIVI_LAV, Q_PREVENTIVI_LAV_ORIG, Q_PREVENTIVI_MEZZO, Q_PREVENTIVI_NUOVO, Q_PREVENTIVI_OPEN } from "@/lib/preventivi/preventivi-query";
import {
  peekPendingPreventivoPayload,
  clearPendingPreventivoPayload,
  dedupePendingPreventivoAppend,
  markEphemeralPreventivoDraft,
  clearEphemeralPreventivoDraft,
  readEphemeralPreventivoDraftId,
} from "@/lib/preventivi/preventivi-session-bridge";
import { buildLogModificheDisplayEntries, logAutoreLabel } from "@/lib/gestionale-log/log-modifiche-view-model";
import { removePreventivoRecord } from "@/lib/preventivi/preventivi-sync-adapter";
import { usePreventiviListDerived } from "@/lib/preventivi/use-preventivi-list-derived";
import { preventiviRecordsQueryKey } from "@/lib/render/query-key-factory";
import { usesServerSearch } from "@/lib/search/registry";
import { compareSearchRelevance, isSearchRelevanceSortActive } from "@/lib/search/sort-by-relevance";
import { preventiviEntry } from "@/lib/domain/preventivi-entry";
import { usePreventiviRecordsQuery } from "@/src/hooks/gestionale/use-preventivi-records-query";
import { usePreventivoDdtIndex } from "@/src/hooks/gestionale/use-ddt-query";
import { ddtEntry } from "@/lib/domain/ddt-entry";
import { usePreventiviBillingQuery } from "@/src/hooks/gestionale/use-preventivi-billing-query";
import { useLogListQuery, useMagazzinoRicambiUIQuery, useMezziListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { useLavorazioniReportSlice } from "@/lib/lavorazioni/use-lavorazioni-report-slice";
import { useSchedeBundlesQuery } from "@/src/hooks/use-schede-store-query";
import { GestionaleSectionGate } from "@/components/gestionale/gestionale-section-gate";
import { layoutPageRoot } from "@/lib/ui/responsive-layout-core";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { buildEmptyManualPreventivo } from "@/lib/preventivi/build-empty-manual-preventivo";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { computePreventivoProfitto, profittoTabellaFromResult } from "@/lib/preventivi/preventivo-profitto";
import { getOrCreateBundle } from "@/lib/schede/lavorazioni-schede-storage";
import {
  preventivoTipoDocumentoLabel,
} from "@/lib/preventivi/preventivi-tipo-documento";
import type { PreventivoLavorazioneOrigine, PreventivoRecord, PreventivoSortKey, PreventivoSortPhase, PreventivoStatoWorkflow } from "@/lib/preventivi/types";
import {
  dsBtnNeutral,
  dsPageToolbarBtn,
  dsPageToolbarCtaCompact,
  GESTIONALE_SEARCH_PLACEHOLDER,
  dsTableRow,
  dsTableTdActions,
  dsTableActionGlyph,
} from "@/lib/ui/design-system";
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import { gestionaleListTierClass } from "@/lib/ui/gestionale-list-responsive";
import type { GestionaleListPageProps } from "@/lib/ui/gestionale-list-page-props";
import { useListSurface } from "@/lib/ui/use-list-surface";
import { useResponsiveListPageSize } from "@/lib/ui/use-responsive-list-page-size";
import { useCabAppSettingsPayloadQuery } from "@/src/hooks/gestionale/use-settings-queries";
import {
  CardMobile,
  CardMobileActions,
  IconActionButton,
  PageToolbar,
  PageToolbarCtaLabel,
  PageToolbarResultCount,
} from "@/components/design-system";
import {
  gestionaleListTableMobileEmptyClass,
  gestionalePreventiviDenseTableClass,
  gestionaleListTableIsLastRow,
  gestionaleListTableLastRowAttr,
  gestionaleListTableRowClass,
} from "@/lib/ui/gestionale-list-table";
function fmtDataCreazioneTabella(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function preventivoClienteSubline(p: { cantiere: string; utilizzatore: string }): string {
  return [p.cantiere.trim(), p.utilizzatore.trim()].filter(Boolean).join(" ┬À ");
}

function IconPreventivoEdit({ className = dsTableActionGlyph }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );
}

function PreventiviPageMenuRegistrar({ items }: { items: PageActionItem[] }) {
  usePageActionMenu(items, { group: "preventivi", deps: [items] });
  return null;
}

function IconPreventivoPdf({ className = dsTableActionGlyph }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}

/** Foglio + etichetta (PDF / DDT) per azioni tabella preventivi. */
function PreventivoDocSheetGlyph({ label }: { label: string }) {
  return (
    <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
      <IconPreventivoPdf className="h-5 w-5 opacity-90" />
      <span
        className="absolute translate-y-[0.5px] rounded-[2px] bg-[var(--cab-surface)] px-[2px] py-px text-[9px] font-bold uppercase leading-none tracking-tight shadow-[0_0_0_1px_color-mix(in_srgb,var(--cab-border)_70%,transparent)] sm:text-[10px]"
      >
        {label}
      </span>
    </span>
  );
}

function IconPreventivoTrash({ className = dsTableActionGlyph }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function IconPreventivoAnalisiEconomica({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 14l3-3 3 2 5-6" />
    </svg>
  );
}

function PreventivoRowActions({
  p,
  hrefLav,
  canEditWorkOrders,
  canDeleteRecords,
  canWritePreventivi,
  canReadPreventivi,
  activeDdt,
  ddtBusy,
  autore,
  onEdit,
  onDelete,
  onDdtAction,
  onAnalisiEconomica,
  onTimeline,
}: {
  p: PreventivoRecord;
  hrefLav: string | null;
  canEditWorkOrders: boolean;
  canDeleteRecords: boolean;
  canWritePreventivi: boolean;
  canReadPreventivi: boolean;
  activeDdt: { status: DdtStatus } | null;
  ddtBusy: boolean;
  autore: string;
  onEdit: (rec: PreventivoRecord) => void;
  onDelete: (rec: PreventivoRecord) => void;
  onDdtAction: (rec: PreventivoRecord) => void;
  onAnalisiEconomica: (rec: PreventivoRecord) => void;
  onTimeline: (rec: PreventivoRecord) => void;
}) {
  const showDdt = canReadPreventivi && (canWritePreventivi || activeDdt != null);
  return (
    <>
      {hrefLav ? (
        <IconActionButton
          as="link"
          href={hrefLav}
          label="Lavorazione"
          tooltipForce
          className={`${prevTableActionBtnSecondary} inline-flex items-center justify-center no-underline`}
        >
          <IconNavLavorazioni className={dsTableActionGlyph} strokeWidth={2} />
        </IconActionButton>
      ) : null}
      <IconActionButton
        label="Modifica"
        tooltipContent={!canEditWorkOrders ? "Sola lettura" : undefined}
        tooltipForce
        className={prevTableActionBtnPrimary}
        disabled={!canEditWorkOrders}
        onClick={() => onEdit(p)}
      >
        <IconPreventivoEdit />
      </IconActionButton>
      <IconActionButton
        label="Apri PDF"
        tooltipForce
        className={prevTableActionBtnSecondary}
        onClick={() => {
          void importPreventiviPdf().then(({ openPreventivoPdfInNewTab }) =>
            openPreventivoPdfInNewTab(p, "Gestionale"),
          );
        }}
      >
        <PreventivoDocSheetGlyph label="PDF" />
      </IconActionButton>
      {showDdt ? (
        <IconActionButton
          label={activeDdt ? "Apri DDT" : "Genera DDT"}
          tooltipForce
          className={prevTableActionBtnSecondary}
          disabled={ddtBusy || (!canWritePreventivi && !activeDdt)}
          onClick={() => onDdtAction(p)}
        >
          <PreventivoDocSheetGlyph label="DDT" />
        </IconActionButton>
      ) : null}
      {canReadPreventivi ? (
        <IconActionButton
          label="Timeline eventi"
          tooltipForce
          className={prevTableActionBtnSecondary}
          onClick={() => onTimeline(p)}
        >
          <svg className={dsTableActionGlyph} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </IconActionButton>
      ) : null}
      {canReadPreventivi ? (
        <IconActionButton
          label="Analisi Economica"
          tooltipForce
          className={prevTableActionBtnSecondary}
          onClick={() => onAnalisiEconomica(p)}
        >
          <IconPreventivoAnalisiEconomica className={dsTableActionGlyph} />
        </IconActionButton>
      ) : null}
      <IconActionButton
        label="Elimina"
        tooltipContent={!canDeleteRecords ? "Sola lettura" : undefined}
        tooltipForce
        className={prevTableActionBtnDanger}
        disabled={!canDeleteRecords}
        onClick={() => onDelete(p)}
      >
        <IconPreventivoTrash />
      </IconActionButton>
    </>
  );
}

function comparePreventivoCreatedDesc(a: PreventivoRecord, b: PreventivoRecord): number {
  return b.dataCreazione.localeCompare(a.dataCreazione);
}

function comparePreventivo(a: PreventivoRecord, b: PreventivoRecord, key: PreventivoSortKey, phase: Exclude<PreventivoSortPhase, "natural">): number {
  const dir = phase === "asc" ? 1 : -1;
  switch (key) {
    case "numero":
      return (a.numero.localeCompare(b.numero, "it", { numeric: true }) || comparePreventivoCreatedDesc(a, b)) * dir;
    case "tipoDocumento":
      return (a.tipoDocumento.localeCompare(b.tipoDocumento, "it") || comparePreventivoCreatedDesc(a, b)) * dir;
    case "dataCreazione":
      return (a.dataCreazione.localeCompare(b.dataCreazione) || comparePreventivoCreatedDesc(a, b)) * dir;
    case "cliente":
      return a.cliente.localeCompare(b.cliente, "it") * dir;
    case "cantiere":
      return a.cantiere.localeCompare(b.cantiere, "it") * dir;
    case "utilizzatore":
      return a.utilizzatore.localeCompare(b.utilizzatore, "it") * dir;
    case "macchinaRiassunto":
      return a.macchinaRiassunto.localeCompare(b.macchinaRiassunto, "it") * dir;
    case "targa":
      return a.targa.localeCompare(b.targa, "it") * dir;
    case "matricola":
      return a.matricola.localeCompare(b.matricola, "it") * dir;
    case "nScuderia":
      return a.nScuderia.localeCompare(b.nScuderia, "it") * dir;
    case "totaleFinale":
      return (a.totaleFinale - b.totaleFinale) * dir;
    case "lavorazioneId":
      return a.lavorazioneId.localeCompare(b.lavorazioneId, "it") * dir;
    default:
      return 0;
  }
}

export function PreventiviView({ listSurface: serverListSurface, listTier = "xl" }: GestionaleListPageProps) {
  useGestionaleSyncScope({
    scopeId: "preventivi-view",
    domain: "preventivi",
    route: "/preventivi",
    tables: ["preventivi", "log_modifiche"],
  });
  const listSurface = useListSurface(serverListSurface);
  const { modules: permModules } = usePermissionsSnapshot();
  const prevPerm = permModules.preventivi;
  const canReadPreventivi = prevPerm.canRead;
  const canWritePreventivi = prevPerm.canWrite;
  const canEditWorkOrders = prevPerm.canWrite;
  const canDeleteRecords = prevPerm.canWrite;
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterMezzoRawEarly = searchParams.get(Q_PREVENTIVI_MEZZO)?.trim() || "";
  const nuovoHandoffEarly = searchParams.get(Q_PREVENTIVI_NUOVO);
  const [editor, setEditor] = useState<{
    open: boolean;
    record: PreventivoRecord | null;
    isNew: boolean;
    isRollbackDraft: boolean;
  }>({
    open: false,
    record: null,
    isNew: false,
    isRollbackDraft: false,
  });
  const [handoffDescProgress, setHandoffDescProgress] = useState<string | null>(null);
  const filterMezzoNeedsCatalog =
    Boolean(
      filterMezzoRawEarly &&
        !filterMezzoRawEarly.startsWith("hub-") &&
        !filterMezzoRawEarly.startsWith("t:") &&
        !filterMezzoRawEarly.startsWith("m:"),
    );
  const needMezziCatalog =
    filterMezzoNeedsCatalog || nuovoHandoffEarly === "1" || editor.open;
  const needLavorazioniSlice = filterMezzoRawEarly.startsWith("hub-lav-");
  const needMagazzinoList = true;
  const { authorName: autore, user } = useAuth();
  const gestToast = useGestionaleToast();
  const queryClient = useQueryClient();
  const [searchApplied, setSearchApplied] = useState("");
  const [searchClearSignal, setSearchClearSignal] = useState(0);
  const [suggestionQuery, setSuggestionQuery] = useState("");
  const onSearchAppliedChange = useCallback((q: string) => setSearchApplied(q), []);
  const onDebouncedInputChange = useCallback((q: string) => setSuggestionQuery(q), []);
  const { records: rows, refetch: refetchPreventivi, isLoading: preventiviQueryLoading } =
    usePreventiviRecordsQuery(true, { search: searchApplied });
  const { byPreventivoId: preventiviBillingById } = usePreventiviBillingQuery(true);
  const preventiviReadyMarked = useRef(false);
  useEffect(() => {
    void loadPreventiviLearningMerged().then((merged) => savePreventiviLearning(merged));
    void migratePreventiviLearningToSettings();
  }, []);
  useEffect(() => {
    if (preventiviReadyMarked.current || rows.length === 0) return;
    preventiviReadyMarked.current = true;
    try {
      performance.mark("preventivi-view-ready");
    } catch {
      /* performance API unavailable */
    }
  }, [rows.length]);
  const preventiviInitialLoading = preventiviQueryLoading && rows.length === 0;
  const mezziListQ = useMezziListQuery(undefined, { enabled: needMezziCatalog });
  const mezziSnap = mezziListQ.data ?? [];
  const magazzinoQ = useMagazzinoRicambiUIQuery(undefined, { enabled: needMagazzinoList });
  const magSnap = magazzinoQ.data ?? [];
  const mezziRef = useRef(mezziSnap);
  const magRef = useRef(magSnap);
  const rowsRef = useRef(rows);
  const autoreRef = useRef(autore);
  useEffect(() => {
    mezziRef.current = mezziSnap;
    magRef.current = magSnap;
    rowsRef.current = rows;
    autoreRef.current = autore;
  }, [mezziSnap, magSnap, rows, autore]);
  const lavorazioniListQ = useLavorazioniReportSlice({
    mezziRows: mezziListQ.data ?? [],
    enabled: needLavorazioniSlice,
  });
  const lavReport = useMemo(
    () => splitLavorazioniListRowsForReport(lavorazioniListQ.data ?? []),
    [lavorazioniListQ.data],
  );
  const lavorazioneIdsForSchede = useMemo(
    () => [...new Set(rows.map((r) => r.lavorazioneId.trim()).filter(Boolean))],
    [rows],
  );
  const { store: schedeStore, isLoading: schedeBundlesLoading } = useSchedeBundlesQuery(
    lavorazioneIdsForSchede.length > 0,
    { lavorazioneIds: lavorazioneIdsForSchede },
  );
  const magazzinoById = useMemo(() => {
    const m = new Map<string, RicambioMagazzino>();
    for (const r of magSnap) m.set(r.id, r);
    return m;
  }, [magSnap]);
  const profittoLoading =
    magazzinoQ.isLoading || (lavorazioneIdsForSchede.length > 0 && schedeBundlesLoading);
  const profittoByPreventivoId = useMemo(() => {
    if (profittoLoading) return new Map<string, { profitto: number; marginePercent: number | null }>();
    const out = new Map<string, { profitto: number; marginePercent: number | null }>();
    for (const p of rows) {
      const lavId = p.lavorazioneId.trim();
      const bundle = lavId ? getOrCreateBundle(schedeStore, lavId) : null;
      const result = computePreventivoProfitto({
        preventivo: p,
        bundle: lavId ? bundle : null,
        magazzinoById,
      });
      out.set(p.id, profittoTabellaFromResult(result));
    }
    return out;
  }, [rows, schedeStore, magazzinoById, profittoLoading]);
  const [sortColumn, setSortColumn] = useState<PreventivoSortKey | null>(null);
  const [sortPhase, setSortPhase] = useState<PreventivoSortPhase>("natural");
  const [filtriEspansi, setFiltriEspansi] = useCollapsiblePreference(
    collapsibleExpandedBoolPref(false, { scope: "preventivi", key: "filters", userId: user?.id ?? null }),
  );
  const [toolbarOverflowOpen, setToolbarOverflowOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<PreventiviAdvancedFilters>(
    () => loadPreventiviAdvancedFiltersPersisted() ?? PREVENTIVI_ADVANCED_FILTERS_EMPTY,
  );

  const patchAdvancedFilters = useCallback((patch: Partial<PreventiviAdvancedFilters>) => {
    setAdvancedFilters((prev) => {
      const next = { ...prev, ...patch };
      savePreventiviAdvancedFiltersPersisted(next);
      return next;
    });
  }, []);

  const rollbackDraftIdRef = useRef<string | null>(null);
  const draftConfirmedRef = useRef(false);
  const [eventsTarget, setEventsTarget] = useState<PreventivoRecord | null>(null);
  const [eventsRows, setEventsRows] = useState<PreventivoEventViewModel[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const openPreventivoTimeline = useCallback((record: PreventivoRecord) => {
    setEventsTarget(record);
    setEventsLoading(true);
    setEventsError(null);
    setEventsRows([]);
    void (async () => {
      try {
        const res = await fetch(`/api/preventivi/${encodeURIComponent(record.id)}/events`);
        const body = (await res.json().catch(() => ({}))) as {
          events?: PreventivoEventViewModel[];
          error?: string;
        };
        if (!res.ok) {
          setEventsError(body.error ?? "Caricamento eventi non riuscito.");
          return;
        }
        setEventsRows(body.events ?? []);
      } catch {
        setEventsError("Caricamento eventi non riuscito.");
      } finally {
        setEventsLoading(false);
      }
    })();
  }, []);

  const [logOpen, setLogOpen] = useState(false);
  const logQuery = useLogListQuery({ entita: "preventivi", limit: 100 }, { enabled: logOpen });
  const logDisplayEntries = useMemo(
    () =>
      buildLogModificheDisplayEntries(logQuery.data ?? [], (row) =>
        logAutoreLabel(row, user?.id ?? null, autore),
      ),
    [autore, logQuery.data, user?.id],
  );
  const [eliminaConfirmRecord, setEliminaConfirmRecord] = useState<PreventivoRecord | null>(null);
  const [analisiEconomicaPreventivoId, setAnalisiEconomicaPreventivoId] = useState<string | null>(null);
  const [eliminaPending, setEliminaPending] = useState(false);
  const [ddtBusyId, setDdtBusyId] = useState<string | null>(null);
  const pendingStatusRef = useRef(new Set<string>());

  const reload = useCallback(() => {
    void refetchPreventivi();
  }, [refetchPreventivi]);

  const onStatoRow = useCallback(
    (record: PreventivoRecord, next: PreventivoStatoWorkflow) => {
      if (!canWritePreventivi || next === record.statoWorkflow) return;
      if (pendingStatusRef.current.has(record.id)) return;
      pendingStatusRef.current.add(record.id);

      const previous = record.statoWorkflow;
      const listQueryKey = preventiviRecordsQueryKey(
        usesServerSearch("preventivi") && searchApplied.trim()
          ? { search: searchApplied.trim() }
          : null,
      );
      queryClient.setQueryData<{ records: PreventivoRecord[]; mezziRows: unknown[] } | undefined>(
        listQueryKey,
        (old) =>
          old
            ? {
                ...old,
                records: old.records.map((r) =>
                  r.id === record.id ? { ...r, statoWorkflow: next, stato: next } : r,
                ),
              }
            : old,
      );

      void (async () => {
        const res = await preventiviEntry.transitionStatus(record.id, next, autore.trim() || "Operatore");
        pendingStatusRef.current.delete(record.id);
        if (!res.success) {
          queryClient.setQueryData<{ records: PreventivoRecord[]; mezziRows: unknown[] } | undefined>(
            listQueryKey,
            (old) =>
              old
                ? {
                    ...old,
                    records: old.records.map((r) => (r.id === record.id ? { ...r, statoWorkflow: previous, stato: previous } : r)),
                  }
                : old,
          );
          gestToast.errorOnce(`preventivo-stato-${record.id}`, res.error ?? "Errore aggiornamento stato.", {
            entity: "preventivo",
            action: "update",
          });
          void refetchPreventivi();
          return;
        }
        gestToast.successOnce(`preventivo-stato-${record.id}`, "Stato preventivo aggiornato.");
        void refetchPreventivi();
      })();
    },
    [autore, canWritePreventivi, gestToast, queryClient, refetchPreventivi, searchApplied],
  );

  function closeEditor() {
    const rollbackId = rollbackDraftIdRef.current;
    if (rollbackId && !draftConfirmedRef.current) {
      void removePreventivoRecord(rollbackId, { queryClient }).then(() => reload());
    }
    rollbackDraftIdRef.current = null;
    draftConfirmedRef.current = false;
    clearEphemeralPreventivoDraft();
    setEditor({ open: false, record: null, isNew: false, isRollbackDraft: false });
  }

  function onEditorSaved() {
    draftConfirmedRef.current = true;
    rollbackDraftIdRef.current = null;
    clearEphemeralPreventivoDraft();
    reload();
  }

  useEffect(() => {
    const orphanId = readEphemeralPreventivoDraftId();
    if (!orphanId) return;
    if (editor.open && editor.isRollbackDraft) return;
    const openId = searchParams.get(Q_PREVENTIVI_OPEN)?.trim();
    const nuovo = searchParams.get(Q_PREVENTIVI_NUOVO);
    if (openId === orphanId || nuovo === "1") return;
    void removePreventivoRecord(orphanId, { queryClient }).then(() => {
      clearEphemeralPreventivoDraft();
      reload();
    });
  }, [searchParams, reload, editor.open, editor.isRollbackDraft, queryClient]);

  const filterLavId = searchParams.get(Q_PREVENTIVI_LAV)?.trim() || "";
  const filterOrigRaw = searchParams.get(Q_PREVENTIVI_LAV_ORIG)?.trim() || "";
  const filterMezzoRaw = searchParams.get(Q_PREVENTIVI_MEZZO)?.trim() || "";
  const focusPreventivoId = searchParams.get(Q_PREVENTIVI_OPEN)?.trim() || "";
  const filterOrig: PreventivoLavorazioneOrigine | null =
    filterOrigRaw === "attiva" || filterOrigRaw === "storico" ? filterOrigRaw : null;

  const { data: settingsPayload } = useCabAppSettingsPayloadQuery({ tier: "static" });
  const listePrefs = useMemo(
    () => migrateMezziListePrefs(settingsPayload?.resolved?.mezziListe ?? createMezziListePrefsDefault()),
    [settingsPayload?.resolved?.mezziListe],
  );

  const { filterCatalog } = usePreventiviListDerived(rows, listePrefs);

  const pageFilters = useMemo(
    (): PreventiviPageFilters => ({
      search: searchApplied,
      ...advancedFilters,
    }),
    [searchApplied, advancedFilters],
  );

  const searchSuggestionPool = useMemo(
    () => buildPreventiviSearchSuggestions(rows, suggestionQuery),
    [rows, suggestionQuery],
  );

  const filteredRows = useMemo(() => {
    let list = rows;
    if (filterLavId && filterOrig) {
      list = list.filter((r) => r.lavorazioneId === filterLavId && r.lavorazioneOrigine === filterOrig);
    }
    if (filterMezzoRaw) {
      if (filterMezzoRaw.startsWith("hub-pv-")) {
        const pid = filterMezzoRaw.slice("hub-pv-".length);
        list = list.filter((r) => r.id === pid);
      } else if (filterMezzoRaw.startsWith("t:")) {
        const key = filterMezzoRaw.slice(2);
        list = list.filter((r) => normMezzoKey(r.targa) === key);
      } else if (filterMezzoRaw.startsWith("m:")) {
        const key = filterMezzoRaw.slice(2);
        list = list.filter((r) => normMezzoKey(r.matricola) === key);
      } else if (filterMezzoRaw.startsWith("hub-lav-")) {
        const lavId = filterMezzoRaw.slice("hub-lav-".length);
        const { attive, storico } = lavReport;
        const lav = [...storico, ...attive].find((l) => l.id === lavId);
        if (lav) {
          list = list.filter((r) => preventivoMatchesMezzo(mezzoFromLavorazione(lav), r));
        } else {
          const seed =
            (focusPreventivoId ? rows.find((r) => r.id === focusPreventivoId) : undefined) ??
            rows.find((r) => r.lavorazioneId === lavId);
          if (seed) {
            const nt = normMezzoKey(seed.targa);
            if (nt && nt !== "ÔÇö") {
              list = list.filter((r) => normMezzoKey(r.targa) === nt);
            } else {
              const nm = normMezzoKey(seed.matricola);
              if (nm && nm !== "ÔÇö") {
                list = list.filter((r) => normMezzoKey(r.matricola) === nm);
              } else {
                list = list.filter((r) => r.lavorazioneId === lavId);
              }
            }
          } else {
            list = list.filter((r) => r.lavorazioneId === lavId);
          }
        }
      } else {
        const mezzo = mezziSnap.find((m) => m.id === filterMezzoRaw);
        if (mezzo) list = list.filter((r) => preventivoMatchesMezzo(mezzo, r));
        else list = [];
      }
    }
    list = list.filter((r) =>
      preventivoRowMatchesPageFilters(r, pageFilters, {
        skipSearchFilter: usesServerSearch("preventivi") && searchApplied.trim().length > 0,
      }),
    );
    if (focusPreventivoId) {
      const focused = rows.find((r) => r.id === focusPreventivoId);
      if (focused && !list.some((r) => r.id === focusPreventivoId)) {
        list = [focused, ...list];
      }
    }
    return list;
  }, [rows, filterLavId, filterOrig, filterMezzoRaw, pageFilters, mezziSnap, focusPreventivoId, lavReport]);

  const sortedRows = useMemo(() => {
    const list = [...filteredRows];
    if (isSearchRelevanceSortActive(searchApplied, sortColumn)) {
      list.sort((a, b) => {
        const rel = compareSearchRelevance(a, b, searchApplied, (row, q) => preventivoRowSearchScore(row, q));
        if (rel !== 0) return rel;
        return comparePreventivoCreatedDesc(a, b);
      });
      return list;
    }
    if (sortColumn === null || sortPhase === "natural") {
      list.sort(comparePreventivoCreatedDesc);
      return list;
    }
    list.sort((a, b) => comparePreventivo(a, b, sortColumn, sortPhase));
    return list;
  }, [filteredRows, sortColumn, sortPhase, searchApplied]);

  const preventivoIdsForDdt = useMemo(() => sortedRows.map((r) => r.id), [sortedRows]);
  const { getDdtForPreventivo, refetch: refetchDdtIndex } = usePreventivoDdtIndex(preventivoIdsForDdt);

  const handleDdtAction = useCallback(
    async (preventivo: PreventivoRecord) => {
      const existing = getDdtForPreventivo(preventivo.id);
      if (existing) {
        try {
          await openDdtPdfInNewTab(existing.id);
        } catch (e) {
          gestToast.errorOnce("ddt-print", e);
        }
        return;
      }
      if (!canWritePreventivi) return;
      setDdtBusyId(preventivo.id);
      try {
        const draft = buildDdtDraftFromPreventivoAuto({ preventivo, preventivoId: preventivo.id });
        const created = await ddtEntry.createOrReplaceForPreventivo(draft);
        if (!created.success || !created.data) throw new Error(created.error ?? "Creazione DDT non riuscita.");
        await refetchDdtIndex();
        await openDdtPdfInNewTab(created.data.id);
        gestToast.successOnce("ddt-created", "DDT generato.");
      } catch (e) {
        gestToast.errorOnce("ddt-create", e);
      } finally {
        setDdtBusyId(null);
      }
    },
    [canWritePreventivi, getDdtForPreventivo, gestToast, refetchDdtIndex],
  );

  const listPageSize = useResponsiveListPageSize();
  const preventiviPagerDeps = useMemo(
    () =>
      `${filterLavId ?? ""}|${filterOrig ?? ""}|${filterMezzoRaw}|${searchApplied}|${JSON.stringify(advancedFilters)}|${sortColumn ?? ""}|${sortPhase}`,
    [filterLavId, filterOrig, filterMezzoRaw, searchApplied, advancedFilters, sortColumn, sortPhase],
  );
  const { page, setPage, pageCount, sliceItems, showPager, label, resetPage } = useClientPagination(sortedRows.length, listPageSize);
  useEffect(() => {
    resetPage();
  }, [preventiviPagerDeps, listPageSize, resetPage]);
  const pagedRows = useMemo(() => sliceItems(sortedRows), [sliceItems, sortedRows]);

  const renderPreventivoDesktopRow = useCallback(
    (index: number) => {
      const p = pagedRows[index];
      if (!p) return null;
      const hrefLav = p.lavorazioneId.trim()
        ? buildPreventiviLavorazioneFocusHref(p.lavorazioneId, p.lavorazioneOrigine)
        : null;
      const focused = focusPreventivoId === p.id;
      const clienteSub = preventivoClienteSubline(p);
      const profitEntry = profittoByPreventivoId.get(p.id);
      return (
        <tr
          key={p.id}
          id={`preventivo-row-${p.id}`}
          className={`${gestionaleListTableRowClass} ${
            focused ? "ring-2 ring-inset ring-[color:color-mix(in_srgb,var(--cab-primary)_45%,transparent)] bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))]" : ""
          }`}
          {...(gestionaleListTableIsLastRow(index, pagedRows.length)
            ? { [gestionaleListTableLastRowAttr]: "true" }
            : {})}
        >
          <td className={`whitespace-nowrap ${prevTableTd} font-mono font-semibold tabular-nums`}>
            <span className="inline-flex max-w-full flex-wrap items-center gap-1">
              <span className="truncate">{p.numero}</span>
              {p.versione > 1 ? (
                <span className="rounded bg-zinc-200 px-1 text-[10px] font-semibold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
                  v{p.versione}
                </span>
              ) : null}
              <PreventivoBillingBadge status={preventiviBillingById.get(p.id)?.stato_fatturazione} />
            </span>
          </td>
          <td className={`whitespace-nowrap ${prevTableTdPill}`}>
            <PreventivoTipoDocumentoBadge tipo={p.tipoDocumento} variant="table" />
          </td>
          <td className={`whitespace-nowrap ${prevTableTd} ${prevTableBodyTextClass} tabular-nums`}>
            {fmtDataCreazioneTabella(p.dataCreazione)}
          </td>
          <td className={`min-w-0 ${prevTableTd}`}>
            <PreventiviClienteStack cliente={p.cliente} subline={clienteSub} />
          </td>
          <td className={`min-w-0 ${prevTableTd}`}>
            <PreventiviOggettoCell
              macchina={p.macchinaRiassunto}
              telaio={preventivoOggettoTelaioSubline(p)}
            />
          </td>
          <td className={`min-w-0 ${prevTableTd} gestionale-preventivi-col-ident`}>
            <PreventiviIdentificazioneCell
              targa={p.targa}
              matricola={p.matricola}
              nScuderia={p.nScuderia}
            />
          </td>
          <td
            className={`whitespace-nowrap ${prevTableTd} text-sm font-semibold tabular-nums ${prevTablePrimaryTextClass}`}
          >
            {p.totaleFinale.toLocaleString("it-IT", { minimumFractionDigits: 2 })} Ôé¼
          </td>
          <td className={`min-w-0 ${prevTableTd}`}>
            <PreventiviProfittoCell
              profitto={profittoLoading ? null : profitEntry?.profitto ?? null}
              marginePercent={profittoLoading ? null : profitEntry?.marginePercent ?? null}
              loading={profittoLoading}
            />
          </td>
          <td className={`whitespace-nowrap ${prevTableTdPill} ${prevTableColStatoAddettoInset}`}>
            <div className={prevTableTdPillWrap}>
              <PreventivoStatusCell
                record={p}
                canWrite={canWritePreventivi}
                disabled={pendingStatusRef.current.has(p.id)}
                onStatusChange={onStatoRow}
              />
            </div>
          </td>
          <td className={prevTableTdAzioni}>
            <div className={prevTableActionsRow}>
              <PreventivoRowActions
                p={p}
                hrefLav={hrefLav}
                canEditWorkOrders={canEditWorkOrders}
                canDeleteRecords={canDeleteRecords}
                canWritePreventivi={canWritePreventivi}
                canReadPreventivi={canReadPreventivi}
                activeDdt={getDdtForPreventivo(p.id)}
                ddtBusy={ddtBusyId === p.id}
                autore={autore}
                onEdit={apriModifica}
                onDelete={openEliminaConfirm}
                onDdtAction={(rec) => void handleDdtAction(rec)}
                onAnalisiEconomica={openAnalisiEconomica}
                onTimeline={openPreventivoTimeline}
              />
            </div>
          </td>
        </tr>
      );
    },
    [
      apriModifica,
      autore,
      canDeleteRecords,
      canEditWorkOrders,
      canReadPreventivi,
      canWritePreventivi,
      ddtBusyId,
      focusPreventivoId,
      getDdtForPreventivo,
      handleDdtAction,
      onStatoRow,
      openEliminaConfirm,
      pagedRows,
      preventiviBillingById,
      profittoByPreventivoId,
      profittoLoading,
    ],
  );

  const {
    page: logPage,
    setPage: setLogPage,
    pageCount: logPageCount,
    sliceItems: sliceLogEntries,
    showPager: showLogPager,
    label: logPagerLabel,
    resetPage: resetLogPage,
  } = useClientPagination(logDisplayEntries.length, listPageSize);
  useEffect(() => {
    resetLogPage();
  }, [logOpen, logDisplayEntries.length, listPageSize, resetLogPage]);
  const pagedLogEntries = useMemo(
    () => sliceLogEntries(logDisplayEntries),
    [logDisplayEntries, sliceLogEntries],
  );

  function onSortMain(k: PreventivoSortKey) {
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

  function clearLavFilter() {
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete(Q_PREVENTIVI_LAV);
    sp.delete(Q_PREVENTIVI_LAV_ORIG);
    const q = sp.toString();
    router.replace(q ? `/preventivi?${q}` : "/preventivi", { scroll: false });
  }

  function clearMezzoFilter() {
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete(Q_PREVENTIVI_MEZZO);
    const q = sp.toString();
    router.replace(q ? `/preventivi?${q}` : "/preventivi", { scroll: false });
  }

  const clearNuovoHandoffQuery = useCallback(() => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete(Q_PREVENTIVI_NUOVO);
    const q = sp.toString();
    router.replace(q ? `/preventivi?${q}` : "/preventivi", { scroll: false });
  }, [router, searchParams]);

  const cancelSchedeHandoff = useCallback(() => {
    clearPendingPreventivoPayload();
    clearNuovoHandoffQuery();
  }, [clearNuovoHandoffQuery]);

  const hasAdvancedPanelFilters = preventiviAdvancedFiltersActive(advancedFilters);

  const hasPreventiviListFilters =
    searchApplied.trim().length > 0 ||
    hasAdvancedPanelFilters ||
    Boolean(filterLavId) ||
    Boolean(filterMezzoRaw);

  const tableEmptyMessage = hasPreventiviListFilters
    ? "Nessun preventivo corrisponde alla ricerca o ai filtri selezionati."
    : "Nessun preventivo in archivio.";

  function resetPreventiviRicerca() {
    setSearchClearSignal((n) => n + 1);
    setSuggestionQuery("");
  }

  function resetPreventiviFiltriPagina() {
    setAdvancedFilters(PREVENTIVI_ADVANCED_FILTERS_EMPTY);
    savePreventiviAdvancedFiltersPersisted(PREVENTIVI_ADVANCED_FILTERS_EMPTY);
    resetPreventiviRicerca();
    setFiltriEspansi(false);
  }

  const nuovoHandoff = searchParams.get(Q_PREVENTIVI_NUOVO);
  const schedeHandoffLoading =
    nuovoHandoff === "1" && peekPendingPreventivoPayload() != null && !editor.open;

  useEffect(() => {
    if (nuovoHandoff !== "1") return;
    const pending = peekPendingPreventivoPayload();
    if (!pending) return;
    const hasMezzoSnapshot = Boolean(pending.mezzo?.id?.trim());
    if (mezziListQ.isLoading && !hasMezzoSnapshot) return;

    void dedupePendingPreventivoAppend(async () => {
      const mezzi = mezziForPendingPreventivoHandoff(mezziRef.current, pending);
      const mag = magRef.current;
      const existing = rowsRef.current;
      const aut = autoreRef.current.trim() || "Operatore";
      const mezzo = resolveMezzoForPendingPreventivo(mezzi, pending);
      if (!mezzo) throw new Error("Mezzo non trovato per il cliente/lavorazione indicati.");
      setHandoffDescProgress("Generazione descrizione tecnicaÔÇª");
      return buildNewPreventivoFromLavorazioneContext({
        lav: pending.lav,
        origine: pending.origine,
        bundle: pending.bundle,
        mezzo,
        magazzino: mag,
        autore: aut,
        existingRecords: existing,
        addettiRecords: settingsPayload?.resolved?.lavorazioni.addettiRecords ?? [],
        onDescriptionProgress: (p) => setHandoffDescProgress(p.label),
      });
    })
      .then((draft) => {
        if (!draft) return;
        setHandoffDescProgress(null);
        clearPendingPreventivoPayload();
        setEditor({ open: true, record: draft, isNew: true, isRollbackDraft: false });
        const sp = new URLSearchParams(window.location.search);
        sp.delete(Q_PREVENTIVI_NUOVO);
        const q = sp.toString();
        router.replace(q ? `/preventivi?${q}` : "/preventivi", { scroll: false });
      })
      .catch((err: unknown) => {
        setHandoffDescProgress(null);
        clearPendingPreventivoPayload();
        clearNuovoHandoffQuery();
        const msg =
          err instanceof Error && err.message.trim()
            ? err.message.trim()
            : "Impossibile creare il preventivo dalle schede.";
        gestToast.error(msg, { module: "preventivi", action: "create" });
      });
  }, [
    nuovoHandoff,
    queryClient,
    router,
    reload,
    gestToast,
    mezziListQ.isLoading,
    mezziSnap,
    settingsPayload?.resolved?.lavorazioni.addettiRecords,
    clearNuovoHandoffQuery,
  ]);

  useEffect(() => {
    if (!focusPreventivoId) return;
    const el = document.getElementById(`preventivo-row-${focusPreventivoId}`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focusPreventivoId, pagedRows]);

  useEffect(() => {
    const openId = focusPreventivoId;
    if (!openId) return;
    const rec = rows.find((r) => r.id === openId);
    if (!rec) return;
    const visible = filteredRows.some((r) => r.id === openId);
    if (!visible && filterMezzoRaw) return;
    const t = window.setTimeout(() => {
      setEditor({ open: true, record: rec, isNew: false, isRollbackDraft: false });
      const sp = new URLSearchParams(searchParams.toString());
      sp.delete(Q_PREVENTIVI_OPEN);
      const q = sp.toString();
      router.replace(q ? `/preventivi?${q}` : "/preventivi", { scroll: false });
    }, 350);
    return () => window.clearTimeout(t);
  }, [focusPreventivoId, searchParams, rows, router, filteredRows, filterMezzoRaw]);

  function apriModifica(p: PreventivoRecord) {
    if (!canEditWorkOrders) return;
    setEditor({ open: true, record: p, isNew: false, isRollbackDraft: false });
  }

  function openAnalisiEconomica(p: PreventivoRecord) {
    if (!canReadPreventivi) return;
    setAnalisiEconomicaPreventivoId(p.id);
  }

  function openEliminaConfirm(p: PreventivoRecord) {
    if (!canDeleteRecords) return;
    setEliminaConfirmRecord(p);
  }

  async function confirmEliminaPreventivo() {
    const p = eliminaConfirmRecord;
    if (!p || !canDeleteRecords || eliminaPending) return;
    setEliminaPending(true);
    const res = await removePreventivoRecord(p.id, { queryClient });
    setEliminaPending(false);
    if (!res.ok) {
      gestToast.errorOnce("preventivi-delete", res.error, { module: "preventivi" });
      return;
    }
    setEliminaConfirmRecord(null);
    reload();
  }

  const bannerFilter =
    filterLavId && filterOrig ? (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[color:color-mix(in_srgb,var(--cab-primary)_28%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))] px-3 py-2 text-sm text-[color:color-mix(in_srgb,var(--cab-primary)_92%,var(--cab-text))]">
        <span>
          Filtro attivo: preventivi collegati alla lavorazione selezionata ({filterOrig === "attiva" ? "attiva" : "storico"}).
        </span>
        <button type="button" className={dsBtnNeutral} onClick={clearLavFilter}>
          Rimuovi filtro
        </button>
      </div>
    ) : null;

  const bannerMezzo = filterMezzoRaw ? (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[color:color-mix(in_srgb,var(--cab-primary)_28%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))] px-3 py-2 text-sm text-[color:color-mix(in_srgb,var(--cab-primary)_92%,var(--cab-text))]">
      <span>Filtro attivo: preventivi collegati al mezzo selezionato.</span>
      <button type="button" className={dsBtnNeutral} onClick={clearMezzoFilter}>
        Rimuovi filtro
      </button>
    </div>
  ) : null;

  const importTriggerRef = useRef<HTMLDivElement>(null);
  const preventiviMenuItems = useMemo((): PageActionItem[] => {
    return [
      {
        id: "import",
        label: "Importa",
        description: "Importa preventivi da file Excel",
        onSelect: () => clickPageActionHiddenTrigger(importTriggerRef.current),
        module: "preventivi",
        requireWrite: true,
      },
      pageActionLogItem(() => setLogOpen(true), "Log attivit├á"),
    ];
  }, []);

  return (
    <GestionaleSectionGate module="preventivi">
    <PageActionMenuProvider>
    <PreventiviPageMenuRegistrar items={preventiviMenuItems} />
    <PageHeaderPageActionMenu />
    <div ref={importTriggerRef} className="sr-only" aria-hidden>
      <ModuleImportEntry entity="preventivi" module="preventivi" />
    </div>
    <div className={`lavorazioni-scroll-scope ${layoutPageRoot} ${gestionaleListTierClass(listTier)}`.trim()}>
    <>
      {bannerFilter}
      {bannerMezzo}

      <ShellCard>
        <section aria-label="Azioni e filtri preventivi">
          <PageToolbar
            testId="page-ready-toolbar"
            primaryAction={
              <button
                type="button"
                onClick={() =>
                  canEditWorkOrders &&
                  setEditor({
                    open: true,
                    record: buildEmptyManualPreventivo(autore.trim() || "Operatore", rows),
                    isNew: true,
                    isRollbackDraft: false,
                  })
                }
                className={dsPageToolbarCtaCompact}
                disabled={!canEditWorkOrders}
                aria-label="Nuovo preventivo"
              >
                <PageToolbarCtaLabel short="+ Nuovo" full="+ Nuovo preventivo" />
              </button>
            }
            search={
              <GestionaleListSearchController
                domain="preventivi"
                variant="suggestions"
                id="preventivi-search"
                wrapperClassName="min-w-0 flex-1"
                placeholder={GESTIONALE_SEARCH_PLACEHOLDER}
                aria-label="Cerca preventivi"
                onSearchAppliedChange={onSearchAppliedChange}
                onDebouncedInputChange={onDebouncedInputChange}
                clearSignal={searchClearSignal}
                suggestionPool={searchSuggestionPool}
              />
            }
            filtersExpanded={filtriEspansi}
            onFiltersToggle={() => setFiltriEspansi((o) => !o)}
            filtersActive={hasAdvancedPanelFilters}
            filtersPanel={
              filtriEspansi ? (
                <PreventiviAdvancedFilterPanel
                  filters={advancedFilters}
                  onChange={patchAdvancedFilters}
                  catalog={filterCatalog}
                />
              ) : null
            }
            onFilterReset={resetPreventiviFiltriPagina}
            meta={
              <PageToolbarResultCount
                count={sortedRows.length}
                filtersActive={hasAdvancedPanelFilters || Boolean(filterLavId) || Boolean(filterMezzoRaw)}
                searchActive={searchApplied.trim().length > 0}
                onSearchReset={resetPreventiviRicerca}
                onFilterReset={resetPreventiviFiltriPagina}
              />
            }
          />
        </section>

        <SkeletonBoundary loading={preventiviInitialLoading}>
        <PreventiviTableSection mode="content" className="mt-4">
        {listSurface === "table" ? (
        <GestionaleListTable
          className={gestionalePreventiviDenseTableClass}
          wrapClassName="mt-4"
          colgroup={
            <>
              <col className={prevTableColNumeroClass} />
              <col className={prevTableColTipoClass} />
              <col className={prevTableColDataClass} />
              <col className={prevTableColClienteClass} />
              <col className={prevTableColOggettoClass} />
              <col className={prevTableColIdentClass} />
              <col className={prevTableColTotaleClass} />
              <col className={prevTableColProfittoClass} />
              <col className={prevTableColStatoClass} />
              <col className={prevTableColAzioniClass} />
            </>
          }
          headRow={
            <>
                <GlobalTableSortTh
                  label="N."
                  columnKey="numero"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSortMain}
                />
                <GlobalTableSortTh
                  label="Tipo"
                  columnKey="tipoDocumento"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSortMain}
                  contentChipInset
                />
                <GlobalTableSortTh
                  label="Data"
                  columnKey="dataCreazione"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSortMain}
                />
                <GlobalTableSortTh
                  label="Cliente"
                  columnKey="cliente"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSortMain}
                  thClassName="min-w-0"
                />
                <GlobalTableSortTh
                  label="Oggetto"
                  columnKey="macchinaRiassunto"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSortMain}
                  thClassName="min-w-0"
                />
                <GlobalTableSortTh
                  label="Identificazione"
                  columnKey="targa"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSortMain}
                  align="left"
                  thClassName={`min-w-0 ${prevTableColIdentClass}`}
                />
                <GlobalTableSortTh
                  label="Totale"
                  columnKey="totaleFinale"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSortMain}
                  align="left"
                />
                <GlobalTableHeadLabel label="Profitto" align="left" />
                <GlobalTableHeadLabel
                  label="Stato"
                  align="center"
                  thClassName={prevTableColStatoAddettoInset}
                />
                <GestionaleListTableActionsHead />
            </>
          }
          empty={pagedRows.length === 0}
          emptyMessage={tableEmptyMessage}
          colSpan={10}
          virtualRows={{
            rowCount: pagedRows.length,
            renderRow: renderPreventivoDesktopRow,
            estimateRowHeight: 72,
          }}
        >
              {null}
        </GestionaleListTable>
        ) : (
        <div className="mt-4 space-y-3">
          {pagedRows.length === 0 ? (
            <p className={gestionaleListTableMobileEmptyClass}>{tableEmptyMessage}</p>
          ) : (
            pagedRows.map((p) => {
              const hrefLav = p.lavorazioneId.trim()
                ? buildPreventiviLavorazioneFocusHref(p.lavorazioneId, p.lavorazioneOrigine)
                : null;
              const focused = focusPreventivoId === p.id;
              const profitEntry = profittoByPreventivoId.get(p.id);
              return (
                <CardMobile
                  key={p.id}
                  id={`preventivo-row-${p.id}`}
                  className={focused ? "ring-2 ring-[color:color-mix(in_srgb,var(--cab-primary)_45%,transparent)] bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))]" : undefined}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="font-mono text-xs font-semibold tabular-nums text-zinc-500 dark:text-zinc-400">{p.numero}</p>
                        <PreventivoTipoDocumentoBadge tipo={p.tipoDocumento} variant="inline" />
                        <PreventivoBillingBadge status={preventiviBillingById.get(p.id)?.stato_fatturazione} />
                      </div>
                      <p className="mt-1 text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
                        {p.cliente || "ÔÇö"}
                      </p>
                      <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">{p.macchinaRiassunto || "ÔÇö"}</p>
                      {(() => {
                        const telaioSub = preventivoOggettoTelaioSubline(p);
                        return telaioSub ? (
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">{telaioSub}</p>
                        ) : null;
                      })()}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-base font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                        {p.totaleFinale.toLocaleString("it-IT", { minimumFractionDigits: 2 })} Ôé¼
                      </p>
                      <div className="mt-0.5 flex justify-end">
                        <PreventiviProfittoCell
                          profitto={profittoLoading ? null : profitEntry?.profitto ?? null}
                          marginePercent={profittoLoading ? null : profitEntry?.marginePercent ?? null}
                          loading={profittoLoading}
                        />
                      </div>
                    </div>
                  </div>
                  <dl className="mt-3 grid grid-cols-1 gap-x-3 gap-y-2 text-xs cab-shell-desktop:grid-cols-2">
                    <div>
                      <dt className="text-zinc-500 dark:text-zinc-400">Tipo</dt>
                      <dd className="font-medium text-zinc-800 dark:text-zinc-200">
                        {preventivoTipoDocumentoLabel(p.tipoDocumento)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500 dark:text-zinc-400">Data</dt>
                      <dd className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                        {fmtDataCreazioneTabella(p.dataCreazione)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500 dark:text-zinc-400">Cantiere</dt>
                      <dd className="font-medium text-zinc-800 dark:text-zinc-200">{p.cantiere || "ÔÇö"}</dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500 dark:text-zinc-400">Utilizzatore</dt>
                      <dd className="font-medium text-zinc-800 dark:text-zinc-200">{p.utilizzatore || "ÔÇö"}</dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500 dark:text-zinc-400">Targa</dt>
                      <dd className="font-mono font-medium text-zinc-800 dark:text-zinc-200">{p.targa || "ÔÇö"}</dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500 dark:text-zinc-400">Matricola</dt>
                      <dd className="font-mono font-medium text-zinc-800 dark:text-zinc-200">{p.matricola || "ÔÇö"}</dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500 dark:text-zinc-400">Scuderia</dt>
                      <dd className="font-medium text-zinc-800 dark:text-zinc-200">{p.nScuderia || "ÔÇö"}</dd>
                    </div>
                  </dl>
                  <CardMobileActions>
                    <PreventivoRowActions
                      p={p}
                      hrefLav={hrefLav}
                      canEditWorkOrders={canEditWorkOrders}
                      canDeleteRecords={canDeleteRecords}
                      canWritePreventivi={canWritePreventivi}
                      canReadPreventivi={canReadPreventivi}
                      activeDdt={getDdtForPreventivo(p.id)}
                      ddtBusy={ddtBusyId === p.id}
                      autore={autore}
                      onEdit={apriModifica}
                      onDelete={openEliminaConfirm}
                      onDdtAction={(rec) => void handleDdtAction(rec)}
                      onAnalisiEconomica={openAnalisiEconomica}
                      onTimeline={openPreventivoTimeline}
                    />
                  </CardMobileActions>
                </CardMobile>
              );
            })
          )}
        </div>
        )}

        {showPager ? <TablePagination page={page} pageCount={pageCount} onPageChange={setPage} label={label} /> : null}
        </PreventiviTableSection>
        </SkeletonBoundary>
      </ShellCard>

      {schedeHandoffLoading ? (
        <LavorazioniModalShell
          modalSize="analytics"
          title="Nuovo preventivo"
          onRequestClose={cancelSchedeHandoff}
        >
          <div
            className="flex min-h-[12rem] flex-col items-center justify-center gap-3 px-4 py-8"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <LoadingSpinner size="md" label="Importazione dati dalle schedeÔÇª" />
            <p className="text-center text-sm text-[color:var(--cab-text-muted)]">
              {handoffDescProgress ?? "Attendere, preparazione in corso."}
            </p>
          </div>
        </LavorazioniModalShell>
      ) : null}

      {editor.open && canEditWorkOrders ? (
        <PreventiviEditorModal
          open
          record={editor.record}
          isNew={editor.isNew}
          isRollbackDraft={editor.isRollbackDraft}
          autore={autore.trim() || "Operatore"}
          allRecords={rows}
          onClose={closeEditor}
          onSaved={onEditorSaved}
          onSaveError={(msg) => {
            if (msg.includes("altro utente")) gestToast.warning(msg);
            else gestToast.errorOnce("preventivi-editor", msg, { module: "preventivi" });
          }}
        />
      ) : null}

      {analisiEconomicaPreventivoId ? (
        <PreventivoAnalisiEconomicaModal
          preventivoId={analisiEconomicaPreventivoId}
          onClose={() => setAnalisiEconomicaPreventivoId(null)}
        />
      ) : null}

      <PreventivoEliminaConfirmDialog
        open={eliminaConfirmRecord != null}
        record={eliminaConfirmRecord}
        pending={eliminaPending}
        onCancel={() => {
          if (!eliminaPending) setEliminaConfirmRecord(null);
        }}
        onConfirm={() => {
          void confirmEliminaPreventivo();
        }}
      />

      {eventsTarget ? (
        <PreventivoEventsDrawer
          open
          onClose={() => setEventsTarget(null)}
          numero={eventsTarget.numero}
          events={eventsRows}
          isLoading={eventsLoading}
          error={eventsError}
        />
      ) : null}

      {logOpen ? (
        <PreventiviLogDrawer
          open
          onClose={() => setLogOpen(false)}
          entries={logDisplayEntries}
          pagedEntries={pagedLogEntries}
          showPager={showLogPager}
          page={logPage}
          pageCount={logPageCount}
          pagerLabel={logPagerLabel}
          onPageChange={setLogPage}
          isLoading={logQuery.isLoading}
          lockScroll={!(editor.open && canEditWorkOrders)}
        />
      ) : null}
    </>
    </div>
    </PageActionMenuProvider>
    </GestionaleSectionGate>
  );
}
