"use client";

import { Tooltip } from "@/components/ui";
import "@/components/gestionale/lavorazioni/lavorazioni-scroll.css";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import {
  GestionaleListTable,
  GestionaleListTableActionsHead,
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
import { LoadingCardSkeleton, SkeletonBoundary } from "@/components/design-system";
import { LoadingSpinner } from "@/components/design-system/loading";
import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { PreventiviTableSection } from "@/components/preventivi/preventivi-page-structure";
const PreventiviEditorModal = dynamic(
  () => import("@/components/preventivi/preventivi-editor-modal").then((m) => m.PreventiviEditorModal),
  { ssr: false },
);
const OrdiniFornitoriView = dynamic(
  () => import("@/components/ordini-fornitori/ordini-fornitori-view").then((m) => m.OrdiniFornitoriView),
  { ssr: false },
);
const PreventiviAdvancedFilterPanel = dynamic(
  () =>
    import("@/components/preventivi/preventivi-advanced-filter-panel").then((m) => m.PreventiviAdvancedFilterPanel),
  { ssr: false },
);
const DdtDetailDrawer = dynamic(
  () => import("@/components/ddt/ddt-detail-drawer").then((m) => m.DdtDetailDrawer),
  { ssr: false },
);
const PreventiviLogDrawer = dynamic(
  () => import("@/components/preventivi/preventivi-log-drawer").then((m) => m.PreventiviLogDrawer),
  { ssr: false },
);
import { DdtStatusBadge } from "@/components/ddt/ddt-status-badge";
import { buildDdtDraftFromPreventivoAuto } from "@/lib/ddt/preventivo-to-ddt-draft";
import type { DdtDetail } from "@/lib/ddt/types";
import { PreventivoEliminaConfirmDialog } from "@/components/preventivi/preventivo-elimina-confirm-dialog";
import { PreventivoBillingBadge } from "@/components/fatturazione/preventivo-billing-badge";
import { GestionaleListSearchField } from "@/components/gestionale/gestionale-list-search-field";
import { useAuth } from "@/context/auth-context";
import {
  collapsibleExpandedBoolPref,
  useCollapsiblePreference,
} from "@/lib/ui/collapsible-prefs";
import { usePermissionsSnapshot } from "@/src/hooks/use-permissions";
import { READONLY_PERMISSION_HINT } from "@/src/lib/auth/permissions";
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
  type PreventiviPageFilters,
} from "@/lib/preventivi/preventivi-list-ui-filters";
import { createMezziListePrefsDefault } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { buildNewPreventivoFromLavorazioneContext } from "@/lib/preventivi/generate-preventivo-from-lavorazione";
import { buildPreventiviLavorazioneFocusHref } from "@/lib/preventivi/preventivi-lavorazione-href";
import { importPreventiviPdf } from "@/lib/pdf/lazy-pdf-modules";
import { Q_PREVENTIVI_LAV, Q_PREVENTIVI_LAV_ORIG, Q_PREVENTIVI_MEZZO, Q_PREVENTIVI_NUOVO, Q_PREVENTIVI_OPEN, Q_PREVENTIVI_TAB } from "@/lib/preventivi/preventivi-query";
import {
  peekPendingPreventivoPayload,
  clearPendingPreventivoPayload,
  dedupePendingPreventivoAppend,
  markEphemeralPreventivoDraft,
  clearEphemeralPreventivoDraft,
  readEphemeralPreventivoDraftId,
} from "@/lib/preventivi/preventivi-session-bridge";
import { appendPreventiviChangeLog } from "@/lib/preventivi/preventivi-change-log-storage";
import { buildLogModificheDisplayEntries, logAutoreLabel } from "@/lib/gestionale-log/log-modifiche-view-model";
import { removePreventivoRecord } from "@/lib/preventivi/preventivi-sync-adapter";
import { usePreventiviListDerived } from "@/lib/preventivi/use-preventivi-list-derived";
import { ordiniFornitoriListQueryKey } from "@/lib/render/query-key-factory";
import { ordiniFornitoriEntry } from "@/lib/domain/ordini-fornitori-entry";
import { usePreventiviRecordsQuery } from "@/src/hooks/gestionale/use-preventivi-records-query";
import { usePreventivoDdtIndex } from "@/src/hooks/gestionale/use-ddt-query";
import { ddtEntry } from "@/lib/domain/ddt-entry";
import { usePreventiviBillingQuery } from "@/src/hooks/gestionale/use-preventivi-billing-query";
import { useLogListQuery, useMagazzinoRicambiUIQuery, useMezziListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { useLavorazioniReportSlice } from "@/lib/lavorazioni/use-lavorazioni-report-slice";
import { GestionaleSectionGate } from "@/components/gestionale/gestionale-section-gate";
import { layoutPageRoot } from "@/lib/ui/responsive-layout-core";
import { useGestionaleConfirm } from "@/src/hooks/use-gestionale-confirm";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { buildEmptyManualPreventivo } from "@/lib/preventivi/build-empty-manual-preventivo";
import {
  preventivoTipoDocumentoBadgeClass,
  preventivoTipoDocumentoLabel,
} from "@/lib/preventivi/preventivi-tipo-documento";
import type { PreventivoLavorazioneOrigine, PreventivoRecord, PreventivoSortKey, PreventivoSortPhase } from "@/lib/preventivi/types";
import {
  dsBtnNeutral,
  dsPageToolbarBtn,
  dsPageToolbarCtaCompact,
  dsSegmentedBtnOff,
  dsSegmentedBtnOn,
  dsSegmentedWrap,
  GESTIONALE_SEARCH_PLACEHOLDER,
  dsTableRow,
  dsTableActionsGroup,
  dsTableTdActions,
  dsTableActionBtnPrimary,
  dsTableActionBtnSecondary,
  dsTableActionBtnDanger,
  dsTableActionGlyph,
} from "@/lib/ui/design-system";
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import {
  GESTIONALE_LIST_DESKTOP_ONLY_CLASS,
  GESTIONALE_LIST_MOBILE_ONLY_CLASS,
  useGestionaleListLayout,
} from "@/lib/ui/use-gestionale-list-layout";
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
  gestionaleListTableRowClass,
  gestionaleListTableTd,
  gestionaleListTableTdAzioni,
  gestionaleListTableTdPill,
} from "@/lib/ui/gestionale-list-table";

const SEARCH_DEBOUNCE_MS = 320;

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

const preventiviTableTdText = `${gestionaleListTableTd} min-w-0 text-sm text-zinc-800 dark:text-zinc-100`;

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

function IconPreventivoTrash({ className = dsTableActionGlyph }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
}: {
  p: PreventivoRecord;
  hrefLav: string | null;
  canEditWorkOrders: boolean;
  canDeleteRecords: boolean;
  canWritePreventivi: boolean;
  canReadPreventivi: boolean;
  activeDdt: { status: DdtDetail["document"]["status"] } | null;
  ddtBusy: boolean;
  autore: string;
  onEdit: (rec: PreventivoRecord) => void;
  onDelete: (rec: PreventivoRecord) => void;
  onDdtAction: (rec: PreventivoRecord) => void;
}) {
  const showDdt = canReadPreventivi && (canWritePreventivi || activeDdt != null);
  return (
    <>
      {hrefLav ? (
        <IconActionButton
          as="link"
          href={hrefLav}
          label="Lavorazione"
          className={`${dsTableActionBtnSecondary} inline-flex items-center justify-center no-underline`}
        >
          <IconNavLavorazioni className={dsTableActionGlyph} strokeWidth={2} />
        </IconActionButton>
      ) : null}
      <IconActionButton
        label="Modifica"
        tooltipContent={!canEditWorkOrders ? "Sola lettura" : undefined}
        className={dsTableActionBtnPrimary}
        disabled={!canEditWorkOrders}
        onClick={() => onEdit(p)}
      >
        <IconPreventivoEdit />
      </IconActionButton>
      {showDdt ? (
        <IconActionButton
          label={activeDdt ? "Apri DDT" : "Genera DDT"}
          className={dsTableActionBtnSecondary}
          disabled={ddtBusy || (!canWritePreventivi && !activeDdt)}
          onClick={() => onDdtAction(p)}
        >
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase">
            DDT
            {activeDdt ? <DdtStatusBadge status={activeDdt.status} /> : null}
          </span>
        </IconActionButton>
      ) : null}
      <IconActionButton
        label="PDF"
        className={dsTableActionBtnSecondary}
        onClick={() =>
          void importPreventiviPdf().then(({ openPreventivoPdfInNewTab }) =>
            openPreventivoPdfInNewTab(p, autore.trim() || "Operatore"),
          )
        }
      >
        <IconPreventivoPdf />
      </IconActionButton>
      <IconActionButton
        label="Elimina"
        tooltipContent={!canDeleteRecords ? "Sola lettura" : undefined}
        className={dsTableActionBtnDanger}
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

export function PreventiviView() {
  const { containerRef: listLayoutRef, layout: listLayout, layoutClassName: listLayoutClassName } = useGestionaleListLayout({ tier: "xl" });
  const { global: globalPerm, modules: permModules } = usePermissionsSnapshot();
  const prevPerm = permModules.preventivi;
  const ordiniPerm = permModules.ordini_fornitori;
  const canEditWorkOrders = prevPerm.canWrite;
  const canReadPreventivi = prevPerm.canRead;
  const canWritePreventivi = prevPerm.canWrite;
  const canDeleteRecords = prevPerm.canWrite;
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageTabRaw = searchParams.get(Q_PREVENTIVI_TAB);
  const pageTab = pageTabRaw === "ordini" && ordiniPerm.canRead ? "ordini" : "preventivi";
  const setPageTab = useCallback(
    (tab: "preventivi" | "ordini") => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "preventivi") params.delete(Q_PREVENTIVI_TAB);
      else params.set(Q_PREVENTIVI_TAB, tab);
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    },
    [router, searchParams],
  );
  const isPreventiviTab = pageTab === "preventivi";
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
  const filterMezzoNeedsCatalog =
    Boolean(
      filterMezzoRawEarly &&
        !filterMezzoRawEarly.startsWith("hub-") &&
        !filterMezzoRawEarly.startsWith("t:") &&
        !filterMezzoRawEarly.startsWith("m:"),
    );
  const needMezziCatalog =
    isPreventiviTab && (filterMezzoNeedsCatalog || nuovoHandoffEarly === "1" || editor.open);
  const needLavorazioniSlice =
    isPreventiviTab && filterMezzoRawEarly.startsWith("hub-lav-");
  const needMagazzinoList = isPreventiviTab && editor.open;
  const { authorName: autore, user } = useAuth();
  const gestToast = useGestionaleToast();
  const { confirm, confirmDialog } = useGestionaleConfirm();
  const queryClient = useQueryClient();
  const { records: rows, refetch: refetchPreventivi, isLoading: preventiviQueryLoading } =
    usePreventiviRecordsQuery(isPreventiviTab);
  const { byPreventivoId: preventiviBillingById } = usePreventiviBillingQuery(isPreventiviTab);
  const preventiviReadyMarked = useRef(false);
  useEffect(() => {
    void loadPreventiviLearningMerged().then((merged) => savePreventiviLearning(merged));
    void migratePreventiviLearningToSettings();
  }, []);
  useEffect(() => {
    if (pageTab !== "ordini" || !ordiniPerm.canRead) return;
    const key = ordiniFornitoriListQueryKey();
    if (queryClient.getQueryData(key) !== undefined) return;
    void queryClient.prefetchQuery({
      queryKey: key,
      queryFn: async () => {
        const res = await ordiniFornitoriEntry.getList();
        if (!res.success) throw new Error(res.error ?? "Errore caricamento ordini.");
        return res.data ?? [];
      },
    });
  }, [pageTab, ordiniPerm.canRead, queryClient]);
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
  const [sortColumn, setSortColumn] = useState<PreventivoSortKey | null>(null);
  const [sortPhase, setSortPhase] = useState<PreventivoSortPhase>("natural");
  const [searchInput, setSearchInput] = useState("");
  const [searchApplied, setSearchApplied] = useState("");
  const searchInputRef = useRef(searchInput);
  searchInputRef.current = searchInput;
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

  useEffect(() => {
    const t = window.setTimeout(() => setSearchApplied(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const flushPageSearch = useCallback(() => {
    setSearchApplied(searchInputRef.current.trim());
  }, []);
  const rollbackDraftIdRef = useRef<string | null>(null);
  const draftConfirmedRef = useRef(false);
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
  const [eliminaPending, setEliminaPending] = useState(false);
  const [ddtDrawer, setDdtDrawer] = useState<{
    open: boolean;
    detail: DdtDetail | null;
    preventivo: PreventivoRecord | null;
  }>({ open: false, detail: null, preventivo: null });
  const [ddtBusyId, setDdtBusyId] = useState<string | null>(null);

  const reload = useCallback(() => {
    void refetchPreventivi();
  }, [refetchPreventivi]);

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
    () => buildPreventiviSearchSuggestions(rows, searchInput),
    [rows, searchInput],
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
            if (nt && nt !== "—") {
              list = list.filter((r) => normMezzoKey(r.targa) === nt);
            } else {
              const nm = normMezzoKey(seed.matricola);
              if (nm && nm !== "—") {
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
    list = list.filter((r) => preventivoRowMatchesPageFilters(r, pageFilters));
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
    if (sortColumn === null || sortPhase === "natural") {
      list.sort(comparePreventivoCreatedDesc);
      return list;
    }
    list.sort((a, b) => comparePreventivo(a, b, sortColumn, sortPhase));
    return list;
  }, [filteredRows, sortColumn, sortPhase]);

  const preventivoIdsForDdt = useMemo(() => sortedRows.map((r) => r.id), [sortedRows]);
  const { getDdtForPreventivo, refetch: refetchDdtIndex } = usePreventivoDdtIndex(preventivoIdsForDdt);

  const openDdtDrawer = useCallback(
    async (preventivo: PreventivoRecord, ddtId: string) => {
      const detail = await ddtEntry.getDetail(ddtId);
      if (!detail.success || !detail.data) {
        gestToast.errorOnce("ddt-detail", detail.error ?? "Impossibile aprire il DDT.");
        return;
      }
      setDdtDrawer({ open: true, detail: detail.data, preventivo });
    },
    [gestToast],
  );

  const handleDdtAction = useCallback(
    async (preventivo: PreventivoRecord) => {
      const existing = getDdtForPreventivo(preventivo.id);
      if (existing) {
        await openDdtDrawer(preventivo, existing.id);
        return;
      }
      if (!canWritePreventivi) return;
      setDdtBusyId(preventivo.id);
      try {
        const draft = buildDdtDraftFromPreventivoAuto({ preventivo, preventivoId: preventivo.id });
        const created = await ddtEntry.createOrReplaceForPreventivo(draft);
        if (!created.success || !created.data) throw new Error(created.error ?? "Creazione DDT non riuscita.");
        await refetchDdtIndex();
        await openDdtDrawer(preventivo, created.data.id);
        gestToast.successOnce("ddt-created", "DDT generato.");
      } catch (e) {
        gestToast.errorOnce("ddt-create", e);
      } finally {
        setDdtBusyId(null);
      }
    },
    [canWritePreventivi, getDdtForPreventivo, gestToast, openDdtDrawer, refetchDdtIndex],
  );

  const handleRegenerateDdt = useCallback(async () => {
    const preventivo = ddtDrawer.preventivo;
    if (!preventivo || !canWritePreventivi) return;
    const ok = await confirm({
      title: "Rigenerare DDT",
      message: "Rigenerare il DDT? Il documento precedente verrà annullato.",
      confirmLabel: "Rigenera",
      destructive: true,
    });
    if (!ok) return;
    setDdtBusyId(preventivo.id);
    try {
      const draft = buildDdtDraftFromPreventivoAuto({ preventivo, preventivoId: preventivo.id });
      const created = await ddtEntry.createOrReplaceForPreventivo(draft);
      if (!created.success || !created.data) throw new Error(created.error ?? "Rigenerazione non riuscita.");
      await refetchDdtIndex();
      await openDdtDrawer(preventivo, created.data.id);
      gestToast.successOnce("ddt-regen", "DDT rigenerato.");
    } catch (e) {
      gestToast.errorOnce("ddt-regen", e);
    } finally {
      setDdtBusyId(null);
    }
  }, [canWritePreventivi, confirm, ddtDrawer.preventivo, gestToast, openDdtDrawer, refetchDdtIndex]);

  const refreshDdtDrawer = useCallback(async () => {
    const detail = ddtDrawer.detail;
    if (!detail) return;
    const next = await ddtEntry.getDetail(detail.document.id);
    if (next.success && next.data) {
      setDdtDrawer((prev) => ({ ...prev, detail: next.data! }));
    }
    void refetchDdtIndex();
  }, [ddtDrawer.detail, refetchDdtIndex]);

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
      return (
        <tr
          key={p.id}
          id={`preventivo-row-${p.id}`}
          className={`${gestionaleListTableRowClass} ${
            focused ? "ring-2 ring-inset ring-[color:color-mix(in_srgb,var(--cab-primary)_45%,transparent)] bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))]" : ""
          }`}
        >
          <td className={`whitespace-nowrap ${gestionaleListTableTd} font-mono text-xs font-semibold tabular-nums text-zinc-900 dark:text-zinc-100`}>
            <span className="inline-flex items-center gap-1.5">
              {p.numero}
              <PreventivoBillingBadge status={preventiviBillingById.get(p.id)?.stato_fatturazione} />
            </span>
          </td>
          <td className={`whitespace-nowrap ${gestionaleListTableTdPill}`}>
            <Tooltip content={preventivoTipoDocumentoLabel(p.tipoDocumento)}><span className={preventivoTipoDocumentoBadgeClass(p.tipoDocumento)}>
              {preventivoTipoDocumentoLabel(p.tipoDocumento, "short")}
            </span></Tooltip>
          </td>
          <td className={`whitespace-nowrap ${gestionaleListTableTd} text-xs tabular-nums text-zinc-600 dark:text-zinc-300`}>
            {fmtDataCreazioneTabella(p.dataCreazione)}
          </td>
          <td className={preventiviTableTdText}>
            <span className="line-clamp-2 break-words leading-snug">{p.cliente || "—"}</span>
          </td>
          <td className={`min-w-0 ${gestionaleListTableTd} text-zinc-700 dark:text-zinc-200`}>
            <span className="line-clamp-2 break-words text-xs leading-snug">{p.cantiere || "—"}</span>
          </td>
          <td className={`min-w-0 ${gestionaleListTableTd} text-zinc-700 dark:text-zinc-200`}>
            <span className="line-clamp-2 break-words text-xs leading-snug">{p.utilizzatore || "—"}</span>
          </td>
          <td className={`min-w-0 max-w-[1px] ${gestionaleListTableTd} text-zinc-700 dark:text-zinc-200`}>
            <span className="line-clamp-2 break-words text-sm leading-snug">{p.macchinaRiassunto || "—"}</span>
          </td>
          <td className={`whitespace-nowrap ${gestionaleListTableTd} font-mono text-[11px] text-zinc-600 dark:text-zinc-300`}>{p.targa || "—"}</td>
          <td className={`min-w-0 ${gestionaleListTableTd} font-mono text-[11px] text-zinc-600 dark:text-zinc-300`}>
            <span className="line-clamp-1">{p.matricola || "—"}</span>
          </td>
          <td className={`min-w-0 ${gestionaleListTableTd} text-[11px] text-zinc-600 dark:text-zinc-300`}>
            <Tooltip content={p.nScuderia || undefined}><span className="line-clamp-1">
              {p.nScuderia || "—"}
            </span></Tooltip>
          </td>
          <td className={`whitespace-nowrap ${gestionaleListTableTd} text-sm font-medium tabular-nums text-zinc-800 dark:text-zinc-100`}>
            {p.totaleFinale.toLocaleString("it-IT", { minimumFractionDigits: 2 })} €
          </td>
          <td className={gestionaleListTableTdAzioni}>
            <div className={dsTableActionsGroup}>
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
      openEliminaConfirm,
      pagedRows,
      preventiviBillingById,
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
    setSearchInput("");
    setSearchApplied("");
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
      return buildNewPreventivoFromLavorazioneContext({
        lav: pending.lav,
        origine: pending.origine,
        bundle: pending.bundle,
        mezzo,
        magazzino: mag,
        autore: aut,
        existingRecords: existing,
      });
    })
      .then((draft) => {
        if (!draft) return;
        clearPendingPreventivoPayload();
        setEditor({ open: true, record: draft, isNew: true, isRollbackDraft: false });
        const sp = new URLSearchParams(window.location.search);
        sp.delete(Q_PREVENTIVI_NUOVO);
        const q = sp.toString();
        router.replace(q ? `/preventivi?${q}` : "/preventivi", { scroll: false });
      })
      .catch((err: unknown) => {
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

  function openEliminaConfirm(p: PreventivoRecord) {
    if (!canDeleteRecords) return;
    setEliminaConfirmRecord(p);
  }

  async function confirmEliminaPreventivo() {
    const p = eliminaConfirmRecord;
    if (!p || !canDeleteRecords || eliminaPending) return;
    setEliminaPending(true);
    const u = autore.trim() || "Operatore";
    appendPreventiviChangeLog({
      tone: "delete",
      tipoRiga: "ELIMINAZIONE PREVENTIVO",
      oggettoRiga: `Preventivo ${p.numero}`,
      modificaRiga: `Cliente: ${p.cliente || "—"}. Totale ${p.totaleFinale.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €.`,
      autore: u,
      atIso: new Date().toISOString(),
    });
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

  const documentSectionTabs = ordiniPerm.canRead ? (
    <div className={`${dsSegmentedWrap} w-fit`} role="tablist" aria-label="Sezione documenti">
      <button
        type="button"
        role="tab"
        aria-selected={pageTab === "preventivi"}
        className={pageTab === "preventivi" ? dsSegmentedBtnOn : dsSegmentedBtnOff}
        onClick={() => setPageTab("preventivi")}
      >
        Preventivi
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={pageTab === "ordini"}
        className={pageTab === "ordini" ? dsSegmentedBtnOn : dsSegmentedBtnOff}
        onClick={() => setPageTab("ordini")}
      >
        Ordini fornitori
      </button>
    </div>
  ) : null;

  const importTriggerRef = useRef<HTMLDivElement>(null);
  const preventiviMenuItems = useMemo((): PageActionItem[] => {
    if (pageTab !== "preventivi") {
      return [pageActionLogItem(() => setLogOpen(true), "Log attività")];
    }
    return [
      {
        id: "import",
        label: "Importa",
        description: "Importa preventivi da file Excel",
        onSelect: () => clickPageActionHiddenTrigger(importTriggerRef.current),
        module: "preventivi",
        requireWrite: true,
      },
      pageActionLogItem(() => setLogOpen(true), "Log attività"),
    ];
  }, [pageTab]);

  return (
    <GestionaleSectionGate module="preventivi">
    <PageActionMenuProvider>
    <PreventiviPageMenuRegistrar items={preventiviMenuItems} />
    <PageHeaderPageActionMenu />
    <div ref={importTriggerRef} className="sr-only" aria-hidden>
      <ModuleImportEntry entity="preventivi" module="preventivi" />
    </div>
    <div ref={listLayoutRef} className={`lavorazioni-scroll-scope ${layoutPageRoot} ${listLayoutClassName}`.trim()}>
    <>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {documentSectionTabs}
      </div>

      {pageTab === "ordini" ? (
        <OrdiniFornitoriView canRead={canReadPreventivi} canWrite={canWritePreventivi} />
      ) : (
        <>
      {bannerFilter}
      {bannerMezzo}

      <ShellCard>
        <section aria-label="Azioni e filtri preventivi">
          <PageToolbar
            testId="page-ready-toolbar"
            primaryAction={
              <Tooltip content={canEditWorkOrders ? "Crea un preventivo senza collegamento a lavorazione" : READONLY_PERMISSION_HINT}>
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
                >
                  <PageToolbarCtaLabel short="+ Nuovo" full="+ Nuovo preventivo" />
                </button>
              </Tooltip>
            }
            search={
              <GestionaleListSearchField
                id="preventivi-search"
                wrapperClassName="min-w-0 flex-1"
                placeholder={GESTIONALE_SEARCH_PLACEHOLDER}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    flushPageSearch();
                  }
                }}
                suggestionPool={searchSuggestionPool}
                aria-label="Cerca preventivi"
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
                searchActive={searchApplied.trim().length > 0 || searchInput.trim().length > 0}
                onSearchReset={resetPreventiviRicerca}
                onFilterReset={resetPreventiviFiltriPagina}
              />
            }
          />
        </section>

        <SkeletonBoundary loading={preventiviInitialLoading}>
        <PreventiviTableSection mode="content" className="mt-4">
        {listLayout === "desktop" ? (
        <GestionaleListTable
          wrapClassName="mt-4"
          visibilityClass={GESTIONALE_LIST_DESKTOP_ONLY_CLASS}
          colgroup={
            <>
              <col className="w-[5.25rem]" />
              <col className="w-[5rem]" />
              <col className="w-[5.75rem]" />
              <col className="w-[12%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[14%]" />
              <col className="w-[4.5rem]" />
              <col className="w-[5.25rem]" />
              <col className="w-[4.25rem]" />
              <col className="w-[6.25rem]" />
              <col className="w-[10.5rem]" />
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
                  thClassName="w-[5.25rem]"
                />
                <GlobalTableSortTh
                  label="Tipo"
                  columnKey="tipoDocumento"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSortMain}
                  contentChipInset
                  thClassName="w-[5rem]"
                />
                <GlobalTableSortTh
                  label="Data"
                  columnKey="dataCreazione"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSortMain}
                  thClassName="w-[5.75rem]"
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
                  label="Cantiere"
                  columnKey="cantiere"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSortMain}
                  thClassName="min-w-0"
                />
                <GlobalTableSortTh
                  label="Utilizzatore"
                  columnKey="utilizzatore"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSortMain}
                  thClassName="min-w-0"
                />
                <GlobalTableSortTh
                  label="Mezzo"
                  columnKey="macchinaRiassunto"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSortMain}
                  thClassName="min-w-0"
                />
                <GlobalTableSortTh
                  label="Targa"
                  columnKey="targa"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSortMain}
                  thClassName="w-[4.5rem]"
                />
                <GlobalTableSortTh
                  label="Matricola"
                  columnKey="matricola"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSortMain}
                  thClassName="w-[5.25rem]"
                />
                <GlobalTableSortTh
                  label="Scud."
                  columnKey="nScuderia"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSortMain}
                  thClassName="w-[4.25rem]"
                />
                <GlobalTableSortTh
                  label="Totale"
                  columnKey="totaleFinale"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSortMain}
                  thClassName="w-[6.25rem]"
                />
                <GestionaleListTableActionsHead />
            </>
          }
          empty={pagedRows.length === 0}
          emptyMessage={tableEmptyMessage}
          colSpan={12}
          virtualRows={{
            rowCount: pagedRows.length,
            renderRow: renderPreventivoDesktopRow,
            estimateRowHeight: 56,
          }}
        >
              {null}
        </GestionaleListTable>
        ) : null}

        {listLayout === "mobile" ? (
        <div className="mt-4 space-y-3">
          {pagedRows.length === 0 ? (
            <p className={gestionaleListTableMobileEmptyClass}>{tableEmptyMessage}</p>
          ) : (
            pagedRows.map((p) => {
              const hrefLav = p.lavorazioneId.trim()
                ? buildPreventiviLavorazioneFocusHref(p.lavorazioneId, p.lavorazioneOrigine)
                : null;
              const focused = focusPreventivoId === p.id;
              return (
                <CardMobile
                  key={p.id}
                  id={`preventivo-row-${p.id}`}
                  className={focused ? "ring-2 ring-[color:color-mix(in_srgb,var(--cab-primary)_45%,transparent)] bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))]" : undefined}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-mono text-xs font-semibold tabular-nums text-zinc-500 dark:text-zinc-400">{p.numero}</p>
                        <PreventivoBillingBadge status={preventiviBillingById.get(p.id)?.stato_fatturazione} />
                        <span className={preventivoTipoDocumentoBadgeClass(p.tipoDocumento)}>
                          {preventivoTipoDocumentoLabel(p.tipoDocumento, "short")}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
                        {p.cliente || "—"}
                      </p>
                      <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">{p.macchinaRiassunto || "—"}</p>
                    </div>
                    <p className="shrink-0 text-right text-base font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                      {p.totaleFinale.toLocaleString("it-IT", { minimumFractionDigits: 2 })} €
                    </p>
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
                      <dd className="font-medium text-zinc-800 dark:text-zinc-200">{p.cantiere || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500 dark:text-zinc-400">Utilizzatore</dt>
                      <dd className="font-medium text-zinc-800 dark:text-zinc-200">{p.utilizzatore || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500 dark:text-zinc-400">Targa</dt>
                      <dd className="font-mono font-medium text-zinc-800 dark:text-zinc-200">{p.targa || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500 dark:text-zinc-400">Matricola</dt>
                      <dd className="font-mono font-medium text-zinc-800 dark:text-zinc-200">{p.matricola || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500 dark:text-zinc-400">Scuderia</dt>
                      <dd className="font-medium text-zinc-800 dark:text-zinc-200">{p.nScuderia || "—"}</dd>
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
                    />
                  </CardMobileActions>
                </CardMobile>
              );
            })
          )}
        </div>
        ) : null}

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
            <LoadingSpinner size="md" label="Importazione dati dalle schede…" />
            <p className="text-center text-sm text-[color:var(--cab-text-muted)]">
              Attendere, preparazione in corso.
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
        </>
      )}

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

      {ddtDrawer.open ? (
        <DdtDetailDrawer
          open
          detail={ddtDrawer.detail}
          onClose={() => setDdtDrawer({ open: false, detail: null, preventivo: null })}
          canWrite={canWritePreventivi}
          isAdmin={globalPerm.isAdmin}
          canRegenerate={canWritePreventivi}
          regenerateBusy={ddtDrawer.preventivo != null && ddtBusyId === ddtDrawer.preventivo.id}
          onRegenerate={() => void handleRegenerateDdt()}
          onChanged={() => void refreshDdtDrawer()}
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
      {confirmDialog}
    </>
    </div>
    </PageActionMenuProvider>
    </GestionaleSectionGate>
  );
}
