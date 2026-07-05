"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MezziEditModal } from "@/components/gestionale/mezzi/mezzi-edit-modal";
import { MezziNewModal } from "@/components/gestionale/mezzi/mezzi-new-modal";
import { PageHeader } from "@/components/gestionale/page-header";
import { GestionalePageToolbarActions } from "@/components/gestionale/page-header-toolbar";
import { ModuleImportEntry } from "@/components/data-import/module-import-entry";
import { ShellCard } from "@/components/gestionale/shell-card";
import { MezziSearchBar, MezziFilterFields } from "@/components/gestionale/mezzi/mezzi-filters";
import { MezziHubDetailModal } from "@/components/gestionale/mezzi/mezzi-hub-detail-modal";
import { MezzoEliminaConfirmDialog } from "@/components/gestionale/mezzi/mezzo-elimina-confirm-dialog";
import { MezziTable } from "@/components/gestionale/mezzi/mezzi-table";
import { TablePagination } from "@/components/gestionale/table-pagination";
import { erpBtnAccent, erpBtnNeutral, erpBtnNuovaLavorazione } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { compareMezzi, mezzoMatchesUltimaLavFilter, type UltimaLavorazioneFilter } from "@/lib/mezzi/mezzi-helpers";
import {
  buildUltimaModificaByMezzoIdFromLogs,
  resolveMezzoUltimaModificaInfo,
  type MezzoUltimaModificaInfo,
} from "@/lib/mezzi/mezzo-ultima-modifica-info";
import { interventiMezzoDaLavorazioniDb, mezzoHaLavorazioneAttivaDb, mezzoHaLavorazioneCollegataDb } from "@/lib/mezzi/interventi-from-lavorazioni-db";
import { logModificaRowToMezziHubLogEntry } from "@/lib/mezzi/mezzi-db-ui-adapter";
import type { MezzoGestito, MezzoInterventoLavorazione, MezziSortKey, MezziSortPhase } from "@/lib/mezzi/types";
import { dsPageToolbarCtaCompact, dsStackPage } from "@/lib/ui/design-system";
import { useGestionaleListLayout } from "@/lib/ui/use-gestionale-list-layout";
import { Drawer, LoadingErrorState, LoadingFormSkeleton, LoadingMezziListSkeleton, PageToolbar, PageToolbarCtaLabel, PageToolbarResultCount } from "@/components/design-system";
import {
  GestionaleLogEmpty,
  GestionaleLogEntryFourLines,
  GestionaleLogList,
  buildMezziGestionaleLogViewModel,
  gestionaleLogDrawerPanelClass,
  gestionaleLogScrollEmbeddedClass,
} from "@/components/gestionale/gestionale-log-ui";
import { Q_FOCUS_MEZZO } from "@/lib/navigation/dashboard-log-links";
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import { useResponsiveListPageSize } from "@/lib/ui/use-responsive-list-page-size";
import type { MezzoFilters, MezzoUpdate } from "@/src/services/mezzi.service";
import { mezziService, type MezzoDependencies } from "@/src/services/mezzi.service";
import {
  useMezziListQuery,
} from "@/src/hooks/gestionale/use-entity-list-queries";
import { useUndoableLog } from "@/src/hooks/gestionale/use-undoable-log";
import { useLavorazioniReportSlice } from "@/lib/lavorazioni/use-lavorazioni-report-slice";
import { useMezzoRemoveMutation } from "@/src/hooks/gestionale/use-mezzo-remove-mutation";
import { useMezzoUpdateMutation } from "@/src/hooks/gestionale/use-mezzo-mutations";
import { GestionaleSectionGate } from "@/components/gestionale/gestionale-section-gate";
import { layoutPageRoot } from "@/lib/ui/responsive-layout-core";
import { useGestionaleConfirm } from "@/src/hooks/use-gestionale-confirm";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { usePermissions } from "@/src/hooks/use-permissions";
import { logService } from "@/src/services/log.service";
import { auditPayload, pickExistingFields } from "@/lib/gestionale-log/undo";
import { withUndoSessionPayload } from "@/lib/gestionale-log/undo-session";
import { useAuth } from "@/context/auth-context";
import { READONLY_PERMISSION_HINT } from "@/src/lib/auth/permissions";

function naturalMezziOrder(a: MezzoGestito, b: MezzoGestito) {
  return a.id.localeCompare(b.id, "en");
}

export function MezziView() {
  const { containerRef: listLayoutRef, layout: listLayout, layoutClassName: listLayoutClassName } = useGestionaleListLayout({ tier: "xl" });
  const mezziPerm = usePermissions("mezzi");
  const { user } = useAuth();
  const canEditVehicles = mezziPerm.canWrite;
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [search, setSearch] = useState("");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroMarca, setFiltroMarca] = useState("");
  const [filtroModello, setFiltroModello] = useState("");
  const [filtroTarga, setFiltroTarga] = useState("");
  const [filtroNumeroScuderia, setFiltroNumeroScuderia] = useState("");
  const [filtroUltimaLav, setFiltroUltimaLav] = useState<UltimaLavorazioneFilter>("");
  const [filtriEspansi, setFiltriEspansi] = useState(false);

  const serviceFilters = useMemo((): MezzoFilters => {
    return {
      search: search.trim() || undefined,
      cliente: filtroCliente.trim() || undefined,
      marca: filtroMarca.trim() || undefined,
      modello: filtroModello.trim() || undefined,
      targa: filtroTarga.trim() || undefined,
      numero_scuderia: filtroNumeroScuderia.trim() || undefined,
    };
  }, [search, filtroCliente, filtroMarca, filtroModello, filtroTarga, filtroNumeroScuderia]);

  const {
    data: mezzoRowsRaw,
    isLoading: mezziLoading,
    isError: mezziError,
    error: mezziErr,
    refetch: refetchMezzi,
  } = useMezziListQuery(serviceFilters);
  const mezzoRows = mezzoRowsRaw ?? [];
  const mezziInitialLoading = mezziLoading && mezzoRowsRaw === undefined && !mezziError;

  const { data: lavRows = [] } = useLavorazioniReportSlice({ mezziRows: mezzoRows });
  const mezziUi = mezzoRows;

  const interventiByMezzoId = useMemo(() => {
    const map = new Map<string, MezzoInterventoLavorazione[]>();
    for (const m of mezziUi) {
      map.set(m.id, interventiMezzoDaLavorazioniDb(m, lavRows));
    }
    return map;
  }, [mezziUi, lavRows]);

  const inOfficina = useCallback((m: MezzoGestito) => mezzoHaLavorazioneAttivaDb(m, lavRows), [lavRows]);

  const [sortColumn, setSortColumn] = useState<MezziSortKey | null>(null);
  const [sortPhase, setSortPhase] = useState<MezziSortPhase>("natural");

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

  const filteredMezzi = useMemo(() => {
    if (!filtroUltimaLav) return mezziUi;
    return mezziUi.filter((m) =>
      mezzoMatchesUltimaLavFilter(interventiByMezzoId.get(m.id) ?? [], filtroUltimaLav),
    );
  }, [mezziUi, interventiByMezzoId, filtroUltimaLav]);

  const sorted = useMemo(() => {
    const rows = [...filteredMezzi];
    rows.sort((a, b) =>
      compareMezzi(
        a,
        b,
        sortColumn,
        sortPhase,
        naturalMezziOrder,
        (m) => interventiByMezzoId.get(m.id)?.[0]?.dataIngresso ?? "",
        (m) => interventiByMezzoId.get(m.id)?.length ?? 0,
      ),
    );
    return rows;
  }, [filteredMezzi, interventiByMezzoId, sortColumn, sortPhase]);

  const hasMezziFilters =
    search.trim().length > 0 ||
    filtroCliente.trim().length > 0 ||
    filtroMarca.trim().length > 0 ||
    filtroModello.trim().length > 0 ||
    filtroTarga.trim().length > 0 ||
    filtroNumeroScuderia.trim().length > 0 ||
    Boolean(filtroUltimaLav);

  const listPageSize = useResponsiveListPageSize();
  const { page, setPage, pageCount, sliceItems, showPager, label, resetPage } = useClientPagination(sorted.length, listPageSize);
  const mezziFilterKey = `${search}|${filtroCliente}|${filtroMarca}|${filtroModello}|${filtroTarga}|${filtroNumeroScuderia}|${filtroUltimaLav}|${sortColumn ?? ""}|${sortPhase}`;

  useEffect(() => {
    resetPage();
  }, [mezziFilterKey, listPageSize, resetPage]);

  const pagedSorted = useMemo(() => sliceItems(sorted), [sliceItems, sorted, page]);

  const [hubMezzo, setHubMezzo] = useState<MezzoGestito | null>(null);
  const [nuovoOpen, setNuovoOpen] = useState(false);
  const [editMezzo, setEditMezzo] = useState<MezzoGestito | null>(null);

  const [logOpen, setLogOpen] = useState(false);
  const { undoable: undoableMezziLog, logQuery } = useUndoableLog("mezzi");
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
    const fromLogs = buildUltimaModificaByMezzoIdFromLogs(logQuery.data ?? [], {
      currentUserId: user?.id ?? null,
      currentDisplayName: user?.nome ?? "",
    });
    const map = new Map<string, MezzoUltimaModificaInfo>();
    for (const m of mezziUi) {
      map.set(m.id, resolveMezzoUltimaModificaInfo(m, fromLogs));
    }
    return map;
  }, [mezziUi, logQuery.data, user?.id, user?.nome]);

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

  const updateMut = useMezzoUpdateMutation();
  const removeMut = useMezzoRemoveMutation();
  const { success: toastSuccess, error: toastError, validation: toastValidation, successOnce, errorOnce } =
    useGestionaleToast();
  const { confirm, confirmDialog } = useGestionaleConfirm();

  const [eliminaConfirmMezzo, setEliminaConfirmMezzo] = useState<MezzoGestito | null>(null);
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

  const focusMezzoInTable = useCallback(
    (id: string) => {
      setHubMezzo(null);
      setEditMezzo(null);
      setNuovoOpen(false);
      setFiltroCliente("");
      setFiltroMarca("");
      setFiltroModello("");
      setFiltroTarga("");
      setFiltroNumeroScuderia("");
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
    setFiltroMarca("");
    setFiltroModello("");
    setFiltroTarga("");
    setFiltroNumeroScuderia("");
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
      const res = await mezziService.countDependencies(mezzo.id);
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
      router.replace(pathname, { scroll: false });
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
      const generatedUpdate = await logService.getByEntita("mezzi", undoableMezziLog.entita_id, 5);
      const rollbackUpdateLog = generatedUpdate.success
        ? generatedUpdate.data?.find((row) => row.id !== undoableMezziLog.id && row.azione === "UPDATE")
        : null;
      const undoLog = await logService.create({
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
        await logService.markReverted(rollbackUpdateLog.id, {
          undo_log_id: undoLog.success ? undoLog.data?.id : null,
          reverted_by: user?.id ?? null,
          pageKey: "mezzi",
        });
      }
      await logService.markReverted(undoableMezziLog.id, {
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

  return (
    <GestionaleSectionGate module="mezzi">
    <div ref={listLayoutRef} className={`${layoutPageRoot} ${listLayoutClassName}`.trim()}>
    <>
      <PageHeader
        title="Mezzi"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ModuleImportEntry entity="mezzi" module="mezzi" onCompleted={() => void refetchMezzi()} />
            <GestionalePageToolbarActions
            canUndo={Boolean(undoableMezziLog)}
            undoDisabled={!canEditVehicles}
            undoPending={updateMut.isPending}
            onUndo={() => void undoUltimoMezzo()}
            onOpenLog={() => setLogOpen(true)}
            logTitle="Storico modifiche anagrafica mezzi"
          />
          </div>
        }
      />

      <div className={dsStackPage}>
        <ShellCard>
          <PageToolbar
            className="sm:mx-0"
            primaryAction={
              <button
                type="button"
                onClick={() => {
                  if (!canEditVehicles) return;
                  setNuovoOpen(true);
                }}
                className={dsPageToolbarCtaCompact}
                disabled={!canEditVehicles}
                title={canEditVehicles ? "Registra un nuovo mezzo in anagrafica" : READONLY_PERMISSION_HINT}
              >
                <PageToolbarCtaLabel short="+ Nuovo" full="+ Nuovo mezzo" />
              </button>
            }
            search={
              <MezziSearchBar search={search} onSearch={setSearch} wrapperClassName="min-w-0 flex-1 sm:min-w-[12rem]" />
            }
            filtersExpanded={filtriEspansi}
            onFiltersToggle={() => setFiltriEspansi((o) => !o)}
            filtersActive={hasMezziFilters}
            filtersPanel={
              <MezziFilterFields
                embedded
                filtroCliente={filtroCliente}
                onFiltroCliente={setFiltroCliente}
                filtroMarca={filtroMarca}
                onFiltroMarca={setFiltroMarca}
                filtroModello={filtroModello}
                onFiltroModello={setFiltroModello}
                filtroTarga={filtroTarga}
                onFiltroTarga={setFiltroTarga}
                filtroNumeroScuderia={filtroNumeroScuderia}
                onFiltroNumeroScuderia={setFiltroNumeroScuderia}
                filtroUltimaLav={filtroUltimaLav}
                onFiltroUltimaLav={setFiltroUltimaLav}
              />
            }
            onFilterReset={resetMezziToolbarFilters}
            meta={
              <PageToolbarResultCount
                count={sorted.length}
                filtersActive={
                  filtroCliente.trim().length > 0 ||
                  filtroMarca.trim().length > 0 ||
                  filtroModello.trim().length > 0 ||
                  filtroTarga.trim().length > 0 ||
                  filtroNumeroScuderia.trim().length > 0 ||
                  Boolean(filtroUltimaLav)
                }
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

          <div className="mt-4">
            {mezziInitialLoading ? (
              <LoadingMezziListSkeleton withToolbar={false} />
            ) : (
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
                onHub={setHubMezzo}
              />
            )}
          </div>
          {showPager ? (
            <TablePagination page={page} pageCount={pageCount} onPageChange={setPage} label={label} />
          ) : null}
        </ShellCard>
      </div>

      {hubMezzo ? (
        <MezziHubDetailModal
          mezzo={hubMezzo}
          onClose={() => setHubMezzo(null)}
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

      <Drawer open={logOpen} onClose={() => setLogOpen(false)} title="Log modifiche" ariaLabel="Log modifiche mezzi">
        <div className={gestionaleLogDrawerPanelClass}>
              <div className={`${gestionaleLogScrollEmbeddedClass} min-h-0 min-w-0 flex-1`}>
                {logQuery.isLoading ? (
                  <LoadingFormSkeleton fields={2} className="px-1 py-2" />
                ) : logEntriesUi.length === 0 ? (
                  <GestionaleLogEmpty message="Nessuna modifica registrata su Supabase." />
                ) : (
                  <GestionaleLogList>
                    {pagedLogEntries.map((e) => {
                      const vm = buildMezziGestionaleLogViewModel({
                        tipo: e.tipo,
                        mezzo: e.mezzo,
                        riepilogo: e.riepilogo,
                        autore: e.autore,
                        at: e.at,
                        changes: e.changes,
                      });
                      return (
                        <li key={e.id}>
                          <GestionaleLogEntryFourLines vm={vm} />
                        </li>
                      );
                    })}
                  </GestionaleLogList>
                )}
              </div>
          {showLogPager ? (
            <TablePagination page={logPage} pageCount={logPageCount} onPageChange={setLogPage} label={logPagerLabel} />
          ) : null}
        </div>
      </Drawer>

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