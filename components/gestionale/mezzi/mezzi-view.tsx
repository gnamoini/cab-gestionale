"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { gestionaleFormFocusScopeProps } from "@/components/gestionale/gestionale-form-focus-scope";
import { PageHeader } from "@/components/gestionale/page-header";
import { GestionalePageToolbarActions } from "@/components/gestionale/page-header-toolbar";
import { ShellCard } from "@/components/gestionale/shell-card";
import {
  GlobalHierarchyMarcaSelect,
  GlobalHierarchyModelloSelect,
  GlobalSettingsListSelect,
} from "@/components/gestionale/global-input";
import { MezziSearchBar, MezziFilterFields } from "@/components/gestionale/mezzi/mezzi-filters";
import { MezziHubDetailModal } from "@/components/gestionale/mezzi/mezzi-hub-detail-modal";
import { MezzoEliminaConfirmDialog } from "@/components/gestionale/mezzi/mezzo-elimina-confirm-dialog";
import { MezziTable } from "@/components/gestionale/mezzi/mezzi-table";
import { TablePagination } from "@/components/gestionale/table-pagination";
import { erpBtnAccent, erpBtnNeutral, erpBtnNuovaLavorazione } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { modelliVisibiliPerMarca } from "@/lib/mezzi/attrezzature-prefs";
import { marcheFromHierarchyTree, modelliVisibiliPerMarcaHierarchy } from "@/lib/mezzi/hierarchy-list-prefs";
import { mezzoFormToMeta, metaToMezzoFormFields } from "@/lib/mezzi/mezzi-meta";
import { compareMezzi, mezzoMatchesUltimaLavFilter, type UltimaLavorazioneFilter } from "@/lib/mezzi/mezzi-helpers";
import { interventiMezzoDaLavorazioniDb, mezzoHaLavorazioneAttivaDb, mezzoHaLavorazioneCollegataDb } from "@/lib/mezzi/interventi-from-lavorazioni-db";
import { logModificaRowToMezziHubLogEntry, toMezzoUI } from "@/lib/mezzi/mezzi-db-ui-adapter";
import type { MezzoGestito, MezzoInterventoLavorazione, MezziSortKey, MezziSortPhase } from "@/lib/mezzi/types";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { gestionaleModalBodyFlexClass } from "@/lib/ui/modal-max-width-class";
import { dsInput, dsPageToolbarBtn, dsPageToolbarCtaCompact, dsStackPage } from "@/lib/ui/design-system";
import { Drawer, LoadingButton, LoadingErrorState, LoadingFormSkeleton, LoadingTableSkeleton, PageToolbar, PageToolbarCtaLabel, PageToolbarResultCount } from "@/components/design-system";
import {
  GestionaleLogChangeList,
  GestionaleLogEmpty,
  GestionaleLogEntryFourLines,
  GestionaleLogList,
  buildMezziGestionaleLogViewModel,
  gestionaleLogScrollEmbeddedClass,
} from "@/components/gestionale/gestionale-log-ui";
import { Q_FOCUS_MEZZO } from "@/lib/navigation/dashboard-log-links";
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import { useResponsiveListPageSize } from "@/lib/ui/use-responsive-list-page-size";
import type { MezzoFilters, MezzoInsert, MezzoUpdate } from "@/src/services/mezzi.service";
import { mezziService, type MezzoDependencies } from "@/src/services/mezzi.service";
import {
  useMezziListQuery,
} from "@/src/hooks/gestionale/use-entity-list-queries";
import { useUndoableLog } from "@/src/hooks/gestionale/use-undoable-log";
import { useLavorazioniList } from "@/src/services/domain/lavorazioni-domain.queries";
import { useMezzoCreateMutation, useMezzoUpdateMutation } from "@/src/hooks/gestionale/use-mezzo-mutations";
import { useMezzoRemoveMutation } from "@/src/hooks/gestionale/use-mezzo-remove-mutation";
import { GestionaleSectionGate } from "@/components/gestionale/gestionale-section-gate";
import { layoutPageRoot } from "@/lib/ui/responsive-layout-core";
import { useGestionaleConfirm } from "@/src/hooks/use-gestionale-confirm";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import { usePermissions } from "@/src/hooks/use-permissions";
import { logService } from "@/src/services/log.service";
import { auditPayload, pickExistingFields } from "@/lib/gestionale-log/undo";
import { withUndoSessionPayload } from "@/lib/gestionale-log/undo-session";
import { EntitySimilarWarning } from "@/components/design-system/entity-similar-warning";
import { findMezzoBySimilarIdent } from "@/lib/validation/services/mezzi-validation";
import { useAuth } from "@/context/auth-context";
import { READONLY_PERMISSION_HINT } from "@/src/lib/auth/permissions";

function naturalMezziOrder(a: MezzoGestito, b: MezzoGestito) {
  return a.id.localeCompare(b.id, "en");
}

function getEmptyNuovo() {
  return {
    cliente: "",
    cantiere: "",
    utilizzatore: "",
    tipoAttrezzatura: "",
    marca: "",
    modello: "",
    matricola: "",
    numeroScuderia: "",
    oreLavoro: "",
    tipoTelaio: "",
    marcaTelaio: "",
    modelloTelaio: "",
    targa: "",
    km: "",
    anno: "",
  };
}

function gestitoToForm(m: MezzoGestito) {
  const metaFields = metaToMezzoFormFields({
    cantiere: m.cantiere,
    tipoTelaio: m.tipoTelaio,
    marcaTelaio: m.marcaTelaio,
    modelloTelaio: m.modelloTelaio,
    oreLavoro: m.oreKm,
    km: m.km,
  });
  return {
    cliente: m.cliente.trim(),
    utilizzatore: m.utilizzatore === "—" ? "" : m.utilizzatore.trim(),
    marca: m.marca.trim(),
    modello: m.modello === "—" ? "" : m.modello.trim(),
    targa: m.targa === "—" ? "" : m.targa.trim(),
    matricola: m.matricola === "Non assegnata" || m.matricola === "—" ? "" : m.matricola.trim(),
    numeroScuderia: (m.numeroScuderia ?? "").trim(),
    tipoAttrezzatura: m.tipoAttrezzatura === "—" ? "" : m.tipoAttrezzatura.trim(),
    anno: m.anno != null ? String(m.anno) : "",
    ...metaFields,
  };
}

function formToMezzoInsert(f: ReturnType<typeof getEmptyNuovo>): MezzoInsert {
  const annoParsed = parseInt(f.anno, 10);
  const anno = Math.max(1980, Math.min(2035, Number.isFinite(annoParsed) ? annoParsed : new Date().getFullYear()));
  return {
    cliente: f.cliente.trim(),
    utilizzatore: f.utilizzatore.trim() || null,
    marca: f.marca.trim(),
    modello: f.modello.trim() || "—",
    targa: f.targa.trim() || null,
    matricola: f.matricola.trim() || null,
    numero_scuderia: f.numeroScuderia.trim() || null,
    tipo_attrezzatura: f.tipoAttrezzatura.trim() || null,
    anno,
    meta: mezzoFormToMeta(f) as Record<string, unknown>,
  };
}

function formToMezzoUpdate(f: ReturnType<typeof getEmptyNuovo>): MezzoUpdate {
  return formToMezzoInsert(f);
}

export function MezziView() {
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
  const [toolbarOverflowOpen, setToolbarOverflowOpen] = useState(false);

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

  const { data: lavRows = [] } = useLavorazioniList({ includeMezzo: true });
  const mezziUi = useMemo(() => mezzoRows.map(toMezzoUI), [mezzoRows]);

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
  const [nuovoForm, setNuovoForm] = useState(getEmptyNuovo);
  const [editMezzo, setEditMezzo] = useState<MezzoGestito | null>(null);
  const [editForm, setEditForm] = useState(() => getEmptyNuovo());

  const [logOpen, setLogOpen] = useState(false);
  const { undoable: undoableMezziLog, logQuery } = useUndoableLog("mezzi");
  const logEntriesUi = useMemo(() => (logQuery.data ?? []).map(logModificaRowToMezziHubLogEntry), [logQuery.data]);

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

  const createMut = useMezzoCreateMutation();
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

  function submitNuovo(e: React.FormEvent) {
    e.preventDefault();
    if (!canEditVehicles) return;
    const marca = nuovoForm.marca.trim();
    if (!marca || !nuovoForm.cliente.trim()) {
      toastValidation("Compila almeno cliente e marca attrezzatura.");
      return;
    }
    createMut.mutate(formToMezzoInsert(nuovoForm), {
      onSuccess: (row) => {
        setNuovoForm(getEmptyNuovo());
        setNuovoOpen(false);
        flashRow(row.id);
      },
      onError: (err) => toastError(err, { entity: "mezzo", action: "create" }),
    });
  }

  function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!canEditVehicles) return;
    if (!editMezzo) return;
    const marca = editForm.marca.trim();
    if (!marca || !editForm.cliente.trim()) {
      toastValidation("Compila almeno cliente e marca attrezzatura.");
      return;
    }
    const id = editMezzo.id;
    updateMut.mutate(
      { id, data: formToMezzoUpdate(editForm) },
      {
        onSuccess: () => {
          setEditMezzo(null);
          setHubMezzo(null);
          flashRow(id);
        },
        onError: (err) => toastError(err, { entity: "mezzo", action: "create" }),
      },
    );
  }

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
          permission: "editVehicles",
        });
      }
      await logService.markReverted(undoableMezziLog.id, {
        undo_log_id: undoLog.success ? undoLog.data?.id : null,
        reverted_by: user?.id ?? null,
        permission: "editVehicles",
      });
      await logQuery.refetch();
      flashRow(undoableMezziLog.entita_id);
    } catch (e) {
      toastError(e, { entity: "mezzo", action: "update" });
    }
  }

  return (
    <GestionaleSectionGate module="mezzi">
    <div className={layoutPageRoot}>
    <>
      <PageHeader
        title="Mezzi"
        actions={
          <GestionalePageToolbarActions
            canUndo={Boolean(undoableMezziLog)}
            undoDisabled={!canEditVehicles}
            undoPending={updateMut.isPending}
            onUndo={() => void undoUltimoMezzo()}
            onOpenLog={() => setLogOpen(true)}
            logTitle="Storico modifiche anagrafica mezzi"
          />
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
                  setNuovoForm(getEmptyNuovo());
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
            overflowOpen={toolbarOverflowOpen}
            onOverflowToggle={() => setToolbarOverflowOpen((o) => !o)}
            overflowActions={
              <>
                <button
                  type="button"
                  className={`${dsPageToolbarBtn} w-full justify-center sm:w-auto`}
                  onClick={() => {
                    setSortColumn("ultimaLavorazione");
                    setSortPhase("desc");
                  }}
                >
                  Ultima lav. ↓
                </button>
              </>
            }
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
              <LoadingTableSkeleton preset="mezzi" />
            ) : (
              <MezziTable
                rows={pagedSorted}
                interventiByMezzoId={interventiByMezzoId}
                inOfficina={inOfficina}
                sortColumn={sortColumn}
                sortPhase={sortPhase}
                onSort={onSort}
                flashRowId={flashRowId}
                onHub={setHubMezzo}
                onDelete={canEditVehicles ? handleDeleteMezzo : undefined}
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
            setEditForm(gestitoToForm(h));
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
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden p-3">
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
                          <GestionaleLogEntryFourLines vm={vm}>
                            <GestionaleLogChangeList changes={e.changes} compact />
                          </GestionaleLogEntryFourLines>
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
        <GestionaleModalShell title="Nuovo mezzo" titleId="mezzo-nuovo-title" onRequestClose={() => setNuovoOpen(false)}>
          <form {...gestionaleFormFocusScopeProps()} onSubmit={submitNuovo} className={`${gestionaleModalBodyFlexClass} overflow-hidden`}>
            <GestionaleModalScrollBody className="space-y-3 p-4">
              <MezzoFormFields form={nuovoForm} setForm={setNuovoForm} />
            </GestionaleModalScrollBody>
            <div className="shrink-0 border-t border-[color:var(--cab-border)] p-4">
              <LoadingButton
                type="submit"
                loading={createMut.isPending}
                preset="salva"
                loadingLabel="Salvataggio…"
                className={`${erpBtnAccent} w-full disabled:opacity-60`}
              >
                Salva mezzo
              </LoadingButton>
            </div>
          </form>
        </GestionaleModalShell>
      ) : null}

      {editMezzo ? (
        <GestionaleModalShell
          title="Modifica mezzo"
          titleId="mezzo-edit-title"
          onRequestClose={() => setEditMezzo(null)}
        >
          <form {...gestionaleFormFocusScopeProps()} onSubmit={submitEdit} className={`${gestionaleModalBodyFlexClass} overflow-hidden`}>
            <GestionaleModalScrollBody className="space-y-3 p-4">
              <MezzoFormFields form={editForm} setForm={setEditForm} excludeMezzoId={editMezzo.id} />
            </GestionaleModalScrollBody>
            <div className="shrink-0 border-t border-[color:var(--cab-border)] p-4">
              <LoadingButton
                type="submit"
                loading={updateMut.isPending}
                preset="salva"
                loadingLabel="Salvataggio…"
                className={`${erpBtnAccent} w-full disabled:opacity-60`}
              >
                Salva modifiche
              </LoadingButton>
            </div>
          </form>
        </GestionaleModalShell>
      ) : null}
      {confirmDialog}
    </>
    </div>
    </GestionaleSectionGate>
  );
}

type MezzoForm = ReturnType<typeof getEmptyNuovo>;

function sortedUniqueStrings(list: string[]): string[] {
  return [...new Set(list.map((s) => s.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "it"));
}

function MezzoFormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 border-b border-zinc-100 pb-3 last:border-b-0 dark:border-zinc-800">
      <h3 className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function MezzoFormFields({
  form,
  setForm,
  excludeMezzoId,
}: {
  form: MezzoForm;
  setForm: React.Dispatch<React.SetStateAction<MezzoForm>>;
  excludeMezzoId?: string;
}) {
  const globalOpts = useGlobalOptions({ debugTag: "MezzoFormFields" });
  const mezziListQ = useMezziListQuery();
  const liste = globalOpts.mezziListe;

  const clientiBase = useMemo(() => sortedUniqueStrings(liste?.clienti ?? []), [liste]);
  const cantieriBase = useMemo(() => sortedUniqueStrings(liste?.cantieri ?? []), [liste]);
  const utilizzatoriBase = useMemo(() => sortedUniqueStrings(liste?.utilizzatori ?? []), [liste]);
  const tipiAttBase = useMemo(() => sortedUniqueStrings(liste?.tipiAttrezzatura ?? []), [liste]);
  const tipiTelaioBase = useMemo(() => sortedUniqueStrings(liste?.tipiTelaio ?? []), [liste]);
  const marcheAttBase = useMemo(() => (liste ? marcheFromHierarchyTree(liste, "attrezzature") : []), [liste]);
  const marcheTelaioBase = useMemo(() => (liste ? marcheFromHierarchyTree(liste, "telai") : []), [liste]);

  const modelliAtt = useMemo(() => {
    if (!liste || !form.marca.trim()) return [] as string[];
    return modelliVisibiliPerMarca(liste, form.marca.trim());
  }, [liste, form.marca]);

  const modelliTelaio = useMemo(() => {
    if (!liste || !form.marcaTelaio.trim()) return [] as string[];
    return modelliVisibiliPerMarcaHierarchy(liste, "telai", form.marcaTelaio.trim());
  }, [liste, form.marcaTelaio]);

  useEffect(() => {
    if (!form.marca.trim() && form.modello.trim()) setForm((f) => ({ ...f, modello: "" }));
  }, [form.marca, form.modello, setForm]);

  useEffect(() => {
    if (!form.marcaTelaio.trim() && form.modelloTelaio.trim()) setForm((f) => ({ ...f, modelloTelaio: "" }));
  }, [form.marcaTelaio, form.modelloTelaio, setForm]);

  const listSelectWrapClass = "mt-1 w-full";

  const similarMezzoIdent = useMemo(() => {
    const rows = mezziListQ.data ?? [];
    const hit = findMezzoBySimilarIdent(rows, form.targa, form.matricola, excludeMezzoId);
    if (!hit) return null;
    const ident = hit.targa?.trim() || hit.matricola?.trim() || hit.id;
    return `${ident} (${hit.cliente} — ${hit.marca} ${hit.modello})`.trim();
  }, [mezziListQ.data, form.targa, form.matricola, excludeMezzoId]);

  if (globalOpts.isLoading) {
    return <LoadingFormSkeleton fields={3} className="py-2" />;
  }

  return (
    <>
      <MezzoFormSection title="Cliente">
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Cliente *
          <GlobalSettingsListSelect listKey="mezzi:clienti" className={listSelectWrapClass} value={form.cliente} onChange={(v) => setForm((f) => ({ ...f, cliente: v }))} required aria-label="Cliente" />
        </label>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Cantiere
          <GlobalSettingsListSelect listKey="mezzi:cantieri" className="mt-1" value={form.cantiere} onChange={(v) => setForm((f) => ({ ...f, cantiere: v }))} aria-label="Cantiere" />
        </label>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Utilizzatore
          <GlobalSettingsListSelect listKey="mezzi:utilizzatori" className="mt-1" value={form.utilizzatore} onChange={(v) => setForm((f) => ({ ...f, utilizzatore: v }))} aria-label="Utilizzatore" />
        </label>
      </MezzoFormSection>

      <MezzoFormSection title="Attrezzatura">
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Tipo attrezzatura
          <GlobalSettingsListSelect listKey="mezzi:tipiAttrezzatura" className="mt-1" value={form.tipoAttrezzatura} onChange={(v) => setForm((f) => ({ ...f, tipoAttrezzatura: v }))} aria-label="Tipo attrezzatura" />
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Marca *
            <GlobalHierarchyMarcaSelect tree="attrezzature" className={listSelectWrapClass} value={form.marca} onChange={(marca) => setForm((f) => ({ ...f, marca, modello: "" }))} required aria-label="Marca attrezzatura" />
          </label>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Modello
            <GlobalHierarchyModelloSelect
              tree="attrezzature"
              marcaNome={form.marca}
              className={listSelectWrapClass}
              value={form.modello}
              onChange={(modello) => setForm((f) => ({ ...f, modello }))}
              aria-label="Modello attrezzatura"
            />
          </label>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Matricola
            <input value={form.matricola} onChange={(e) => setForm((f) => ({ ...f, matricola: e.target.value }))} className={`${dsInput} mt-1 font-mono`} />
          </label>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            N. scuderia
            <input value={form.numeroScuderia} onChange={(e) => setForm((f) => ({ ...f, numeroScuderia: e.target.value }))} className={`${dsInput} mt-1 font-mono`} />
          </label>
        </div>
        <EntitySimilarWarning similarTo={similarMezzoIdent} />
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Ore lavoro
          <input type="number" min={0} step={1} value={form.oreLavoro} onChange={(e) => setForm((f) => ({ ...f, oreLavoro: e.target.value }))} className={`${dsInput} mt-1`} />
        </label>
      </MezzoFormSection>

      <MezzoFormSection title="Telaio">
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Tipo telaio
          <GlobalSettingsListSelect listKey="mezzi:tipiTelaio" className="mt-1" value={form.tipoTelaio} onChange={(v) => setForm((f) => ({ ...f, tipoTelaio: v }))} aria-label="Tipo telaio" />
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Marca
            <GlobalHierarchyMarcaSelect tree="telai" className={listSelectWrapClass} value={form.marcaTelaio} onChange={(v) => setForm((f) => ({ ...f, marcaTelaio: v, modelloTelaio: "" }))} aria-label="Marca telaio" />
          </label>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Modello
            <GlobalHierarchyModelloSelect
              tree="telai"
              marcaNome={form.marcaTelaio}
              className={listSelectWrapClass}
              value={form.modelloTelaio}
              onChange={(v) => setForm((f) => ({ ...f, modelloTelaio: v }))}
              aria-label="Modello telaio"
            />
          </label>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Targa
            <input value={form.targa} onChange={(e) => setForm((f) => ({ ...f, targa: e.target.value }))} className={`${dsInput} mt-1 font-mono`} />
          </label>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            KM
            <input type="number" min={0} step={1} value={form.km} onChange={(e) => setForm((f) => ({ ...f, km: e.target.value }))} className={`${dsInput} mt-1`} />
          </label>
        </div>
      </MezzoFormSection>
    </>
  );
}
