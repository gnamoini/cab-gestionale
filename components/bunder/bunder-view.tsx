"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  GestionaleListTable,
  GestionaleListTableActionsHead,
  GlobalTableSortTh,
} from "@/components/gestionale/global-table";
import { GestionaleSearchField } from "@/components/gestionale/gestionale-search-field";
import { PageHeader } from "@/components/gestionale/page-header";
import { GestionalePageToolbarActions } from "@/components/gestionale/page-header-toolbar";
import { ShellCard } from "@/components/gestionale/shell-card";
import { TablePagination } from "@/components/gestionale/table-pagination";
import { BunderEditorModal } from "@/components/bunder/bunder-editor-modal";
import { useAuth } from "@/context/auth-context";
import { appendBunderChangeLog, loadBunderChangeLog, removeBunderChangeLogEntryById, type BunderLogStored } from "@/lib/bunder/bunder-change-log-storage";
import { cloneBunderDocument, createNuovoBunderDocument, documentoMatchesSearch, totaleDocumento } from "@/lib/bunder/bunder-generate-default";
import { openBunderPdfInNewTab } from "@/lib/bunder/bunder-pdf";
import { openBunderWordInNewTab } from "@/lib/bunder/bunder-html-document";
import { bunderKindLabel, BUNDER_DOC_KIND_OPTIONS } from "@/lib/bunder/doc-kind-meta";
import type { BunderCommercialDocument, BunderDocKind } from "@/lib/bunder/types";
import { loadBunderDocuments, saveBunderDocuments } from "@/lib/bunder/bunder-storage";
import { CAB_BUNDER_LOG_REFRESH } from "@/lib/sistema/cab-events";
import { useMagazzinoRicambiUIQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { useViewQueryOpts } from "@/lib/view/view-query-opts";
import {
  dsBtnNeutral,
  dsBtnPrimary,
  dsPageToolbarBtn,
  dsStackPage,
  dsStickyToolbar,
  dsFocus,
  dsTableActionBtnPrimary,
  dsTableActionBtnSecondary,
  dsTableActionBtnDanger,
  dsTableActionGlyph,
  GESTIONALE_SEARCH_PLACEHOLDER,
} from "@/lib/ui/design-system";
import {
  gestionaleListColAzioniClass,
  gestionaleListTableRowClass,
  gestionaleListTableTd,
  gestionaleListTableTdAzioni,
  gestionaleListTableTdCenter,
  gestionaleListTableActionsGroupEnd,
} from "@/lib/ui/gestionale-list-table";
import { useGestionaleConfirm } from "@/src/hooks/use-gestionale-confirm";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { GESTIONALE_TOAST } from "@/src/lib/ux/gestionale-toast-messages";
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import { useResponsiveListPageSize } from "@/lib/ui/use-responsive-list-page-size";
import { GlobalDatePickerYmd, GlobalSelect } from "@/components/gestionale/global-input";
import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { erpBtnNuovaLavorazione } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { gestionaleConfirmActionsClass } from "@/components/gestionale/gestionale-confirm-dialog";
import { globalInputFieldFilter } from "@/lib/ui/global-input";
import { Drawer, IconActionButton } from "@/components/design-system";
import {
  GestionaleLogEmpty,
  GestionaleLogEntryFourLines,
  GestionaleLogEntryDismissButton,
  GestionaleLogList,
  gestionaleLogScrollEmbeddedClass,
} from "@/components/gestionale/gestionale-log-ui";

type FiltriDraft = {
  tipo: BunderDocKind | "__tutti__";
  azienda: string;
  referente: string;
  prodotto: string;
  codice: string;
  settore: string;
  autore: string;
  imin: string;
  imax: string;
  dataDa: string;
  dataA: string;
  mese: string;
  anno: string;
};

const DRAFT_EMPTY: FiltriDraft = {
  tipo: "__tutti__",
  azienda: "",
  referente: "",
  prodotto: "",
  codice: "",
  settore: "",
  autore: "",
  imin: "",
  imax: "",
  dataDa: "",
  dataA: "",
  mese: "__tutti__",
  anno: "__tutti__",
};

function parseYmdLocal(ymd: string): Date | null {
  const t = ymd.trim();
  if (!t) return null;
  const [ys, ms, ds] = t.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const day = Number(ds);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(day)) return null;
  const d = new Date(y, m - 1, day);
  if (d.getFullYear() !== y || d.getMonth() !== m - 1 || d.getDate() !== day) return null;
  return d;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function parseMoney(s: string): number | null {
  const t = s.trim().replace(/\s/g, "").replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

type BunderSortPhase = "asc" | "desc" | "natural";
type BunderSortKey =
  | "numeroProgressivo"
  | "kind"
  | "aziendaDestinatario"
  | "oggetto"
  | "dataDocumento"
  | "totale"
  | "prodotti";

function prodottiSortLabel(d: BunderCommercialDocument): string {
  return d.righe
    .map((r) => r.nome.trim())
    .filter(Boolean)
    .join(" ");
}

function compareBunder(
  a: BunderCommercialDocument,
  b: BunderCommercialDocument,
  k: BunderSortKey,
  phase: BunderSortPhase,
): number {
  if (phase === "natural") return 0;
  const dir = phase === "desc" ? -1 : 1;
  const t = (x: number) => x * dir;
  switch (k) {
    case "numeroProgressivo":
      return t(a.numeroProgressivo.localeCompare(b.numeroProgressivo, "it", { numeric: true }));
    case "kind":
      return t(a.kind.localeCompare(b.kind, "it"));
    case "aziendaDestinatario":
      return t(a.aziendaDestinatario.localeCompare(b.aziendaDestinatario, "it", { sensitivity: "base" }));
    case "oggetto":
      return t(a.oggetto.localeCompare(b.oggetto, "it", { sensitivity: "base" }));
    case "dataDocumento": {
      const da = new Date(a.dataDocumento + "T12:00:00").getTime();
      const db = new Date(b.dataDocumento + "T12:00:00").getTime();
      return t(da === db ? 0 : da < db ? -1 : 1);
    }
    case "totale":
      return t(totaleDocumento(a) - totaleDocumento(b));
    case "prodotti":
      return t(prodottiSortLabel(a).localeCompare(prodottiSortLabel(b), "it", { sensitivity: "base" }));
    default:
      return 0;
  }
}

export function BunderView() {
  const { authorName: autore } = useAuth();
  const { confirm, confirmDialog } = useGestionaleConfirm();
  const gestToast = useGestionaleToast();
  const authorTrim = autore.trim() || "Operatore";
  const [docs, setDocs] = useState<BunderCommercialDocument[]>([]);
  const viewOpts = useViewQueryOpts({ staleTime: 90_000 });
  const magazzinoQ = useMagazzinoRicambiUIQuery(undefined, viewOpts);
  const mag = magazzinoQ.data ?? [];
  const [search, setSearch] = useState("");
  const [filtriOpen, setFiltriOpen] = useState(false);
  const [filtroDraft, setFiltroDraft] = useState<FiltriDraft>(DRAFT_EMPTY);
  const [filtroTipo, setFiltroTipo] = useState<BunderDocKind | "__tutti__">("__tutti__");
  const [filtroAzienda, setFiltroAzienda] = useState("");
  const [filtroReferente, setFiltroReferente] = useState("");
  const [filtroProdotto, setFiltroProdotto] = useState("");
  const [filtroCodice, setFiltroCodice] = useState("");
  const [filtroSettore, setFiltroSettore] = useState("");
  const [filtroAutore, setFiltroAutore] = useState("");
  const [filtroImin, setFiltroImin] = useState("");
  const [filtroImax, setFiltroImax] = useState("");
  const [filtroDataDa, setFiltroDataDa] = useState("");
  const [filtroDataA, setFiltroDataA] = useState("");
  const [filtroMese, setFiltroMese] = useState("__tutti__");
  const [filtroAnno, setFiltroAnno] = useState("__tutti__");

  const [bunderSortColumn, setBunderSortColumn] = useState<BunderSortKey | null>(null);
  const [bunderSortPhase, setBunderSortPhase] = useState<BunderSortPhase>("natural");

  const [editor, setEditor] = useState<{ open: boolean; doc: BunderCommercialDocument | null }>({
    open: false,
    doc: null,
  });
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardKind, setWizardKind] = useState<BunderDocKind>("offerta_commerciale");

  const [logOpen, setLogOpen] = useState(false);
  const [logEntries, setLogEntries] = useState<BunderLogStored[]>([]);

  useEffect(() => {
    setDocs(loadBunderDocuments());
    setLogEntries(loadBunderChangeLog());
  }, []);

  useEffect(() => {
    function onLog() {
      setLogEntries(loadBunderChangeLog());
    }
    window.addEventListener(CAB_BUNDER_LOG_REFRESH, onLog);
    return () => window.removeEventListener(CAB_BUNDER_LOG_REFRESH, onLog);
  }, []);

  useEffect(() => {
    if (logOpen) setLogEntries(loadBunderChangeLog());
  }, [logOpen]);

  const persist = useCallback((next: BunderCommercialDocument[]) => {
    setDocs(next);
    saveBunderDocuments(next);
  }, []);

  const autoriOpts = useMemo(() => {
    const s = new Set<string>();
    for (const d of docs) {
      const a = d.createdBy.trim();
      if (a) s.add(a);
    }
    return [...s].sort((a, b) => a.localeCompare(b, "it"));
  }, [docs]);

  const anniOpts = useMemo(() => {
    const s = new Set<number>();
    for (const d of docs) {
      const y = new Date(d.dataDocumento + "T12:00:00").getFullYear();
      if (!Number.isNaN(y)) s.add(y);
    }
    return [...s].sort((a, b) => b - a);
  }, [docs]);

  const hasFiltriAvanzati =
    filtroTipo !== "__tutti__" ||
    Boolean(filtroAzienda.trim()) ||
    Boolean(filtroReferente.trim()) ||
    Boolean(filtroProdotto.trim()) ||
    Boolean(filtroCodice.trim()) ||
    Boolean(filtroSettore.trim()) ||
    Boolean(filtroAutore.trim()) ||
    Boolean(filtroImin.trim()) ||
    Boolean(filtroImax.trim()) ||
    Boolean(filtroDataDa.trim()) ||
    Boolean(filtroDataA.trim()) ||
    filtroMese !== "__tutti__" ||
    filtroAnno !== "__tutti__";

  const filtered = useMemo(() => {
    let list = [...docs];
    if (filtroTipo !== "__tutti__") list = list.filter((d) => d.kind === filtroTipo);
    const az = filtroAzienda.trim().toLowerCase();
    if (az) list = list.filter((d) => d.aziendaDestinatario.toLowerCase().includes(az));
    const ref = filtroReferente.trim().toLowerCase();
    if (ref) list = list.filter((d) => d.referente.toLowerCase().includes(ref));
    const pr = filtroProdotto.trim().toLowerCase();
    if (pr) list = list.filter((d) => d.righe.some((r) => r.nome.toLowerCase().includes(pr) || r.descrizioneTecnica.toLowerCase().includes(pr)));
    const cod = filtroCodice.trim().toLowerCase();
    if (cod) list = list.filter((d) => d.righe.some((r) => r.codice.toLowerCase().includes(cod)));
    const se = filtroSettore.trim().toLowerCase();
    if (se) list = list.filter((d) => d.settore.toLowerCase().includes(se));
    const au = filtroAutore.trim().toLowerCase();
    if (au) list = list.filter((d) => d.createdBy.toLowerCase().includes(au));
    const imin = parseMoney(filtroImin);
    const imax = parseMoney(filtroImax);
    if (imin !== null) list = list.filter((d) => totaleDocumento(d) >= imin);
    if (imax !== null) list = list.filter((d) => totaleDocumento(d) <= imax);
    const rawDa = filtroDataDa.trim();
    const rawA = filtroDataA.trim();
    if (rawDa) {
      const p = parseYmdLocal(rawDa);
      if (p) {
        const ms = startOfDay(p).getTime();
        list = list.filter((d) => new Date(d.dataDocumento + "T12:00:00").getTime() >= ms);
      }
    }
    if (rawA) {
      const p = parseYmdLocal(rawA);
      if (p) {
        const ms = endOfDay(p).getTime();
        list = list.filter((d) => new Date(d.dataDocumento + "T12:00:00").getTime() <= ms);
      }
    }
    if (filtroMese !== "__tutti__") {
      const mi = Number(filtroMese);
      list = list.filter((d) => new Date(d.dataDocumento + "T12:00:00").getMonth() + 1 === mi);
    }
    if (filtroAnno !== "__tutti__") {
      const y = Number(filtroAnno);
      list = list.filter((d) => new Date(d.dataDocumento + "T12:00:00").getFullYear() === y);
    }
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((d) => documentoMatchesSearch(d, q));
    list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return list;
  }, [
    docs,
    filtroTipo,
    filtroAzienda,
    filtroReferente,
    filtroProdotto,
    filtroCodice,
    filtroSettore,
    filtroAutore,
    filtroImin,
    filtroImax,
    filtroDataDa,
    filtroDataA,
    filtroMese,
    filtroAnno,
    search,
  ]);

  const displayRows = useMemo(() => {
    const list = [...filtered];
    if (bunderSortColumn === null || bunderSortPhase === "natural") {
      return list;
    }
    list.sort((a, b) => {
      const c = compareBunder(a, b, bunderSortColumn, bunderSortPhase);
      if (c !== 0) return c;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    return list;
  }, [filtered, bunderSortColumn, bunderSortPhase]);

  const listPageSize = useResponsiveListPageSize();
  const bunderPagerDeps = useMemo(
    () =>
      `${filtroTipo}|${filtroAzienda}|${filtroReferente}|${filtroProdotto}|${filtroCodice}|${filtroSettore}|${filtroAutore}|${filtroImin}|${filtroImax}|${filtroDataDa}|${filtroDataA}|${filtroMese}|${filtroAnno}|${search}|${displayRows.length}|${bunderSortColumn ?? ""}|${bunderSortPhase}`,
    [
      filtroTipo,
      filtroAzienda,
      filtroReferente,
      filtroProdotto,
      filtroCodice,
      filtroSettore,
      filtroAutore,
      filtroImin,
      filtroImax,
      filtroDataDa,
      filtroDataA,
      filtroMese,
      filtroAnno,
      search,
      displayRows.length,
      bunderSortColumn,
      bunderSortPhase,
    ],
  );
  const { page, setPage, pageCount, sliceItems, showPager, label, resetPage } = useClientPagination(displayRows.length, listPageSize);
  useEffect(() => {
    resetPage();
  }, [bunderPagerDeps, listPageSize, resetPage]);
  const pagedFiltered = useMemo(() => sliceItems(displayRows), [displayRows, sliceItems, page]);

  const {
    page: logPage,
    setPage: setLogPage,
    pageCount: logPageCount,
    sliceItems: sliceBunderLog,
    showPager: showLogPager,
    label: logPagerLabel,
    resetPage: resetLogPage,
  } = useClientPagination(logEntries.length, listPageSize);
  useEffect(() => {
    resetLogPage();
  }, [logOpen, logEntries.length, listPageSize, resetLogPage]);
  const pagedLogEntries = useMemo(() => sliceBunderLog(logEntries), [logEntries, sliceBunderLog, logPage]);

  function openFiltri() {
    setFiltroDraft({
      tipo: filtroTipo,
      azienda: filtroAzienda,
      referente: filtroReferente,
      prodotto: filtroProdotto,
      codice: filtroCodice,
      settore: filtroSettore,
      autore: filtroAutore,
      imin: filtroImin,
      imax: filtroImax,
      dataDa: filtroDataDa,
      dataA: filtroDataA,
      mese: filtroMese,
      anno: filtroAnno,
    });
    setFiltriOpen(true);
  }

  function applyFiltri() {
    setFiltroTipo(filtroDraft.tipo);
    setFiltroAzienda(filtroDraft.azienda);
    setFiltroReferente(filtroDraft.referente);
    setFiltroProdotto(filtroDraft.prodotto);
    setFiltroCodice(filtroDraft.codice);
    setFiltroSettore(filtroDraft.settore);
    setFiltroAutore(filtroDraft.autore);
    setFiltroImin(filtroDraft.imin);
    setFiltroImax(filtroDraft.imax);
    setFiltroDataDa(filtroDraft.dataDa);
    setFiltroDataA(filtroDraft.dataA);
    setFiltroMese(filtroDraft.mese);
    setFiltroAnno(filtroDraft.anno);
    setFiltriOpen(false);
  }

  function resetFiltriAll() {
    setFiltroTipo("__tutti__");
    setFiltroAzienda("");
    setFiltroReferente("");
    setFiltroProdotto("");
    setFiltroCodice("");
    setFiltroSettore("");
    setFiltroAutore("");
    setFiltroImin("");
    setFiltroImax("");
    setFiltroDataDa("");
    setFiltroDataA("");
    setFiltroMese("__tutti__");
    setFiltroAnno("__tutti__");
    setSearch("");
    setFiltroDraft({ ...DRAFT_EMPTY });
    setFiltriOpen(false);
  }

  function onSortBunder(k: BunderSortKey) {
    if (bunderSortColumn !== k) {
      setBunderSortColumn(k);
      setBunderSortPhase("asc");
      return;
    }
    if (bunderSortPhase === "asc") {
      setBunderSortPhase("desc");
    } else if (bunderSortPhase === "desc") {
      setBunderSortColumn(null);
      setBunderSortPhase("natural");
    } else {
      setBunderSortColumn(k);
      setBunderSortPhase("asc");
    }
  }

  function creaWizard() {
    const nu = createNuovoBunderDocument({
      kind: wizardKind,
      autore: authorTrim,
      existing: docs,
      magazzino: mag,
    });
    persist([nu, ...docs]);
    appendBunderChangeLog({
      tone: "create",
      tipoRiga: "CREATO DOCUMENTO",
      oggettoRiga: `${nu.numeroProgressivo} · ${bunderKindLabel(nu.kind)}`,
      modificaRiga: `Creato da procedura guidata BUNDER.`,
      autore: authorTrim,
      atIso: new Date().toISOString(),
    });
    setWizardOpen(false);
    setEditor({ open: true, doc: nu });
  }

  function onSaveEdited(d: BunderCommercialDocument) {
    const next = docs.some((x) => x.id === d.id) ? docs.map((x) => (x.id === d.id ? d : x)) : [d, ...docs];
    persist(next);
  }

  function duplica(d: BunderCommercialDocument) {
    const cl = cloneBunderDocument(d, { allDocs: docs, autore: authorTrim, mode: "duplica" });
    persist([cl, ...docs]);
    appendBunderChangeLog({
      tone: "create",
      tipoRiga: "DUPLICATO DOCUMENTO",
      oggettoRiga: `${cl.numeroProgressivo}`,
      modificaRiga: `Origine: ${d.numeroProgressivo}.`,
      autore: authorTrim,
      atIso: new Date().toISOString(),
    });
    setEditor({ open: true, doc: cl });
  }

  function nuovoDa(d: BunderCommercialDocument) {
    const cl = cloneBunderDocument(d, { allDocs: docs, autore: authorTrim, mode: "nuovo_da_modello", refreshPricesFrom: mag });
    persist([cl, ...docs]);
    appendBunderChangeLog({
      tone: "create",
      tipoRiga: "NUOVO DA DOCUMENTO",
      oggettoRiga: `${cl.numeroProgressivo}`,
      modificaRiga: `Modello: ${d.numeroProgressivo}. Prezzi listino aggiornati ove codice presente a magazzino.`,
      autore: authorTrim,
      atIso: new Date().toISOString(),
    });
    setEditor({ open: true, doc: cl });
  }

  function elimina(d: BunderCommercialDocument) {
    void confirm({
      title: "Eliminare documento?",
      message: `Il documento ${d.numeroProgressivo} verrà rimosso.`,
      destructive: true,
      confirmLabel: "Elimina",
    }).then((ok) => {
      if (!ok) return;
      persist(docs.filter((x) => x.id !== d.id));
      appendBunderChangeLog({
        tone: "delete",
        tipoRiga: "ELIMINATO DOCUMENTO",
        oggettoRiga: d.numeroProgressivo,
        modificaRiga: `Tipo: ${bunderKindLabel(d.kind)}. Destinatario: ${d.aziendaDestinatario}.`,
        autore: authorTrim,
        atIso: new Date().toISOString(),
      });
      gestToast.successOnce("bunder-delete", GESTIONALE_TOAST.successDeleted);
    });
  }

  function rowPdf(d: BunderCommercialDocument) {
    openBunderPdfInNewTab(d, authorTrim);
    appendBunderChangeLog({
      tone: "neutral",
      tipoRiga: "ESPORTAZIONE PDF",
      oggettoRiga: d.numeroProgressivo,
      modificaRiga: "Apertura PDF in nuova scheda.",
      autore: authorTrim,
      atIso: new Date().toISOString(),
    });
  }

  function rowWord(d: BunderCommercialDocument) {
    openBunderWordInNewTab(d);
    appendBunderChangeLog({
      tone: "neutral",
      tipoRiga: "ESPORTAZIONE WORD",
      oggettoRiga: d.numeroProgressivo,
      modificaRiga: "Apertura Word in nuova scheda.",
      autore: authorTrim,
      atIso: new Date().toISOString(),
    });
  }

  return (
    <>
      <PageHeader
        title="Bunder"
        actions={
          <GestionalePageToolbarActions
            canUndo={false}
            undoDisabled
            onOpenLog={() => setLogOpen(true)}
            logTitle="Log modifiche BUNDER"
          />
        }
      />

      <div className={dsStackPage}>
      <ShellCard>
        <div className={`${dsStickyToolbar} -mx-1 sm:mx-0`}>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <button type="button" className={`${erpBtnNuovaLavorazione} h-11 shrink-0 px-4`} onClick={() => setWizardOpen(true)}>
              Nuovo documento
            </button>
            <GestionaleSearchField
              wrapperClassName="min-w-0 flex-1 sm:min-w-[12rem]"
              placeholder={GESTIONALE_SEARCH_PLACEHOLDER}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Cerca documenti BUNDER"
            />
              <button
                type="button"
                onClick={() => (filtriOpen ? setFiltriOpen(false) : openFiltri())}
                className={`${dsPageToolbarBtn} relative h-11 min-w-[8.25rem] shrink-0 gap-2 px-3 text-sm sm:ml-auto`}
                aria-expanded={filtriOpen}
              >
                Filtri
                <svg className={`h-4 w-4 shrink-0 text-[color:var(--cab-primary)] transition-transform ${filtriOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
                {hasFiltriAvanzati || search.trim() ? (
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--cab-primary)] ring-2 ring-[var(--cab-surface)]" aria-hidden />
                ) : null}
              </button>
          </div>
          <div className="flex flex-col gap-2 border-t border-[color:var(--cab-border)] pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="inline-flex items-baseline gap-1 rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-border-strong)_85%,var(--cab-border))] bg-[var(--cab-surface)] px-2.5 py-1 text-xs text-[color:var(--cab-text-muted)] shadow-[var(--cab-shadow-sm)]">
                <span className="tabular-nums text-sm font-semibold text-[color:var(--cab-text)]">{filtered.length}</span>
                <span>document{filtered.length === 1 ? "o" : "i"}</span>
              </span>
              {hasFiltriAvanzati || search.trim() ? (
                <span className="rounded-md bg-[color:color-mix(in_srgb,var(--cab-primary)_14%,var(--cab-surface))] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text)] ring-1 ring-[color:color-mix(in_srgb,var(--cab-primary)_35%,var(--cab-border))]">
                  Filtri attivi
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <button type="button" className={dsPageToolbarBtn} onClick={() => setSearch("")}>
                Pulisci ricerca
              </button>
              <button type="button" className={dsPageToolbarBtn} onClick={resetFiltriAll}>
                Reimposta filtri
              </button>
            </div>
          </div>
        </div>
        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            filtriOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="border-t border-[color:var(--cab-border)] pt-3" aria-label="Filtri Bunder">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                      Tipo
                      <div className="mt-1">
                        <GlobalSelect
                          variant="filter"
                          inputClassName={globalInputFieldFilter}
                          items={[
                            { value: "__tutti__", label: "Tutti" },
                            ...BUNDER_DOC_KIND_OPTIONS.map((o) => ({ value: o.id, label: o.label })),
                          ]}
                          value={filtroDraft.tipo}
                          onChange={(v) => setFiltroDraft((f) => ({ ...f, tipo: v as FiltriDraft["tipo"] }))}
                          strictFromList
                          aria-label="Filtra tipo documento"
                        />
                      </div>
                    </label>
                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                      Azienda (contiene)
                      <input className={`mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900`} value={filtroDraft.azienda} onChange={(e) => setFiltroDraft((f) => ({ ...f, azienda: e.target.value }))} />
                    </label>
                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                      Referente
                      <input className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900" value={filtroDraft.referente} onChange={(e) => setFiltroDraft((f) => ({ ...f, referente: e.target.value }))} />
                    </label>
                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                      Prodotto (nel testo righe)
                      <input className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900" value={filtroDraft.prodotto} onChange={(e) => setFiltroDraft((f) => ({ ...f, prodotto: e.target.value }))} />
                    </label>
                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                      Codice articolo
                      <input className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900" value={filtroDraft.codice} onChange={(e) => setFiltroDraft((f) => ({ ...f, codice: e.target.value }))} />
                    </label>
                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                      Settore
                      <input className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900" value={filtroDraft.settore} onChange={(e) => setFiltroDraft((f) => ({ ...f, settore: e.target.value }))} />
                    </label>
                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                      Creato da
                      <div className="mt-1">
                        <GlobalSelect
                          variant="filter"
                          inputClassName={globalInputFieldFilter}
                          items={[
                            { value: "", label: "Tutti" },
                            ...autoriOpts.map((a) => ({ value: a, label: a })),
                          ]}
                          value={filtroDraft.autore}
                          onChange={(v) => setFiltroDraft((f) => ({ ...f, autore: v }))}
                          strictFromList
                          aria-label="Filtra autore"
                        />
                      </div>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                        Importo min
                        <input className="mt-1 w-full rounded-lg border px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900" value={filtroDraft.imin} onChange={(e) => setFiltroDraft((f) => ({ ...f, imin: e.target.value }))} />
                      </label>
                      <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                        Importo max
                        <input className="mt-1 w-full rounded-lg border px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900" value={filtroDraft.imax} onChange={(e) => setFiltroDraft((f) => ({ ...f, imax: e.target.value }))} />
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                        Data da
                        <div className="mt-1">
                          <GlobalDatePickerYmd
                            valueYmd={filtroDraft.dataDa}
                            onChangeYmd={(v) => setFiltroDraft((f) => ({ ...f, dataDa: v }))}
                            aria-label="Data da"
                          />
                        </div>
                      </label>
                      <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                        Data a
                        <div className="mt-1">
                          <GlobalDatePickerYmd
                            valueYmd={filtroDraft.dataA}
                            onChangeYmd={(v) => setFiltroDraft((f) => ({ ...f, dataA: v }))}
                            aria-label="Data a"
                          />
                        </div>
                      </label>
                    </div>
                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                      Mese
                      <div className="mt-1">
                        <GlobalSelect
                          variant="filter"
                          inputClassName={globalInputFieldFilter}
                          items={[
                            { value: "__tutti__", label: "Tutti" },
                            ...Array.from({ length: 12 }, (_, i) => ({
                              value: String(i + 1),
                              label: String(i + 1),
                            })),
                          ]}
                          value={filtroDraft.mese}
                          onChange={(v) => setFiltroDraft((f) => ({ ...f, mese: v }))}
                          strictFromList
                          aria-label="Filtra mese"
                        />
                      </div>
                    </label>
                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                      Anno
                      <div className="mt-1">
                        <GlobalSelect
                          variant="filter"
                          inputClassName={globalInputFieldFilter}
                          items={[
                            { value: "__tutti__", label: "Tutti" },
                            ...anniOpts.map((y) => ({ value: String(y), label: String(y) })),
                          ]}
                          value={filtroDraft.anno}
                          onChange={(v) => setFiltroDraft((f) => ({ ...f, anno: v }))}
                          strictFromList
                          aria-label="Filtra anno"
                        />
                      </div>
                    </label>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" className={dsBtnNeutral} onClick={() => setFiltroDraft({ ...DRAFT_EMPTY })}>
                      Reimposta
                    </button>
                    <button type="button" className={dsBtnPrimary} onClick={applyFiltri}>
                      Applica
                    </button>
                  </div>
            </div>
          </div>
        </div>
        </div>

        <GestionaleListTable
          visibilityClass="mt-4"
          colgroup={
            <>
              <col className="w-[7.5rem]" />
              <col className="w-[9.5rem]" />
              <col />
              <col className="w-[22%]" />
              <col className="w-[5.5rem]" />
              <col className="w-[6.5rem]" />
              <col className="w-[18%]" />
              <col className={gestionaleListColAzioniClass} />
            </>
          }
          headRow={
            <>
              <GlobalTableSortTh
                label="Numero"
                columnKey="numeroProgressivo"
                sortColumn={bunderSortColumn}
                sortPhase={bunderSortPhase}
                onSort={onSortBunder}
              />
              <GlobalTableSortTh
                label="Tipo"
                columnKey="kind"
                sortColumn={bunderSortColumn}
                sortPhase={bunderSortPhase}
                onSort={onSortBunder}
              />
              <GlobalTableSortTh
                label="Azienda"
                columnKey="aziendaDestinatario"
                sortColumn={bunderSortColumn}
                sortPhase={bunderSortPhase}
                onSort={onSortBunder}
              />
              <GlobalTableSortTh
                label="Oggetto"
                columnKey="oggetto"
                sortColumn={bunderSortColumn}
                sortPhase={bunderSortPhase}
                onSort={onSortBunder}
              />
              <GlobalTableSortTh
                label="Data"
                columnKey="dataDocumento"
                sortColumn={bunderSortColumn}
                sortPhase={bunderSortPhase}
                onSort={onSortBunder}
              />
              <GlobalTableSortTh
                label="Totale"
                columnKey="totale"
                sortColumn={bunderSortColumn}
                sortPhase={bunderSortPhase}
                onSort={onSortBunder}
                align="right"
              />
              <GlobalTableSortTh
                label="Prodotti"
                columnKey="prodotti"
                sortColumn={bunderSortColumn}
                sortPhase={bunderSortPhase}
                onSort={onSortBunder}
              />
              <GestionaleListTableActionsHead />
            </>
          }
          empty={pagedFiltered.length === 0}
          emptyMessage="Nessun documento corrisponde ai filtri."
          colSpan={8}
        >
              {pagedFiltered.map((d) => {
                const tot = totaleDocumento(d);
                const prod = d.righe
                  .map((r) => r.nome)
                  .filter(Boolean)
                  .slice(0, 3)
                  .join(" · ");
                const dataIt = new Date(d.dataDocumento + "T12:00:00").toLocaleDateString("it-IT");
                return (
                  <tr key={d.id} className={gestionaleListTableRowClass}>
                    <td className={`${gestionaleListTableTd} whitespace-nowrap font-mono text-xs font-semibold`}>{d.numeroProgressivo}</td>
                    <td className={`${gestionaleListTableTd} text-xs`}>{bunderKindLabel(d.kind)}</td>
                    <td className={`min-w-0 ${gestionaleListTableTd}`} title={d.aziendaDestinatario}>
                      <span className="line-clamp-2 break-words">{d.aziendaDestinatario}</span>
                    </td>
                    <td className={`min-w-0 max-w-[1px] ${gestionaleListTableTd}`} title={d.oggetto}>
                      <span className="line-clamp-2 break-words">{d.oggetto}</span>
                    </td>
                    <td className={`${gestionaleListTableTdCenter} whitespace-nowrap text-xs text-zinc-600 dark:text-zinc-300`}>{dataIt}</td>
                    <td className={`${gestionaleListTableTdCenter} whitespace-nowrap font-medium`}>
                      {tot.toLocaleString("it-IT", { minimumFractionDigits: 2 })} €
                    </td>
                    <td className={`min-w-0 ${gestionaleListTableTd} text-xs text-zinc-600 dark:text-zinc-300`} title={prod}>
                      <span className="line-clamp-2">{prod || "—"}</span>
                    </td>
                    <td className={gestionaleListTableTdAzioni}>
                      <div className={gestionaleListTableActionsGroupEnd}>
                        <IconActionButton label="Modifica" className={dsTableActionBtnPrimary} onClick={() => setEditor({ open: true, doc: d })}>
                          <svg className={dsTableActionGlyph} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </IconActionButton>
                        <IconActionButton label="PDF" className={dsTableActionBtnSecondary} onClick={() => rowPdf(d)}>
                          <svg className={dsTableActionGlyph} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </IconActionButton>
                        <IconActionButton label="Word" className={dsTableActionBtnSecondary} onClick={() => rowWord(d)}>
                          <svg className={dsTableActionGlyph} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </IconActionButton>
                        <IconActionButton label="Duplica" className={dsTableActionBtnSecondary} onClick={() => duplica(d)}>
                          <svg className={dsTableActionGlyph} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m0 4h6a2 2 0 012 2v8a2 2 0 01-2 2h-8a2 2 0 01-2-2v-6" />
                          </svg>
                        </IconActionButton>
                        <IconActionButton label="Nuovo" className={dsTableActionBtnSecondary} onClick={() => nuovoDa(d)}>
                          <svg className={dsTableActionGlyph} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                        </IconActionButton>
                        <IconActionButton label="Elimina" className={dsTableActionBtnDanger} onClick={() => elimina(d)}>
                          <svg className={dsTableActionGlyph} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </IconActionButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
        </GestionaleListTable>
        {showPager ? <TablePagination page={page} pageCount={pageCount} onPageChange={setPage} label={label} /> : null}
      </ShellCard>
      </div>

      {wizardOpen ? (
        <LavorazioniModalShell onRequestClose={() => setWizardOpen(false)} title="Nuovo documento commerciale">
          <div className="p-4 sm:p-6">
            <p className="text-sm text-[color:var(--cab-text-muted)]">
              Seleziona il tipo. Il testo e le righe saranno generate con impostazione professionale; potrai modificarle
              nell&apos;editor.
            </p>
            <label className="mt-4 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Tipo
              <div className="mt-1">
                <GlobalSelect
                  variant="filter"
                  inputClassName={globalInputFieldFilter}
                  items={BUNDER_DOC_KIND_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
                  value={wizardKind}
                  onChange={(v) => setWizardKind(v as BunderDocKind)}
                  strictFromList
                  aria-label="Tipo nuovo documento"
                />
              </div>
            </label>
            <div className={`${gestionaleConfirmActionsClass} mt-4`}>
              <button type="button" className={`${dsBtnNeutral} min-h-[2.75rem] sm:min-h-0`} onClick={() => setWizardOpen(false)}>
                Annulla
              </button>
              <button type="button" className={`${dsBtnPrimary} min-h-[2.75rem] sm:min-h-0`} onClick={creaWizard}>
                Crea e apri
              </button>
            </div>
          </div>
        </LavorazioniModalShell>
      ) : null}

      <BunderEditorModal
        open={editor.open}
        doc={editor.doc}
        allDocs={docs}
        autore={authorTrim}
        onClose={() => setEditor({ open: false, doc: null })}
        onSave={onSaveEdited}
      />

      <Drawer open={logOpen} onClose={() => setLogOpen(false)} title="Log modifiche BUNDER" ariaLabel="Log modifiche BUNDER">
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-3">
          <div className={`${gestionaleLogScrollEmbeddedClass} min-h-0 flex-1`}>
                {logEntries.length === 0 ? (
                  <GestionaleLogEmpty message="Nessuna voce registrata." />
                ) : (
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
                              onDismiss={() => removeBunderChangeLogEntryById(entry.id)}
                            />
                          }
                        />
                      </li>
                    ))}
                  </GestionaleLogList>
                )}
              </div>
          {showLogPager ? (
            <TablePagination page={logPage} pageCount={logPageCount} onPageChange={setLogPage} label={logPagerLabel} />
          ) : null}
        </div>
      </Drawer>
      {confirmDialog}
    </>
  );
}
