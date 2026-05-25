"use client";

import "@/components/gestionale/lavorazioni/lavorazioni-scroll.css";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import {
  GestionaleListTable,
  GestionaleListTableActionsHead,
  GlobalTableSortTh,
} from "@/components/gestionale/global-table";
import { PageHeader } from "@/components/gestionale/page-header";
import { IconNavLavorazioni } from "@/components/gestionale/gestionale-nav-config";
import { GestionalePageToolbarActions } from "@/components/gestionale/page-header-toolbar";
import { ShellCard } from "@/components/gestionale/shell-card";
import { TablePagination } from "@/components/gestionale/table-pagination";
import { PreventiviEditorModal } from "@/components/preventivi/preventivi-editor-modal";
import { PreventivoEliminaConfirmDialog } from "@/components/preventivi/preventivo-elimina-confirm-dialog";
import { PreventiviAdvancedFilterPanel } from "@/components/preventivi/preventivi-advanced-filter-panel";
import { GestionaleListSearchField } from "@/components/gestionale/gestionale-list-search-field";
import { useAuth } from "@/context/auth-context";
import { usePermissions } from "@/src/hooks/use-permissions";
import { READONLY_PERMISSION_HINT } from "@/src/lib/auth/permissions";
import { findMezzoForLavorazione } from "@/lib/schede/schede-autofill";
import { splitLavorazioniListRowsForReport } from "@/lib/lavorazioni/lavorazioni-report-adapter";
import { mezzoFromLavorazione, preventivoMatchesMezzo } from "@/lib/mezzi/mezzi-hub-merge";
import { normMezzoKey } from "@/lib/mezzi/lavorazioni-sync";
import { migrateMezziListePrefs } from "@/lib/mezzi/attrezzature-prefs";
import {
  buildPreventiviFilterCatalog,
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
import { openPreventivoPdfInNewTab } from "@/lib/preventivi/preventivi-pdf";
import { Q_PREVENTIVI_LAV, Q_PREVENTIVI_LAV_ORIG, Q_PREVENTIVI_MEZZO, Q_PREVENTIVI_NUOVO, Q_PREVENTIVI_OPEN } from "@/lib/preventivi/preventivi-query";
import { readAndClearPendingPreventivoPayload, markEphemeralPreventivoDraft, clearEphemeralPreventivoDraft, readEphemeralPreventivoDraftId } from "@/lib/preventivi/preventivi-session-bridge";
import {
  appendPreventiviChangeLog,
  loadPreventiviChangeLog,
  removePreventiviChangeLogEntryById,
  type PreventiviLogStored,
} from "@/lib/preventivi/preventivi-change-log-storage";
import {
  appendPreventivoSynced,
  persistPreventivoRecord,
  removePreventivoRecord,
} from "@/lib/preventivi/preventivi-sync-adapter";
import { usePreventiviRecordsQuery } from "@/src/hooks/gestionale/use-preventivi-records-query";
import { useMagazzinoRicambiUIQuery, useMezziListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { useLavorazioniList } from "@/src/services/domain/lavorazioni-domain.queries";
import { toMezzoUI } from "@/lib/mezzi/mezzi-db-ui-adapter";
import { useToast } from "@/context/toast-context";
import { buildEmptyManualPreventivo } from "@/lib/preventivi/build-empty-manual-preventivo";
import {
  preventivoTipoDocumentoBadgeClass,
  preventivoTipoDocumentoLabel,
} from "@/lib/preventivi/preventivi-tipo-documento";
import { CAB_PREVENTIVI_LOG_REFRESH } from "@/lib/sistema/cab-events";
import type { PreventivoLavorazioneOrigine, PreventivoRecord, PreventivoSortKey, PreventivoSortPhase } from "@/lib/preventivi/types";
import {
  dsBtnNeutral,
  dsPageToolbarBtn,
  dsStackPage,
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
import { useResponsiveListPageSize } from "@/lib/ui/use-responsive-list-page-size";
import { useCabAppSettingsPayloadQuery } from "@/src/hooks/gestionale/use-settings-queries";
import { erpBtnNuovaLavorazione } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import {
  CardMobile,
  CardMobileActions,
  Drawer,
  IconActionButton,
  PageToolbar,
  PageToolbarActions,
  PageToolbarResultCount,
} from "@/components/design-system";
import {
  gestionaleListTableRowClass,
  gestionaleListTableTd,
  gestionaleListTableTdAzioni,
} from "@/lib/ui/gestionale-list-table";
import {
  GestionaleLogEmpty,
  GestionaleLogEntryFourLines,
  GestionaleLogEntryDismissButton,
  GestionaleLogList,
  gestionaleLogScrollEmbeddedClass,
} from "@/components/gestionale/gestionale-log-ui";

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

const prevTableTd = gestionaleListTableTd;
const prevTableTdCliente = `${gestionaleListTableTd} min-w-0 border-l border-zinc-200/90 pl-3 text-zinc-800 dark:border-zinc-700/90 dark:text-zinc-100`;

function IconPreventivoEdit({ className = dsTableActionGlyph }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );
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
  autore,
  onEdit,
  onDelete,
}: {
  p: PreventivoRecord;
  hrefLav: string | null;
  canEditWorkOrders: boolean;
  canDeleteRecords: boolean;
  autore: string;
  onEdit: (rec: PreventivoRecord) => void;
  onDelete: (rec: PreventivoRecord) => void;
}) {
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
        tooltipContent={canEditWorkOrders ? "Modifica" : "Sola lettura"}
        className={dsTableActionBtnPrimary}
        disabled={!canEditWorkOrders}
        onClick={() => onEdit(p)}
      >
        <IconPreventivoEdit />
      </IconActionButton>
      <IconActionButton
        label="PDF"
        className={dsTableActionBtnSecondary}
        onClick={() => openPreventivoPdfInNewTab(p, autore.trim() || "Operatore")}
      >
        <IconPreventivoPdf />
      </IconActionButton>
      <IconActionButton
        label="Elimina"
        tooltipContent={canDeleteRecords ? "Elimina" : "Sola lettura"}
        className={dsTableActionBtnDanger}
        disabled={!canDeleteRecords}
        onClick={() => onDelete(p)}
      >
        <IconPreventivoTrash />
      </IconActionButton>
    </>
  );
}

function comparePreventivo(a: PreventivoRecord, b: PreventivoRecord, key: PreventivoSortKey, phase: Exclude<PreventivoSortPhase, "natural">): number {
  const dir = phase === "asc" ? 1 : -1;
  switch (key) {
    case "numero":
      return a.numero.localeCompare(b.numero, "it", { numeric: true }) * dir;
    case "dataCreazione":
      return (new Date(a.dataCreazione).getTime() - new Date(b.dataCreazione).getTime()) * dir;
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
  const permissions = usePermissions();
  const canEditWorkOrders = permissions.canEditWorkOrders;
  const canDeleteRecords = permissions.canDeleteRecords;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authorName: autore } = useAuth();
  const { push: pushToast } = useToast();
  const queryClient = useQueryClient();
  const { records: rows, refetch: refetchPreventivi } = usePreventiviRecordsQuery();
  const mezziListQ = useMezziListQuery();
  const mezziRows = mezziListQ.data ?? [];
  const mezziSnap = useMemo(() => mezziRows.map(toMezzoUI), [mezziRows]);
  const magazzinoQ = useMagazzinoRicambiUIQuery();
  const magSnap = magazzinoQ.data ?? [];
  const lavorazioniListQ = useLavorazioniList({ includeMezzo: true });
  const lavReport = useMemo(
    () => splitLavorazioniListRowsForReport(lavorazioniListQ.data ?? []),
    [lavorazioniListQ.data],
  );
  const [sortColumn, setSortColumn] = useState<PreventivoSortKey | null>(null);
  const [sortPhase, setSortPhase] = useState<PreventivoSortPhase>("natural");
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
  const [searchInput, setSearchInput] = useState("");
  const [searchApplied, setSearchApplied] = useState("");
  const searchInputRef = useRef(searchInput);
  searchInputRef.current = searchInput;
  const [filtriEspansi, setFiltriEspansi] = useState(false);
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
  const pendingHandledRef = useRef(false);
  const rollbackDraftIdRef = useRef<string | null>(null);
  const draftConfirmedRef = useRef(false);
  const [logOpen, setLogOpen] = useState(false);
  const [logEntries, setLogEntries] = useState<PreventiviLogStored[]>(() => loadPreventiviChangeLog());
  const [eliminaConfirmRecord, setEliminaConfirmRecord] = useState<PreventivoRecord | null>(null);
  const [eliminaPending, setEliminaPending] = useState(false);

  useEffect(() => {
    if (searchParams.get(Q_PREVENTIVI_NUOVO) !== "1") {
      pendingHandledRef.current = false;
    }
  }, [searchParams]);

  const reload = useCallback(() => {
    void refetchPreventivi();
  }, [refetchPreventivi]);

  useEffect(() => {
    function onLogRefresh() {
      setLogEntries(loadPreventiviChangeLog());
    }
    window.addEventListener(CAB_PREVENTIVI_LOG_REFRESH, onLogRefresh);
    return () => window.removeEventListener(CAB_PREVENTIVI_LOG_REFRESH, onLogRefresh);
  }, []);

  useEffect(() => {
    if (!logOpen) return;
    const t = window.setTimeout(() => setLogEntries(loadPreventiviChangeLog()), 0);
    return () => window.clearTimeout(t);
  }, [logOpen]);

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
    const openId = searchParams.get(Q_PREVENTIVI_OPEN)?.trim();
    const nuovo = searchParams.get(Q_PREVENTIVI_NUOVO);
    if (openId === orphanId || nuovo === "1") return;
    void removePreventivoRecord(orphanId, { queryClient }).then(() => {
      clearEphemeralPreventivoDraft();
      reload();
    });
  }, [searchParams, reload]);

  const filterLavId = searchParams.get(Q_PREVENTIVI_LAV)?.trim() || "";
  const filterOrigRaw = searchParams.get(Q_PREVENTIVI_LAV_ORIG)?.trim() || "";
  const filterMezzoRaw = searchParams.get(Q_PREVENTIVI_MEZZO)?.trim() || "";
  const focusPreventivoId = searchParams.get(Q_PREVENTIVI_OPEN)?.trim() || "";
  const filterOrig: PreventivoLavorazioneOrigine | null =
    filterOrigRaw === "attiva" || filterOrigRaw === "storico" ? filterOrigRaw : null;

  const { data: settingsPayload } = useCabAppSettingsPayloadQuery();
  const listePrefs = useMemo(
    () => migrateMezziListePrefs(settingsPayload?.resolved?.mezziListe ?? createMezziListePrefsDefault()),
    [settingsPayload?.resolved?.mezziListe],
  );

  const filterCatalog = useMemo(() => buildPreventiviFilterCatalog(rows, listePrefs), [rows, listePrefs]);

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
      return list;
    }
    list.sort((a, b) => {
      const c = comparePreventivo(a, b, sortColumn, sortPhase);
      if (c !== 0) return c;
      return new Date(b.dataCreazione).getTime() - new Date(a.dataCreazione).getTime();
    });
    return list;
  }, [filteredRows, sortColumn, sortPhase]);

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

  const {
    page: logPage,
    setPage: setLogPage,
    pageCount: logPageCount,
    sliceItems: sliceLogEntries,
    showPager: showLogPager,
    label: logPagerLabel,
    resetPage: resetLogPage,
  } = useClientPagination(logEntries.length, listPageSize);
  useEffect(() => {
    resetLogPage();
  }, [logOpen, logEntries.length, listPageSize, resetLogPage]);
  const pagedLogEntries = useMemo(() => sliceLogEntries(logEntries), [logEntries, sliceLogEntries]);

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

  const hasAdvancedPanelFilters = preventiviAdvancedFiltersActive(advancedFilters);

  const hasPreventiviListFilters =
    searchApplied.trim().length > 0 ||
    hasAdvancedPanelFilters ||
    Boolean(filterLavId) ||
    Boolean(filterMezzoRaw);

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

  useEffect(() => {
    if (pendingHandledRef.current) return;
    const nuovo = searchParams.get(Q_PREVENTIVI_NUOVO);
    if (nuovo !== "1") return;
    const pending = readAndClearPendingPreventivoPayload();
    if (!pending) return;
    pendingHandledRef.current = true;
    const mezzo = findMezzoForLavorazione(mezziSnap, pending.lav);
    const rec = buildNewPreventivoFromLavorazioneContext({
      lav: pending.lav,
      origine: pending.origine,
      bundle: pending.bundle,
      mezzo,
      magazzino: magSnap,
      autore: autore.trim() || "Operatore",
      existingRecords: rows,
    });
    void appendPreventivoSynced(rec, mezziRows, { queryClient }).then((res) => {
      if (!res.ok) {
        pushToast(res.error, "error", 5000);
        return;
      }
      const saved = res.record;
      markEphemeralPreventivoDraft(saved.id);
      rollbackDraftIdRef.current = saved.id;
      draftConfirmedRef.current = false;
      reload();
      setEditor({ open: true, record: saved, isNew: false, isRollbackDraft: true });
    });
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete(Q_PREVENTIVI_NUOVO);
    sp.set(Q_PREVENTIVI_OPEN, rec.id);
    const q = sp.toString();
    router.replace(q ? `/preventivi?${q}` : "/preventivi", { scroll: false });
  }, [searchParams, router, mezziSnap, magSnap, autore, rows, mezziRows, queryClient]);

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
      pushToast(res.error, "error", 5000);
      return;
    }
    setEliminaConfirmRecord(null);
    reload();
  }

  const bannerFilter =
    filterLavId && filterOrig ? (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-orange-200 bg-orange-50/80 px-3 py-2 text-sm text-orange-950">
        <span>
          Filtro attivo: preventivi collegati alla lavorazione selezionata ({filterOrig === "attiva" ? "attiva" : "storico"}).
        </span>
        <button type="button" className={dsBtnNeutral} onClick={clearLavFilter}>
          Rimuovi filtro
        </button>
      </div>
    ) : null;

  const bannerMezzo = filterMezzoRaw ? (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-orange-200 bg-orange-50/80 px-3 py-2 text-sm text-orange-950">
      <span>Filtro attivo: preventivi collegati al mezzo selezionato.</span>
      <button type="button" className={dsBtnNeutral} onClick={clearMezzoFilter}>
        Rimuovi filtro
      </button>
    </div>
  ) : null;

  return (
    <>
      <PageHeader
        title="Preventivi"
        actions={
          <GestionalePageToolbarActions
            canUndo={false}
            undoDisabled
            onOpenLog={() => setLogOpen(true)}
            logTitle="Storico modifiche preventivi (ultime 200)"
          />
        }
      />

      <div className={dsStackPage}>

      {bannerFilter}
      {bannerMezzo}

      <ShellCard>
        <section aria-label="Azioni e filtri preventivi">
          <PageToolbar
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
                className={`${erpBtnNuovaLavorazione} h-11 shrink-0`}
                disabled={!canEditWorkOrders}
                title={canEditWorkOrders ? "Crea un preventivo senza collegamento a lavorazione" : READONLY_PERMISSION_HINT}
              >
                <span className="text-base font-semibold leading-none" aria-hidden>
                  +
                </span>
                Nuovo preventivo
              </button>
            }
            search={
              <GestionaleListSearchField
                id="preventivi-search"
                wrapperClassName="min-w-0 flex-1 sm:min-w-[12rem]"
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
              <PreventiviAdvancedFilterPanel
                filters={advancedFilters}
                onChange={patchAdvancedFilters}
                catalog={filterCatalog}
              />
            }
            meta={
              <>
                <PageToolbarResultCount count={sortedRows.length} filtersActive={hasPreventiviListFilters} />
                <PageToolbarActions>
                  <button type="button" className={dsPageToolbarBtn} onClick={resetPreventiviRicerca}>
                    Pulisci ricerca
                  </button>
                  <button type="button" className={dsPageToolbarBtn} onClick={resetPreventiviFiltriPagina}>
                    Reimposta filtri
                  </button>
                </PageToolbarActions>
              </>
            }
          />
        </section>

        <GestionaleListTable
          masterScrollScope={false}
          wrapClassName="mt-4"
          visibilityClass="hidden md:block"
          colgroup={
            <>
              <col className="w-[5.25rem]" />
              <col className="w-[4.5rem]" />
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
                  thClassName="w-[5.25rem] min-w-[5.25rem]"
                />
                <th className="w-[4.5rem] min-w-[4.5rem] px-2 text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Tipo
                </th>
                <GlobalTableSortTh
                  label="Data"
                  columnKey="dataCreazione"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSortMain}
                  thClassName="w-[5.75rem] min-w-[5.75rem]"
                />
                <GlobalTableSortTh
                  label="Cliente"
                  columnKey="cliente"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSortMain}
                  thClassName="border-l border-zinc-200/90 pl-3 dark:border-zinc-700/90"
                />
                <GlobalTableSortTh
                  label="Cantiere"
                  columnKey="cantiere"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSortMain}
                  thClassName="min-w-0 px-2"
                />
                <GlobalTableSortTh
                  label="Utilizzatore"
                  columnKey="utilizzatore"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSortMain}
                  thClassName="min-w-0 px-2"
                />
                <GlobalTableSortTh
                  label="Mezzo"
                  columnKey="macchinaRiassunto"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSortMain}
                  thClassName="min-w-0 px-2"
                />
                <GlobalTableSortTh
                  label="Targa"
                  columnKey="targa"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSortMain}
                  thClassName="w-[4.5rem] min-w-[4.5rem] px-2"
                />
                <GlobalTableSortTh
                  label="Matricola"
                  columnKey="matricola"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSortMain}
                  thClassName="w-[5.25rem] min-w-[5.25rem] px-2"
                />
                <GlobalTableSortTh
                  label="Scud."
                  columnKey="nScuderia"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSortMain}
                  thClassName="w-[4.25rem] min-w-[4.25rem] px-2"
                />
                <GlobalTableSortTh
                  label="Totale"
                  columnKey="totaleFinale"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSortMain}
                  thClassName="w-[6.25rem] min-w-[6.25rem]"
                />
                <GestionaleListTableActionsHead />
            </>
          }
          empty={pagedRows.length === 0}
          emptyMessage="Nessun preventivo in archivio."
          colSpan={12}
        >
              {pagedRows.map((p) => {
                const hrefLav = p.lavorazioneId.trim()
                  ? buildPreventiviLavorazioneFocusHref(p.lavorazioneId, p.lavorazioneOrigine)
                  : null;
                const focused = focusPreventivoId === p.id;
                return (
                  <tr
                    key={p.id}
                    id={`preventivo-row-${p.id}`}
                    className={`${gestionaleListTableRowClass} ${
                      focused ? "ring-2 ring-inset ring-orange-400/80 bg-orange-500/10" : ""
                    }`}
                  >
                    <td className={`whitespace-nowrap ${prevTableTd} font-mono text-xs font-semibold tabular-nums text-zinc-900 dark:text-zinc-100`}>
                      {p.numero}
                    </td>
                    <td className={`whitespace-nowrap ${prevTableTd} px-2`}>
                      <span className={preventivoTipoDocumentoBadgeClass(p.tipoDocumento)} title={preventivoTipoDocumentoLabel(p.tipoDocumento)}>
                        {preventivoTipoDocumentoLabel(p.tipoDocumento, "short")}
                      </span>
                    </td>
                    <td className={`whitespace-nowrap ${prevTableTd} text-xs tabular-nums text-zinc-600 dark:text-zinc-300`}>
                      {fmtDataCreazioneTabella(p.dataCreazione)}
                    </td>
                    <td className={prevTableTdCliente}>
                      <span className="line-clamp-2 break-words text-sm leading-snug">{p.cliente || "—"}</span>
                    </td>
                    <td className={`min-w-0 ${prevTableTd} text-zinc-700 dark:text-zinc-200`}>
                      <span className="line-clamp-2 break-words text-xs leading-snug">{p.cantiere || "—"}</span>
                    </td>
                    <td className={`min-w-0 ${prevTableTd} text-zinc-700 dark:text-zinc-200`}>
                      <span className="line-clamp-2 break-words text-xs leading-snug">{p.utilizzatore || "—"}</span>
                    </td>
                    <td className={`min-w-0 max-w-[1px] ${prevTableTd} text-zinc-700 dark:text-zinc-200`}>
                      <span className="line-clamp-2 break-words text-sm leading-snug">{p.macchinaRiassunto || "—"}</span>
                    </td>
                    <td className={`whitespace-nowrap ${prevTableTd} font-mono text-[11px] text-zinc-600 dark:text-zinc-300`}>{p.targa || "—"}</td>
                    <td className={`min-w-0 ${prevTableTd} font-mono text-[11px] text-zinc-600 dark:text-zinc-300`}>
                      <span className="line-clamp-1">{p.matricola || "—"}</span>
                    </td>
                    <td className={`min-w-0 ${prevTableTd} text-[11px] text-zinc-600 dark:text-zinc-300`}>
                      <span className="line-clamp-1" title={p.nScuderia || undefined}>
                        {p.nScuderia || "—"}
                      </span>
                    </td>
                    <td className={`whitespace-nowrap ${prevTableTd} text-sm font-medium tabular-nums text-zinc-800 dark:text-zinc-100`}>
                      {p.totaleFinale.toLocaleString("it-IT", { minimumFractionDigits: 2 })} €
                    </td>
                    <td className={gestionaleListTableTdAzioni}>
                      <div className={dsTableActionsGroup}>
                        <PreventivoRowActions
                          p={p}
                          hrefLav={hrefLav}
                          canEditWorkOrders={canEditWorkOrders}
                          canDeleteRecords={canDeleteRecords}
                          autore={autore}
                          onEdit={apriModifica}
                          onDelete={openEliminaConfirm}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
        </GestionaleListTable>

        <div className="mt-4 space-y-3 md:hidden">
          {pagedRows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              {hasPreventiviListFilters
                ? "Nessun preventivo corrisponde alla ricerca o ai filtri selezionati."
                : "Nessun preventivo in archivio."}
            </p>
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
                  className={focused ? "ring-2 ring-orange-400/80 bg-orange-500/10" : undefined}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-mono text-xs font-semibold tabular-nums text-zinc-500 dark:text-zinc-400">{p.numero}</p>
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
                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
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
                      autore={autore}
                      onEdit={apriModifica}
                      onDelete={openEliminaConfirm}
                    />
                  </CardMobileActions>
                </CardMobile>
              );
            })
          )}
        </div>

        {showPager ? <TablePagination page={page} pageCount={pageCount} onPageChange={setPage} label={label} /> : null}
      </ShellCard>

      <PreventiviEditorModal
        open={editor.open && canEditWorkOrders}
        record={editor.record}
        isNew={editor.isNew}
        isRollbackDraft={editor.isRollbackDraft}
        autore={autore.trim() || "Operatore"}
        mezziRows={mezziRows}
        allRecords={rows}
        onClose={closeEditor}
        onSaved={onEditorSaved}
        onSaveError={(msg) => {
          if (msg.includes("altro utente")) pushToast(msg, "warning", 5200);
          else pushToast(msg, "error", 5000);
        }}
      />
      </div>

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

      <Drawer
        open={logOpen}
        onClose={() => setLogOpen(false)}
        title="Log modifiche preventivi"
        ariaLabel="Log modifiche preventivi"
        lockScroll={!(editor.open && canEditWorkOrders)}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-3">
          <div className={gestionaleLogScrollEmbeddedClass}>
            {logEntries.length === 0 ? (
                <GestionaleLogEmpty message="Nessuna modifica registrata." />
              ) : (
                <>
                  <GestionaleLogList>
                    {pagedLogEntries.map((entry) => (
                      <li key={entry.id} className="list-none">
                        <GestionaleLogEntryFourLines
                          vm={{
                            tone: entry.tone,
                            tipoRiga: entry.tipoRiga,
                            oggettoRiga: entry.oggettoRiga,
                            modificaRiga: entry.modificaRiga,
                            autore: entry.autore,
                            atIso: entry.atIso,
                          }}
                          trailing={
                            <GestionaleLogEntryDismissButton
                              onDismiss={() => removePreventiviChangeLogEntryById(entry.id)}
                            />
                          }
                        />
                      </li>
                    ))}
                  </GestionaleLogList>
                </>
            )}
          </div>
          {showLogPager ? (
            <TablePagination page={logPage} pageCount={logPageCount} onPageChange={setLogPage} label={logPagerLabel} />
          ) : null}
        </div>
      </Drawer>
    </>
  );
}
