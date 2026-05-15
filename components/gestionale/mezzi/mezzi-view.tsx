"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/gestionale/page-header";
import { ShellCard } from "@/components/gestionale/shell-card";
import { MezziSearchBar, MezziFilterFields } from "@/components/gestionale/mezzi/mezzi-filters";
import { MezziHubDetailModal } from "@/components/gestionale/mezzi/mezzi-hub-detail-modal";
import { MezziTable } from "@/components/gestionale/mezzi/mezzi-table";
import { TablePagination } from "@/components/gestionale/table-pagination";
import {
  erpBtnAccent,
  erpBtnNeutral,
  erpBtnNuovaLavorazione,
  erpFocus,
} from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { modelliVisibiliPerMarca } from "@/lib/mezzi/attrezzature-prefs";
import { compareMezzi } from "@/lib/mezzi/mezzi-helpers";
import { interventiMezzoDaLavorazioniDb, mezzoHaLavorazioneAttivaDb } from "@/lib/mezzi/interventi-from-lavorazioni-db";
import { logModificaRowToMezziHubLogEntry, toMezzoUI } from "@/lib/mezzi/mezzi-db-ui-adapter";
import type { MezzoGestito, MezzoInterventoLavorazione, MezziSortKey, MezziSortPhase } from "@/lib/mezzi/types";
import { dsInput, dsPageToolbarBtn, dsStackPage, dsStickyToolbar } from "@/lib/ui/design-system";
import {
  GestionaleLogChangeList,
  GestionaleLogEmpty,
  GestionaleLogEntryFourLines,
  GestionaleLogList,
  IconGestionaleLog,
  buildMezziGestionaleLogViewModel,
  gestionaleLogPanelAsideClass,
  gestionaleLogPanelHeaderClass,
  gestionaleLogScrollEmbeddedClass,
} from "@/components/gestionale/gestionale-log-ui";
import { Q_FOCUS_MEZZO } from "@/lib/navigation/dashboard-log-links";
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import { useResponsiveListPageSize } from "@/lib/ui/use-responsive-list-page-size";
import type { MezzoFilters, MezzoInsert, MezzoUpdate } from "@/src/services/mezzi.service";
import {
  useLogListQuery,
  useMezziListQuery,
} from "@/src/hooks/gestionale/use-entity-list-queries";
import { useLavorazioniList } from "@/src/services/domain/lavorazioni-domain.queries";
import { useMezzoCreateMutation, useMezzoUpdateMutation } from "@/src/hooks/gestionale/use-mezzo-mutations";
import { useCabAppSettingsPayloadQuery } from "@/src/hooks/gestionale/use-settings-queries";

function naturalMezziOrder(a: MezzoGestito, b: MezzoGestito) {
  return a.id.localeCompare(b.id, "en");
}

function getEmptyNuovo() {
  return {
    cliente: "",
    utilizzatore: "",
    marca: "",
    modello: "",
    targa: "",
    matricola: "",
    numeroScuderia: "",
    anno: "",
  };
}

function gestitoToForm(m: MezzoGestito) {
  return {
    cliente: m.cliente.trim(),
    utilizzatore: m.utilizzatore === "—" ? "" : m.utilizzatore.trim(),
    marca: m.marca.trim(),
    modello: m.modello === "—" ? "" : m.modello.trim(),
    targa: m.targa === "—" ? "" : m.targa.trim(),
    matricola: m.matricola === "—" ? "" : m.matricola.trim(),
    numeroScuderia: (m.numeroScuderia ?? "").trim(),
    anno: m.anno != null ? String(m.anno) : "",
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
    matricola: f.matricola.trim() || "—",
    numero_scuderia: f.numeroScuderia.trim() || null,
    anno,
  };
}

function formToMezzoUpdate(f: ReturnType<typeof getEmptyNuovo>): MezzoUpdate {
  return formToMezzoInsert(f);
}

export function MezziView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [search, setSearch] = useState("");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroMarca, setFiltroMarca] = useState("");
  const [filtroModello, setFiltroModello] = useState("");
  const [filtroTarga, setFiltroTarga] = useState("");
  const [filtroNumeroScuderia, setFiltroNumeroScuderia] = useState("");
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

  const sorted = useMemo(() => {
    const rows = [...mezziUi];
    rows.sort((a, b) => compareMezzi(a, b, sortColumn, sortPhase, naturalMezziOrder));
    return rows;
  }, [mezziUi, sortColumn, sortPhase]);

  const hasMezziFilters =
    search.trim().length > 0 ||
    filtroCliente.trim().length > 0 ||
    filtroMarca.trim().length > 0 ||
    filtroModello.trim().length > 0 ||
    filtroTarga.trim().length > 0 ||
    filtroNumeroScuderia.trim().length > 0;

  const listPageSize = useResponsiveListPageSize();
  const { page, setPage, pageCount, sliceItems, showPager, label, resetPage } = useClientPagination(sorted.length, listPageSize);
  const mezziFilterKey = `${search}|${filtroCliente}|${filtroMarca}|${filtroModello}|${filtroTarga}|${filtroNumeroScuderia}|${sortColumn ?? ""}|${sortPhase}`;

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
  const logQuery = useLogListQuery({ entita: "mezzi", limit: 250 }, { enabled: logOpen });
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
    setFiltriEspansi(false);
  }

  useEffect(() => {
    return () => {
      if (flashClearRef.current) clearTimeout(flashClearRef.current);
    };
  }, []);

  const anyOverlay = Boolean(hubMezzo || nuovoOpen || editMezzo || logOpen);
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
    const gap = window.innerWidth - document.documentElement.clientWidth;
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    const prevPad = document.body.style.paddingRight;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
      document.body.style.paddingRight = prevPad;
    };
  }, [anyOverlay]);

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
    const marca = nuovoForm.marca.trim();
    const mat = nuovoForm.matricola.trim();
    if (!marca || !nuovoForm.cliente.trim() || !mat) {
      window.alert("Compila almeno cliente, marca e matricola.");
      return;
    }
    createMut.mutate(formToMezzoInsert(nuovoForm), {
      onSuccess: (row) => {
        setNuovoForm(getEmptyNuovo());
        setNuovoOpen(false);
        flashRow(row.id);
      },
      onError: (err) => window.alert(err.message),
    });
  }

  function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editMezzo) return;
    const marca = editForm.marca.trim();
    const mat = editForm.matricola.trim();
    if (!marca || !editForm.cliente.trim() || !mat) {
      window.alert("Compila almeno cliente, marca e matricola.");
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
        onError: (err) => window.alert(err.message),
      },
    );
  }

  return (
    <>
      <PageHeader
        title="Mezzi"
        actions={
          <div className="flex min-w-0 shrink-0 flex-nowrap items-center justify-end gap-2 overflow-x-auto pb-0.5">
            <button
              type="button"
              onClick={() => setLogOpen(true)}
              className={`${dsPageToolbarBtn} shrink-0 px-2.5 sm:px-3`}
              title="Storico modifiche anagrafica mezzi"
            >
              <IconGestionaleLog />
              <span className="sr-only">Log modifiche</span>
            </button>
          </div>
        }
      />

      <div className={dsStackPage}>
        <ShellCard title="Parco mezzi">
          <div className={`${dsStickyToolbar} -mx-1 sm:mx-0`}>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <button
                  type="button"
                  onClick={() => {
                    setNuovoForm(getEmptyNuovo());
                    setNuovoOpen(true);
                  }}
                  className={`${erpBtnNuovaLavorazione} h-11 shrink-0`}
                >
                  <span className="text-lg font-bold leading-none" aria-hidden>
                    +
                  </span>
                  Nuovo mezzo
                </button>
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
              />
            )}
          </div>
          {showPager ? (
            <TablePagination page={page} pageCount={pageCount} onPageChange={setPage} label={label} />
          ) : (
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{sorted.length} risultati</p>
          )}
        </ShellCard>
      </div>

      {hubMezzo ? (
        <MezziHubDetailModal
          mezzo={hubMezzo}
          onClose={() => setHubMezzo(null)}
          onEdit={() => {
            const h = hubMezzo;
            setHubMezzo(null);
            setEditMezzo(h);
            setEditForm(gestitoToForm(h));
          }}
        />
      ) : null}

      {logOpen ? (
        <div
          className="fixed inset-0 z-[55] flex items-stretch justify-end bg-black/30"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
              setLogOpen(false);
            }
          }}
        >
          <aside className={gestionaleLogPanelAsideClass} aria-label="Log modifiche mezzi" onMouseDown={(e) => e.stopPropagation()}>
            <div className={gestionaleLogPanelHeaderClass}>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Log modifiche</h2>
              <button type="button" onClick={() => setLogOpen(false)} className={erpBtnNeutral}>
                Chiudi
              </button>
            </div>
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
          </aside>
        </div>
      ) : null}

      {nuovoOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setNuovoOpen(false);
          }}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mezzo-nuovo-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
              <h2 id="mezzo-nuovo-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Nuovo mezzo
              </h2>
              <button type="button" className={erpBtnNeutral} onClick={() => setNuovoOpen(false)}>
                Chiudi
              </button>
            </div>
            <form onSubmit={submitNuovo} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-4">
                <MezzoFormFields form={nuovoForm} setForm={setNuovoForm} variant="nuovo" />
              </div>
              <div className="shrink-0 border-t border-zinc-100 p-4 dark:border-zinc-800">
                <button type="submit" disabled={createMut.isPending} className={`${erpBtnAccent} w-full disabled:opacity-60`}>
                  {createMut.isPending ? "Salvataggio…" : "Salva mezzo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editMezzo ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setEditMezzo(null);
          }}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mezzo-edit-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
              <h2 id="mezzo-edit-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Modifica mezzo
              </h2>
              <button type="button" className={erpBtnNeutral} onClick={() => setEditMezzo(null)}>
                Chiudi
              </button>
            </div>
            <form onSubmit={submitEdit} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-4">
                <MezzoFormFields form={editForm} setForm={setEditForm} variant="modifica" />
              </div>
              <div className="shrink-0 border-t border-zinc-100 p-4 dark:border-zinc-800">
                <button type="submit" disabled={updateMut.isPending} className={`${erpBtnAccent} w-full disabled:opacity-60`}>
                  {updateMut.isPending ? "Salvataggio…" : "Salva modifiche"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

type MezzoForm = ReturnType<typeof getEmptyNuovo>;

function sortedUniqueStrings(list: string[]): string[] {
  return [...new Set(list.map((s) => s.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "it"));
}

function MezzoFormFields({
  form,
  setForm,
  variant,
}: {
  form: MezzoForm;
  setForm: React.Dispatch<React.SetStateAction<MezzoForm>>;
  variant: "nuovo" | "modifica";
}) {
  const { data: settingsPayload } = useCabAppSettingsPayloadQuery();
  const liste = settingsPayload?.resolved.mezziListe;

  const clientiBase = useMemo(() => sortedUniqueStrings(liste?.clienti ?? []), [liste]);
  const marcheBase = useMemo(() => sortedUniqueStrings(liste?.marche ?? []), [liste]);

  const clientiOpts = useMemo(() => {
    if (variant === "nuovo") return clientiBase;
    const c = form.cliente.trim();
    if (c && !clientiBase.includes(c)) return [c, ...clientiBase];
    return clientiBase;
  }, [variant, clientiBase, form.cliente]);

  const marcheOpts = useMemo(() => {
    if (variant === "nuovo") return marcheBase;
    const m = form.marca.trim();
    if (m && !marcheBase.includes(m)) return [m, ...marcheBase];
    return marcheBase;
  }, [variant, marcheBase, form.marca]);

  const modelliPerMarca = useMemo(() => {
    if (!liste || !form.marca.trim()) return [] as string[];
    return modelliVisibiliPerMarca(liste, form.marca.trim());
  }, [liste, form.marca]);

  const modelliOpts = useMemo(() => {
    if (!form.marca.trim()) return [] as string[];
    if (variant === "nuovo") return modelliPerMarca;
    const mo = form.modello.trim();
    if (mo && !modelliPerMarca.includes(mo)) return [mo, ...modelliPerMarca];
    return modelliPerMarca;
  }, [variant, form.marca, form.modello, modelliPerMarca]);

  useEffect(() => {
    if (!form.marca.trim() && form.modello.trim()) {
      setForm((f) => ({ ...f, modello: "" }));
    }
  }, [form.marca, form.modello, setForm]);

  useEffect(() => {
    if (variant !== "nuovo" || !liste) return;
    const allowed = modelliVisibiliPerMarca(liste, form.marca.trim());
    const m = form.modello.trim();
    if (m && form.marca.trim() && !allowed.includes(m)) {
      setForm((f) => ({ ...f, modello: "" }));
    }
  }, [variant, liste, form.marca, form.modello, setForm]);

  const selectClass = `mt-1 block w-full min-h-[2.75rem] py-0 ${dsInput}`;
  const modelloDisabled = !form.marca.trim() || modelliOpts.length === 0;

  const clienteValue = clientiOpts.find((x) => x === form.cliente.trim()) ?? "";
  const marcaValue = marcheOpts.find((x) => x === form.marca.trim()) ?? "";
  const modelloValue = modelloDisabled ? "" : (modelliOpts.find((x) => x === form.modello.trim()) ?? "");

  if (!liste) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Caricamento impostazioni…</p>;
  }

  return (
    <>
      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
        Cliente *
        <select
          required
          value={clienteValue}
          onChange={(e) => setForm((f) => ({ ...f, cliente: e.target.value }))}
          className={selectClass}
        >
          <option value="">Seleziona cliente</option>
          {clientiOpts.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
        Utilizzatore
        <input value={form.utilizzatore} onChange={(e) => setForm((f) => ({ ...f, utilizzatore: e.target.value }))} className={`${dsInput} mt-1`} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Marca *
          <select
            required
            value={marcaValue}
            onChange={(e) => {
              const marca = e.target.value;
              setForm((f) => ({ ...f, marca, modello: "" }));
            }}
            className={selectClass}
          >
            <option value="">Seleziona marca</option>
            {marcheOpts.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Modello
          <select
            value={modelloValue}
            onChange={(e) => setForm((f) => ({ ...f, modello: e.target.value }))}
            disabled={modelloDisabled}
            className={`${selectClass} disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <option value="">{form.marca.trim() ? (modelliOpts.length ? "Seleziona modello" : "Nessun modello per questa marca") : "Seleziona prima la marca"}</option>
            {modelliOpts.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Targa
          <input
            value={form.targa}
            onChange={(e) => setForm((f) => ({ ...f, targa: e.target.value }))}
            className={`${dsInput} mt-1 font-mono`}
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Matricola *
          <input
            required
            value={form.matricola}
            onChange={(e) => setForm((f) => ({ ...f, matricola: e.target.value }))}
            className={`${dsInput} mt-1 font-mono`}
          />
        </label>
      </div>
      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
        N. scuderia
        <input
          value={form.numeroScuderia}
          onChange={(e) => setForm((f) => ({ ...f, numeroScuderia: e.target.value }))}
          className={`${dsInput} mt-1 font-mono`}
        />
      </label>
      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
        Anno
        <input
          type="number"
          min={1980}
          max={2035}
          value={form.anno}
          onChange={(e) => setForm((f) => ({ ...f, anno: e.target.value }))}
          className={`${dsInput} mt-1`}
        />
      </label>
    </>
  );
}
