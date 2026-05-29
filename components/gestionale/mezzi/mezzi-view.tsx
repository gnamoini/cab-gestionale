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
import { erpBtnAccent, erpBtnNeutral } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { modelliVisibiliPerMarca } from "@/lib/mezzi/attrezzature-prefs";
import { marcheFromHierarchyTree, modelliVisibiliPerMarcaHierarchy } from "@/lib/mezzi/hierarchy-list-prefs";
import { mezzoFormToMeta, metaToMezzoFormFields } from "@/lib/mezzi/mezzi-meta";
import { compareMezzi, mezzoMatchesUltimaLavFilter, type UltimaLavorazioneFilter } from "@/lib/mezzi/mezzi-helpers";
import { interventiMezzoDaLavorazioniDb, mezzoHaLavorazioneAttivaDb, mezzoHaLavorazioneCollegataDb } from "@/lib/mezzi/interventi-from-lavorazioni-db";
import { logModificaRowToMezziHubLogEntry, toMezzoUI } from "@/lib/mezzi/mezzi-db-ui-adapter";
import type { MezzoGestito, MezzoInterventoLavorazione, MezziSortKey, MezziSortPhase } from "@/lib/mezzi/types";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { dsInput, dsPageToolbarBtn, dsStackPage, dsStickyToolbar } from "@/lib/ui/design-system";
import { Drawer } from "@/components/design-system";
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
import { useMezzoUpdateMutation } from "@/src/hooks/gestionale/use-mezzo-mutations";
import { useMezzoRemoveMutation } from "@/src/hooks/gestionale/use-mezzo-remove-mutation";
import { GestionaleSectionGate } from "@/components/gestionale/gestionale-section-gate";
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
    data: mezzoRows = [],
    isLoading: mezziLoading,
    isError: mezziError,
    error: mezziErr,
    refetch: refetchMezzi,
  } = useMezziListQuery(serviceFilters);

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

  const scrollLockActive = Boolean(hubMezzo || editMezzo || logOpen);
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
      setEditMezzo(null);
      setLogOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [anyOverlay]);

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
          <div className={`${dsStickyToolbar} -mx-1 sm:mx-0`}>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <MezziSearchBar search={search} onSearch={setSearch} wrapperClassName="min-w-0 flex-1 sm:min-w-[12rem]" />
                <button
                  type="button"
                  onClick={() => setFiltriEspansi((o) => !o)}
                  className={`${dsPageToolbarBtn} relative h-11 min-w-[8.25rem] shrink-0 gap-2 px-3 text-sm sm:ml-auto`}
                  aria-expanded={filtriEspansi}
                >
                  Filtri
                  <svg
                    className={`h-4 w-4 shrink-0 text-[color:var(--cab-primary)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${filtriEspansi ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                  {hasMezziFilters ? (
                    <span
                      className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--cab-primary)] ring-2 ring-[var(--cab-surface)]"
                      title="Filtri attivi"
                      aria-hidden
                    />
                  ) : null}
                </button>
              </div>
              <div className="flex flex-col gap-2 border-t border-[color:var(--cab-border)] pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="inline-flex items-baseline gap-1 rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-border-strong)_85%,var(--cab-border))] bg-[var(--cab-surface)] px-2.5 py-1 text-xs text-[color:var(--cab-text-muted)] shadow-[var(--cab-shadow-sm)]">
                    <span className="tabular-nums text-sm font-semibold text-[color:var(--cab-text)]">{sorted.length}</span>
                    <span>risultat{sorted.length === 1 ? "o" : "i"}</span>
                  </span>
                  {hasMezziFilters ? (
                    <span className="rounded-md bg-[color:color-mix(in_srgb,var(--cab-primary)_14%,var(--cab-surface))] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text)] ring-1 ring-[color:color-mix(in_srgb,var(--cab-primary)_35%,var(--cab-border))]">
                      Filtri attivi
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <button
                    type="button"
                    className={dsPageToolbarBtn}
                    onClick={() => {
                      setSortColumn("ultimaLavorazione");
                      setSortPhase("desc");
                    }}
                  >
                    Ultima lav. ↓
                  </button>
                  <button type="button" className={dsPageToolbarBtn} onClick={() => setSearch("")}>
                    Pulisci ricerca
                  </button>
                  <button type="button" className={dsPageToolbarBtn} onClick={resetMezziToolbarFilters}>
                    Reimposta filtri
                  </button>
                </div>
              </div>
            </div>

            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                filtriEspansi ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="border-t border-[color:var(--cab-border)] pt-3" aria-label="Filtri mezzi">
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
                </div>
              </div>
            </div>
          </div>

          {mezziError ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100">
              <p>{mezziErr?.message ?? "Errore caricamento mezzi."}</p>
              <button type="button" className={`${erpBtnNeutral} mt-2`} onClick={() => void refetchMezzi()}>
                Riprova
              </button>
            </div>
          ) : null}

          <div className="mt-4">
            {mezziLoading ? (
              <p className="text-sm text-zinc-500">Caricamento…</p>
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

      <Drawer open={logOpen} onClose={() => setLogOpen(false)} title="Log modifiche" ariaLabel="Log modifiche mezzi" lockScroll={false}>
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-3">
              <div className={`${gestionaleLogScrollEmbeddedClass} min-h-0 flex-1`}>
                {logQuery.isLoading ? (
                  <p className="text-sm text-zinc-500">Caricamento…</p>
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

      {editMezzo ? (
        <GestionaleModalShell
          title="Modifica mezzo"
          titleId="mezzo-edit-title"
          onRequestClose={() => setEditMezzo(null)}
        >
          <form {...gestionaleFormFocusScopeProps()} onSubmit={submitEdit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4 gestionale-scrollbar">
              <MezzoFormFields form={editForm} setForm={setEditForm} excludeMezzoId={editMezzo.id} />
            </div>
            <div className="shrink-0 border-t border-[color:var(--cab-border)] p-4">
              <button type="submit" disabled={updateMut.isPending} className={`${erpBtnAccent} w-full disabled:opacity-60`}>
                {updateMut.isPending ? "Salvataggio…" : "Salva modifiche"}
              </button>
            </div>
          </form>
        </GestionaleModalShell>
      ) : null}
      {confirmDialog}
    </>
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
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Caricamento impostazioni…</p>;
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
