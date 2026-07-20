"use client";

import dynamic from "next/dynamic";
import { Tooltip } from "@/components/ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { deferredRouterReplace } from "@/lib/navigation/deferred-app-router";
import { MezziTableSection } from "@/components/gestionale/mezzi/mezzi-page-structure";
import { PageHeaderPageActionMenu } from "@/components/gestionale/page-header-actions-portal";
import {
  clickPageActionHiddenTrigger,
  pageActionLogItem,
  pageActionUndoItem,
  type PageActionItem,
} from "@/components/ui";
import { ModuleImportEntry } from "@/components/data-import/module-import-entry";
import { ShellCard } from "@/components/gestionale/shell-card";
import { MezziSearchBar, mezziFieldFiltersActive } from "@/components/gestionale/mezzi/mezzi-filters";
import type { MezziHubTabId } from "@/components/gestionale/mezzi/mezzi-hub-ui";
import { MezzoEliminaConfirmDialog } from "@/components/gestionale/mezzi/mezzo-elimina-confirm-dialog";
import { MezziPageViewToggle, type MezziPageView } from "@/components/gestionale/mezzi/mezzi-page-view-toggle";
import { MezziTable } from "@/components/gestionale/mezzi/mezzi-table";
import { TablePagination } from "@/components/gestionale/table-pagination";
import { type NumeroLavorazioniFilter, type TagliandiFilter, type UltimaLavorazioneFilter } from "@/lib/mezzi/mezzi-helpers";
import { prefetchMezziTagliandiQueries } from "@/lib/mezzi/prefetch-mezzi-tagliandi-queries";
import { useMezziListDerived } from "@/lib/mezzi/use-mezzi-list-derived";
import { mezzoTagliandiEnabled } from "@/lib/mezzi/mezzi-meta";
import {
  buildUltimaModificaByMezzoIdFromLogs,
  resolveMezzoUltimaModificaInfo,
  type MezzoUltimaModificaInfo,
} from "@/lib/mezzi/mezzo-ultima-modifica-info";
import { mezzoHaLavorazioneCollegataDb } from "@/lib/mezzi/interventi-from-lavorazioni-db";
import { logModificaRowToMezziHubLogEntry } from "@/lib/mezzi/mezzi-db-ui-adapter";
import type { MezzoGestito, MezziSortKey, MezziSortPhase } from "@/lib/mezzi/types";
import { dsPageToolbarCtaCompact } from "@/lib/ui/design-system";
import { useGestionaleListLayout } from "@/lib/ui/use-gestionale-list-layout";
import { LoadingCardSkeleton, LoadingErrorState, PageToolbar, PageToolbarCtaLabel, PageToolbarResultCount, SkeletonBoundary } from "@/components/design-system";
import { Q_FOCUS_MEZZO } from "@/lib/navigation/dashboard-log-links";
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import { useResponsiveListPageSize } from "@/lib/ui/use-responsive-list-page-size";
import type { MezzoFilters, MezzoUpdate } from "@/lib/domain/mezzi-entry";
import { mezziEntry, type MezzoDependencies } from "@/lib/domain/mezzi-entry";
import {
  useMezziListQuery,
} from "@/src/hooks/gestionale/use-entity-list-queries";
import { useUndoableLog } from "@/src/hooks/gestionale/use-undoable-log";
import { useLavorazioniReportSlice } from "@/lib/lavorazioni/use-lavorazioni-report-slice";
import { useMezzoRemoveMutation } from "@/src/hooks/gestionale/use-mezzo-remove-mutation";
import { useMezzoSetTagliandiMutation, useMezzoUpdateMutation } from "@/src/hooks/gestionale/use-mezzo-mutations";
import { GestionaleSectionGate } from "@/components/gestionale/gestionale-section-gate";
import { layoutPageRoot } from "@/lib/ui/responsive-layout-core";
import { useGestionaleConfirm } from "@/src/hooks/use-gestionale-confirm";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { usePermissions } from "@/src/hooks/use-permissions";
import { logEntry } from "@/lib/domain/log-entry";
import { auditPayload, pickExistingFields } from "@/lib/gestionale-log/undo";
import { withUndoSessionPayload } from "@/lib/gestionale-log/undo-session";
import { useAuth } from "@/context/auth-context";
import {
  collapsibleExpandedBoolPref,
  useCollapsiblePreference,
} from "@/lib/ui/collapsible-prefs";
import { READONLY_PERMISSION_HINT } from "@/src/lib/auth/permissions";

const MezziTagliandiPanel = dynamic(
  () =>
    import("@/components/gestionale/mezzi/mezzi-tagliandi-panel").then((m) => ({
      default: m.MezziTagliandiPanel,
    })),
  { ssr: false, loading: () => <LoadingCardSkeleton minHeightClass="min-h-[12rem]" /> },
);

const MezziNewModal = dynamic(
  () =>
    import("@/components/gestionale/mezzi/mezzi-new-modal").then((m) => ({
      default: m.MezziNewModal,
    })),
  { ssr: false },
);

const MezziHubDetailModal = dynamic(
  () =>
    import("@/components/gestionale/mezzi/mezzi-hub-detail-modal").then((m) => ({
      default: m.MezziHubDetailModal,
    })),
  { ssr: false },
);

const MezziFilterFields = dynamic(
  () =>
    import("@/components/gestionale/mezzi/mezzi-filters").then((m) => ({
      default: m.MezziFilterFields,
    })),
  { ssr: false },
);

const MezziEditModal = dynamic(
  () =>
    import("@/components/gestionale/mezzi/mezzi-edit-modal").then((m) => ({
      default: m.MezziEditModal,
    })),
  { ssr: false },
);

const MezziLogDrawer = dynamic(
  () =>
    import("@/components/gestionale/mezzi/mezzi-log-drawer").then((m) => ({
      default: m.MezziLogDrawer,
    })),
  { ssr: false },
);

const MEZZI_SEARCH_DEBOUNCE_MS = 300;

export function MezziView() {
  const queryClient = useQueryClient();
  const { containerRef: listLayoutRef, layout: listLayout, layoutClassName: listLayoutClassName } = useGestionaleListLayout({ tier: "xl" });
  const mezziPerm = usePermissions("mezzi");
  const { user } = useAuth();
  const canEditVehicles = mezziPerm.canWrite;
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [pageView, setPageView] = useState<MezziPageView>("anagrafica");
  const isAnagrafica = pageView === "anagrafica";

  const [search, setSearch] = useState("");
  const [searchApplied, setSearchApplied] = useState("");
  useEffect(() => {
    const t = window.setTimeout(() => setSearchApplied(search.trim()), MEZZI_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [search]);
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroUtilizzatore, setFiltroUtilizzatore] = useState("");
  const [filtroCantiere, setFiltroCantiere] = useState("");
  const [filtroTipoAttrezzatura, setFiltroTipoAttrezzatura] = useState("");
  const [filtroMarca, setFiltroMarca] = useState("");
  const [filtroModello, setFiltroModello] = useState("");
  const [filtroMatricola, setFiltroMatricola] = useState("");
  const [filtroTarga, setFiltroTarga] = useState("");
  const [filtroNumeroScuderia, setFiltroNumeroScuderia] = useState("");
  const [filtroMarcaTelaio, setFiltroMarcaTelaio] = useState("");
  const [filtroModelloTelaio, setFiltroModelloTelaio] = useState("");
  const [filtroTipoTelaio, setFiltroTipoTelaio] = useState("");
  const [filtroVin, setFiltroVin] = useState("");
  const [filtroTagliandi, setFiltroTagliandi] = useState<TagliandiFilter>("");
  const [filtroNumeroLav, setFiltroNumeroLav] = useState<NumeroLavorazioniFilter>("");
  const [filtroUltimaLav, setFiltroUltimaLav] = useState<UltimaLavorazioneFilter>("");
  const [logOpen, setLogOpen] = useState(false);
  const [hubMezzo, setHubMezzo] = useState<MezzoGestito | null>(null);
  const [hubInitialTab, setHubInitialTab] = useState<MezziHubTabId>("panoramica");
  const [nuovoOpen, setNuovoOpen] = useState(false);
  const [editMezzo, setEditMezzo] = useState<MezzoGestito | null>(null);
  const [eliminaConfirmMezzo, setEliminaConfirmMezzo] = useState<MezzoGestito | null>(null);
  const needsLavorazioniSlice = isAnagrafica || Boolean(hubMezzo) || Boolean(eliminaConfirmMezzo);
  const [filtriEspansi, setFiltriEspansi] = useCollapsiblePreference(
    collapsibleExpandedBoolPref(false, { scope: "mezzi", key: "filters", userId: user?.id ?? null }),
  );
  const importTriggerRef = useRef<HTMLDivElement>(null);

  const mezziFieldFilterState = useMemo(
    () => ({
      filtroCliente,
      filtroUtilizzatore,
      filtroCantiere,
      filtroTipoAttrezzatura,
      filtroMarca,
      filtroModello,
      filtroMatricola,
      filtroTarga,
      filtroNumeroScuderia,
      filtroMarcaTelaio,
      filtroModelloTelaio,
      filtroTipoTelaio,
      filtroVin,
      filtroTagliandi,
      filtroNumeroLav,
      filtroUltimaLav,
    }),
    [
      filtroCliente,
      filtroUtilizzatore,
      filtroCantiere,
      filtroTipoAttrezzatura,
      filtroMarca,
      filtroModello,
      filtroMatricola,
      filtroTarga,
      filtroNumeroScuderia,
      filtroMarcaTelaio,
      filtroModelloTelaio,
      filtroTipoTelaio,
      filtroVin,
      filtroTagliandi,
      filtroNumeroLav,
      filtroUltimaLav,
    ],
  );

  const serviceFilters = useMemo((): MezzoFilters => {
    return {
      search: searchApplied || undefined,
      cliente: filtroCliente.trim() || undefined,
      utilizzatore: filtroUtilizzatore.trim() || undefined,
      cantiere: filtroCantiere.trim() || undefined,
      tipo_attrezzatura: filtroTipoAttrezzatura.trim() || undefined,
      marca: filtroMarca.trim() || undefined,
      modello: filtroModello.trim() || undefined,
      matricola: filtroMatricola.trim() || undefined,
      targa: filtroTarga.trim() || undefined,
      numero_scuderia: filtroNumeroScuderia.trim() || undefined,
      marca_telaio: filtroMarcaTelaio.trim() || undefined,
      modello_telaio: filtroModelloTelaio.trim() || undefined,
      tipo_telaio: filtroTipoTelaio.trim() || undefined,
      vin: filtroVin.trim() || undefined,
      tagliandi: filtroTagliandi || undefined,
    };
  }, [
    searchApplied,
    filtroCliente,
    filtroUtilizzatore,
    filtroCantiere,
    filtroTipoAttrezzatura,
    filtroMarca,
    filtroModello,
    filtroMatricola,
    filtroTarga,
    filtroNumeroScuderia,
    filtroMarcaTelaio,
    filtroModelloTelaio,
    filtroTipoTelaio,
    filtroVin,
    filtroTagliandi,
  ]);

  const {
    data: mezzoRowsRaw,
    isLoading: mezziLoading,
    isError: mezziError,
    error: mezziErr,
    refetch: refetchMezzi,
  } = useMezziListQuery(undefined);
  const mezzoRows = mezzoRowsRaw ?? [];
  const mezziInitialLoading = mezziLoading && mezzoRowsRaw === undefined && !mezziError;

  const { data: lavRows = [] } = useLavorazioniReportSlice({
    mezziRows: mezzoRows,
    enabled: needsLavorazioniSlice,
  });

  const [sortColumn, setSortColumn] = useState<MezziSortKey | null>(null);
  const [sortPhase, setSortPhase] = useState<MezziSortPhase>("natural");

  const { sorted, interventiByMezzoId, inOfficina, mezziUi } = useMezziListDerived(
    mezzoRows,
    serviceFilters,
    lavRows,
    sortColumn,
    sortPhase,
    filtroUltimaLav,
    filtroNumeroLav,
    isAnagrafica,
  );

  const onSort = useCallback(
    (k: MezziSortKey) => {
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
    },
    [sortColumn, sortPhase],
  );

  const hasMezziFilters = search.trim().length > 0 || mezziFieldFiltersActive(mezziFieldFilterState);

  const listPageSize = useResponsiveListPageSize();
  const { page, setPage, pageCount, sliceItems, showPager, label, resetPage } = useClientPagination(sorted.length, listPageSize);
  const mezziFilterKey = `${search}|${JSON.stringify(mezziFieldFilterState)}|${sortColumn ?? ""}|${sortPhase}`;

  useEffect(() => {
    resetPage();
  }, [mezziFilterKey, listPageSize, resetPage]);

  const pagedSorted = useMemo(() => sliceItems(sorted), [sliceItems, sorted, page]);

  const openMezzoHub = useCallback((m: MezzoGestito, tab: MezziHubTabId = "panoramica") => {
    setHubInitialTab(tab);
    setHubMezzo(m);
  }, []);
  const { undoable: undoableMezziLog, logQuery } = useUndoableLog("mezzi", {
    enabled: isAnagrafica || logOpen,
  });
  const logEntriesUi = useMemo(
    () =>
      (logQuery.data ?? []).map((row) =>
        logModificaRowToMezziHubLogEntry(row, {
          currentUserId: user?.id ?? null,
          currentDisplayName: user?.nome ?? "",
        }),
      ),
    [logQuery.data, user?.id, user?.nome],
  );

  const ultimaModificaInfoByMezzoId = useMemo(() => {
    if (!isAnagrafica) return new Map<string, MezzoUltimaModificaInfo>();
    const fromLogs = buildUltimaModificaByMezzoIdFromLogs(logQuery.data ?? [], {
      currentUserId: user?.id ?? null,
      currentDisplayName: user?.nome ?? "",
    });
    const map = new Map<string, MezzoUltimaModificaInfo>();
    for (const m of mezziUi) {
      map.set(m.id, resolveMezzoUltimaModificaInfo(m, fromLogs));
    }
    return map;
  }, [isAnagrafica, mezziUi, logQuery.data, user?.id, user?.nome]);

  const {
    page: logPage,
    setPage: setLogPage,
    pageCount: logPageCount,
    sliceItems: sliceLogEntries,
    showPager: showLogPager,
    label: logPagerLabel,
    resetPage: resetLogPage,
  } = useClientPagination(logEntriesUi.length, listPageSize);

  useEffect(() => {
    resetLogPage();
  }, [logOpen, logEntriesUi.length, listPageSize, resetLogPage]);

  const pagedLogEntries = useMemo(() => sliceLogEntries(logEntriesUi), [logEntriesUi, sliceLogEntries, logPage]);

  const [flashRowId, setFlashRowId] = useState<string | null>(null);
  const flashClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tagliandiPendingId, setTagliandiPendingId] = useState<string | null>(null);

  const updateMut = useMezzoUpdateMutation();
  const tagliandiMut = useMezzoSetTagliandiMutation();
  const removeMut = useMezzoRemoveMutation();
  const { success: toastSuccess, error: toastError, validation: toastValidation, successOnce, errorOnce } =
    useGestionaleToast();
  const { confirm, confirmDialog } = useGestionaleConfirm();

  const [eliminaDeps, setEliminaDeps] = useState<MezzoDependencies | null>(null);
  const [loadingEliminaDeps, setLoadingEliminaDeps] = useState(false);

  const flashRow = useCallback((id: string) => {
    if (flashClearRef.current) clearTimeout(flashClearRef.current);
    setFlashRowId(id);
    flashClearRef.current = setTimeout(() => {
      setFlashRowId(null);
      flashClearRef.current = null;
    }, 820);
  }, []);

  const handleTagliandiChange = useCallback(
    async (m: MezzoGestito, enabled: boolean) => {
      if (!canEditVehicles || m.hubSynthetic) return;
      if (mezzoTagliandiEnabled(m) === enabled) return;
      setTagliandiPendingId(m.id);
      try {
        await tagliandiMut.mutateAsync({ id: m.id, enabled });
        setHubMezzo((prev) =>
          prev?.id === m.id ? { ...prev, tagliandi: enabled ? true : undefined } : prev,
        );
        flashRow(m.id);
        toastSuccess(
          enabled
            ? "Mezzo incluso nella matrice tagliandi."
            : "Mezzo escluso dalla matrice tagliandi. Le registrazioni già inserite restano in archivio.",
        );
      } catch {
        toastError("Aggiornamento tagliandi non riuscito.", { entity: "mezzo", action: "update" });
      } finally {
        setTagliandiPendingId(null);
      }
    },
    [canEditVehicles, flashRow, tagliandiMut, toastError, toastSuccess],
  );

  const focusMezzoInTable = useCallback(
    (id: string) => {
      setHubMezzo(null);
      setEditMezzo(null);
      setNuovoOpen(false);
      setFiltroCliente("");
      setFiltroUtilizzatore("");
      setFiltroCantiere("");
      setFiltroTipoAttrezzatura("");
      setFiltroMarca("");
      setFiltroModello("");
      setFiltroMatricola("");
      setFiltroTarga("");
      setFiltroNumeroScuderia("");
      setFiltroMarcaTelaio("");
      setFiltroModelloTelaio("");
      setFiltroTipoTelaio("");
      setFiltroVin("");
      setFiltroTagliandi("");
      setFiltroNumeroLav("");
      setFiltroUltimaLav("");
      setSearch("");
      setFiltriEspansi(false);
      setLogOpen(false);
      flashRow(id);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document.getElementById(`mezzo-row-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
      });
    },
    [flashRow],
  );

  function resetMezziToolbarFilters() {
    setSearch("");
    setFiltroCliente("");
    setFiltroUtilizzatore("");
    setFiltroCantiere("");
    setFiltroTipoAttrezzatura("");
    setFiltroMarca("");
    setFiltroModello("");
    setFiltroMatricola("");
    setFiltroTarga("");
    setFiltroNumeroScuderia("");
    setFiltroMarcaTelaio("");
    setFiltroModelloTelaio("");
    setFiltroTipoTelaio("");
    setFiltroVin("");
    setFiltroTagliandi("");
    setFiltroNumeroLav("");
    setFiltroUltimaLav("");
    setFiltriEspansi(false);
  }

  function closeEliminaConfirm() {
    if (removeMut.isPending) return;
    setEliminaConfirmMezzo(null);
    setEliminaDeps(null);
    setLoadingEliminaDeps(false);
  }

  function handleDeleteMezzo(m: MezzoGestito) {
    if (!canEditVehicles || m.hubSynthetic) return;
    setEliminaConfirmMezzo(m);
    setEliminaDeps(null);
    setLoadingEliminaDeps(true);
  }

  useEffect(() => {
    const mezzo = eliminaConfirmMezzo;
    if (!mezzo) return;
    let cancelled = false;
    void (async () => {
      const res = await mezziEntry.countDependencies(mezzo.id);
      if (cancelled) return;
      setLoadingEliminaDeps(false);
      if (res.success && res.data) {
        setEliminaDeps(res.data);
        return;
      }
      toastError(res.error ?? "Verifica collegamenti non riuscita.", { entity: "mezzo", action: "delete" });
      setEliminaConfirmMezzo(null);
      setEliminaDeps(null);
      setLoadingEliminaDeps(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [eliminaConfirmMezzo, toastError]);

  function confirmEliminaMezzo() {
    const mezzo = eliminaConfirmMezzo;
    if (!mezzo || !canEditVehicles) return;
    removeMut.mutate(mezzo.id, {
      onSuccess: () => {
        successOnce("mezzo-delete", "Mezzo eliminato.");
        closeEliminaConfirm();
        setHubMezzo(null);
        setEditMezzo(null);
      },
      onError: (err) => {
        toastError(err, { entity: "mezzo", action: "delete" });
      },
    });
  }

  useEffect(() => {
    if (pageView !== "tagliandi") return;
    void prefetchMezziTagliandiQueries(queryClient);
  }, [pageView, queryClient]);

  useEffect(() => {
    return () => {
      if (flashClearRef.current) clearTimeout(flashClearRef.current);
    };
  }, []);

  const scrollLockActive = Boolean(hubMezzo || nuovoOpen || editMezzo || logOpen);
  const anyOverlay = scrollLockActive || Boolean(eliminaConfirmMezzo);
  useEffect(() => {
    const id = searchParams.get(Q_FOCUS_MEZZO)?.trim();
    if (!id) return;
    const t = window.setTimeout(() => {
      focusMezzoInTable(id);
      deferredRouterReplace(router, pathname, { scroll: false });
    }, 100);
    return () => window.clearTimeout(t);
  }, [searchParams, pathname, router, focusMezzoInTable]);

  useEffect(() => {
    if (!anyOverlay) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setHubMezzo(null);
      setNuovoOpen(false);
      setEditMezzo(null);
      setLogOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [anyOverlay]);

  async function undoUltimoMezzo() {
    if (!canEditVehicles || !undoableMezziLog) return;
    const payload = auditPayload(undoableMezziLog);
    const before = payload.before;
    if (!before) return;
    const ok = await confirm({
      title: "Annullare l'ultima modifica?",
      message: "Verrà ripristinato l'ultimo cambiamento reversibile sui mezzi.",
      confirmLabel: "Annulla modifica",
      destructive: true,
    });
    if (!ok) return;
    const data = pickExistingFields<MezzoUpdate>(before, [
      "cliente",
      "utilizzatore",
      "marca",
      "modello",
      "targa",
      "matricola",
      "numero_scuderia",
      "tipo_attrezzatura",
      "anno",
      "meta",
    ]);
    try {
      await updateMut.mutateAsync({ id: undoableMezziLog.entita_id, data });
      const generatedUpdate = await logEntry.getByEntita("mezzi", undoableMezziLog.entita_id, 5);
      const rollbackUpdateLog = generatedUpdate.success
        ? generatedUpdate.data?.find((row) => row.id !== undoableMezziLog.id && row.azione === "UPDATE")
        : null;
      const undoLog = await logEntry.create({
        entita: "mezzi",
        entita_id: undoableMezziLog.entita_id,
        azione: "UNDO",
        autore_id: user?.id ?? null,
        payload: withUndoSessionPayload({
          reverted_log_id: undoableMezziLog.id,
          before: payload.after ?? null,
          after: before,
        }),
      });
      if (rollbackUpdateLog) {
        await logEntry.markReverted(rollbackUpdateLog.id, {
          undo_log_id: undoLog.success ? undoLog.data?.id : null,
          reverted_by: user?.id ?? null,
          pageKey: "mezzi",
        });
      }
      await logEntry.markReverted(undoableMezziLog.id, {
        undo_log_id: undoLog.success ? undoLog.data?.id : null,
        reverted_by: user?.id ?? null,
        pageKey: "mezzi",
      });
      await logQuery.refetch();
      flashRow(undoableMezziLog.entita_id);
    } catch (e) {
      toastError(e, { entity: "mezzo", action: "update" });
    }
  }

  const mezziPageMenuItems = useMemo((): PageActionItem[] => {
    if (!isAnagrafica) return [pageActionLogItem(() => setLogOpen(true), "Log attività")];
    return [
      {
        id: "import",
        label: "Importa",
        description: "Importa mezzi da file Excel",
        onSelect: () => clickPageActionHiddenTrigger(importTriggerRef.current),
        module: "mezzi",
        requireWrite: true,
      },
      pageActionUndoItem({
        canUndo: Boolean(undoableMezziLog),
        undoDisabled: !canEditVehicles,
        undoPending: updateMut.isPending,
        onUndo: () => void undoUltimoMezzo(),
      }),
      pageActionLogItem(() => setLogOpen(true), "Log attività"),
    ];
  }, [isAnagrafica, canEditVehicles, undoableMezziLog, updateMut.isPending]);

  return (
    <GestionaleSectionGate module="mezzi">
    <div ref={importTriggerRef} className="sr-only" aria-hidden>
      <ModuleImportEntry entity="mezzi" module="mezzi" onCompleted={() => void refetchMezzi()} />
    </div>
    <div ref={listLayoutRef} className={`${layoutPageRoot} ${listLayoutClassName}`.trim()}>
    <>
      <PageHeaderPageActionMenu
        items={mezziPageMenuItems}
        onRefresh={() => void refetchMezzi()}
      />
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <MezziPageViewToggle value={pageView} onChange={setPageView} />
      </div>
        <ShellCard>
          {pageView === "anagrafica" ? (
            <>
          <PageToolbar
            testId="page-ready-toolbar"
            className="sm:mx-0"
            primaryAction={
              <Tooltip content={canEditVehicles ? "Registra un nuovo mezzo in anagrafica" : READONLY_PERMISSION_HINT}>
                <button
                  type="button"
                  onClick={() => {
                    if (!canEditVehicles) return;
                    setNuovoOpen(true);
                  }}
                  className={dsPageToolbarCtaCompact}
                  disabled={!canEditVehicles}
                >
                  <PageToolbarCtaLabel short="+ Nuovo" full="+ Nuovo mezzo" />
                </button>
              </Tooltip>
            }
            search={
              <MezziSearchBar search={search} onSearch={setSearch} wrapperClassName="min-w-0 w-full" />
            }
            filtersExpanded={filtriEspansi}
            onFiltersToggle={() => setFiltriEspansi((o) => !o)}
            filtersActive={hasMezziFilters}
            filtersPanel={
              filtriEspansi ? (
              <MezziFilterFields
                embedded
                filtroCliente={filtroCliente}
                onFiltroCliente={setFiltroCliente}
                filtroUtilizzatore={filtroUtilizzatore}
                onFiltroUtilizzatore={setFiltroUtilizzatore}
                filtroCantiere={filtroCantiere}
                onFiltroCantiere={setFiltroCantiere}
                filtroTipoAttrezzatura={filtroTipoAttrezzatura}
                onFiltroTipoAttrezzatura={setFiltroTipoAttrezzatura}
                filtroMarca={filtroMarca}
                onFiltroMarca={setFiltroMarca}
                filtroModello={filtroModello}
                onFiltroModello={setFiltroModello}
                filtroMatricola={filtroMatricola}
                onFiltroMatricola={setFiltroMatricola}
                filtroTarga={filtroTarga}
                onFiltroTarga={setFiltroTarga}
                filtroNumeroScuderia={filtroNumeroScuderia}
                onFiltroNumeroScuderia={setFiltroNumeroScuderia}
                filtroMarcaTelaio={filtroMarcaTelaio}
                onFiltroMarcaTelaio={setFiltroMarcaTelaio}
                filtroModelloTelaio={filtroModelloTelaio}
                onFiltroModelloTelaio={setFiltroModelloTelaio}
                filtroTipoTelaio={filtroTipoTelaio}
                onFiltroTipoTelaio={setFiltroTipoTelaio}
                filtroVin={filtroVin}
                onFiltroVin={setFiltroVin}
                filtroTagliandi={filtroTagliandi}
                onFiltroTagliandi={setFiltroTagliandi}
                filtroNumeroLav={filtroNumeroLav}
                onFiltroNumeroLav={setFiltroNumeroLav}
                filtroUltimaLav={filtroUltimaLav}
                onFiltroUltimaLav={setFiltroUltimaLav}
              />
              ) : null
            }
            onFilterReset={resetMezziToolbarFilters}
            meta={
              <PageToolbarResultCount
                count={sorted.length}
                filtersActive={mezziFieldFiltersActive(mezziFieldFilterState)}
                searchActive={search.trim().length > 0}
                onSearchReset={() => setSearch("")}
                onFilterReset={resetMezziToolbarFilters}
              />
            }
          />

          {mezziError ? (
            <LoadingErrorState
              title="Impossibile caricare i mezzi"
              description={mezziErr?.message ?? "Errore caricamento mezzi."}
              onRetry={() => void refetchMezzi()}
              className="mt-4"
            />
          ) : null}

          <SkeletonBoundary loading={mezziInitialLoading}>
          <MezziTableSection mode="content" className="mt-4">
              <MezziTable
                listLayout={listLayout}
                rows={pagedSorted}
                interventiByMezzoId={interventiByMezzoId}
                ultimaModificaInfoByMezzoId={ultimaModificaInfoByMezzoId}
                inOfficina={inOfficina}
                sortColumn={sortColumn}
                sortPhase={sortPhase}
                onSort={onSort}
                flashRowId={flashRowId}
                onHub={openMezzoHub}
                canEditTagliandi={canEditVehicles}
                tagliandiPendingId={tagliandiPendingId}
                onTagliandiChange={handleTagliandiChange}
              />
          </MezziTableSection>
          </SkeletonBoundary>
          {showPager ? (
            <TablePagination page={page} pageCount={pageCount} onPageChange={setPage} label={label} />
          ) : null}
            </>
          ) : pageView === "tagliandi" ? (
            <MezziTagliandiPanel canEdit={canEditVehicles} />
          ) : null}
        </ShellCard>

      {hubMezzo ? (
        <MezziHubDetailModal
          mezzo={hubMezzo}
          initialTab={hubInitialTab}
          onClose={() => {
            setHubMezzo(null);
            setHubInitialTab("panoramica");
          }}
          onEdit={() => {
            if (!canEditVehicles) return;
            const h = hubMezzo;
            setHubMezzo(null);
            setEditMezzo(h);
          }}
          canEdit={canEditVehicles}
          onDelete={canEditVehicles ? () => handleDeleteMezzo(hubMezzo) : undefined}
        />
      ) : null}

      <MezzoEliminaConfirmDialog
        open={eliminaConfirmMezzo != null}
        mezzo={eliminaConfirmMezzo}
        deps={eliminaDeps}
        identityLinkedLavorazione={
          eliminaConfirmMezzo != null ? mezzoHaLavorazioneCollegataDb(eliminaConfirmMezzo, lavRows) : false
        }
        loadingDeps={loadingEliminaDeps}
        pending={removeMut.isPending}
        onCancel={closeEliminaConfirm}
        onConfirm={confirmEliminaMezzo}
      />

      <MezziLogDrawer
        open={logOpen}
        onClose={() => setLogOpen(false)}
        loading={logQuery.isLoading}
        entries={logEntriesUi}
        pagedEntries={pagedLogEntries}
        showPager={showLogPager}
        page={logPage}
        pageCount={logPageCount}
        pagerLabel={logPagerLabel}
        onPageChange={setLogPage}
      />

      {nuovoOpen ? (
        <MezziNewModal
          canEdit={canEditVehicles}
          onClose={() => setNuovoOpen(false)}
          onCreated={(row) => {
            setNuovoOpen(false);
            flashRow(row.id);
          }}
          onValidationError={(message) => toastValidation(message)}
          onSaveError={(err) => toastError(err, { entity: "mezzo", action: "create" })}
        />
      ) : null}

      {editMezzo ? (
        <MezziEditModal
          mezzo={editMezzo}
          canEdit={canEditVehicles}
          onClose={() => setEditMezzo(null)}
          onSaved={(id) => {
            setEditMezzo(null);
            setHubMezzo(null);
            flashRow(id);
          }}
          onValidationError={(message) => toastValidation(message)}
          onSaveError={(err) => toastError(err, { entity: "mezzo", action: "create" })}
        />
      ) : null}
      {confirmDialog}
    </>
    </div>
    </GestionaleSectionGate>
  );
}