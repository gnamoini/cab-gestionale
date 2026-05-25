"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { documentiService } from "@/src/services/documenti.service";
import { useDocumentiListQuery, useMezziListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { documentoRowToGestionale, toMezzoUI } from "@/lib/mezzi/mezzi-db-ui-adapter";
import {
  gestionaleToDocumentoInsert,
  gestionaleToDocumentoUpdate,
  uploadDocumentoBlob,
} from "@/lib/documenti/documenti-db-mapper";
import { dispatchGestionaleLocalMutation } from "@/lib/sync/gestionale-sync-dispatch";
import type { DocumentoGestionale } from "@/lib/types/gestionale";
import { PageHeader } from "@/components/gestionale/page-header";
import { GestionalePageToolbarActions } from "@/components/gestionale/page-header-toolbar";
import { ShellCard } from "@/components/gestionale/shell-card";
import { GestionaleSearchField } from "@/components/gestionale/gestionale-search-field";
import { TablePagination } from "@/components/gestionale/table-pagination";
import {
  appendDocumentiChangeLog,
  loadDocumentiChangeLog,
  removeDocumentiChangeLogEntryById,
  type DocumentiLogStored,
} from "@/lib/documenti/documenti-change-log-storage";
import { CAB_DOCUMENTI_LOG_REFRESH } from "@/lib/sistema/cab-events";
import {
  erpBtnNeutral,
  erpBtnNuovaLavorazione,
  erpFocus,
} from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import {
  dsPageToolbarBtn,
  dsStackPage,
  dsStickyToolbar,
  GESTIONALE_SEARCH_PLACEHOLDER,
  dsTableActionsGroupEnd,
  dsTableActionBtnPrimary,
  dsTableActionBtnDanger,
  dsTableActionBtnInfo,
  dsTableActionGlyph,
} from "@/lib/ui/design-system";
import { openUrlInNewTab } from "@/lib/pdf/open-url-new-tab";
import { Drawer, IconActionButton } from "@/components/design-system";
import {
  GestionaleLogEmpty,
  GestionaleLogEntryFourLines,
  GestionaleLogEntryDismissButton,
  GestionaleLogList,
  gestionaleLogScrollEmbeddedClass,
} from "@/components/gestionale/gestionale-log-ui";
import { buildModificaRigaFromChanges, type CampoChangeLike } from "@/lib/gestionale-log/view-model";
import { useAuth } from "@/context/auth-context";
import {
  countDocsInMarcaNode,
  documentoSenzaMarca,
  formatDocumentoRigaSintetica,
  getDocumentApriHref,
  labelCategoria,
  labelTipoFile,
  partitionMarcaLevelDocs,
  resolveDocumentoApplicazione,
  type DocumentiSortKey,
  type DocumentiSortPhase,
} from "@/components/gestionale/documenti/documenti-helpers";
import {
  DocumentiAdvancedFilterPanel,
  applyDocumentiSortSelect,
  documentiSortSelectValue,
} from "@/components/gestionale/documenti/documenti-advanced-filter-panel";
import {
  DOCUMENTI_ADVANCED_FILTERS_EMPTY,
  FILTER_ALL,
  documentiAdvancedFiltersActive,
  loadDocumentiAdvancedFiltersPersisted,
  saveDocumentiAdvancedFiltersPersisted,
  type DocumentiAdvancedFilters,
} from "@/lib/documenti/documenti-advanced-filters";
import {
  buildDocumentiFilteredView,
  documentiMarcaPageCount,
  documentiMarcaPagerLabel,
  sliceDocumentiTreePage,
  type DocumentiPageFilters,
} from "@/lib/documenti/documenti-list-ui-filters";
import { DocumentoEditModal, DocumentoInfoModal, UploadDocumentoModal } from "@/components/gestionale/documenti/documenti-modals";
import { buildDocumentiCatalogFromImpostazioni } from "@/lib/documenti/documenti-catalog";
import { createMezziListePrefsDefault } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { migrateMezziListePrefs } from "@/lib/mezzi/attrezzature-prefs";
import { useCabAppSettingsPayloadQuery } from "@/src/hooks/gestionale/use-settings-queries";
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import { useResponsiveListPageSize } from "@/lib/ui/use-responsive-list-page-size";
import { usePermissions } from "@/src/hooks/use-permissions";
import { READONLY_PERMISSION_HINT } from "@/src/lib/auth/permissions";

/** Preferenza ultima azione “comprimi / espandi tutto” sull’albero documenti. */
const DOCUMENTI_TREE_PREF_KEY = "cab-documenti-tree-pref";
const SEARCH_DEBOUNCE_MS = 320;

function readDocumentiTreePref(): "collapsed" | "expanded" | "default" {
  if (typeof window === "undefined") return "default";
  try {
    const v = window.localStorage.getItem(DOCUMENTI_TREE_PREF_KEY);
    if (v === "collapsed") return "collapsed";
    if (v === "expanded") return "expanded";
  } catch {
    /* ignore */
  }
  return "default";
}

function writeDocumentiTreePref(v: "collapsed" | "expanded") {
  try {
    window.localStorage.setItem(DOCUMENTI_TREE_PREF_KEY, v);
  } catch {
    /* ignore */
  }
}

function fmtDocVal(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v.trim() || "—";
  return String(v);
}

function diffDocumentiMetadati(before: DocumentoGestionale, after: DocumentoGestionale): CampoChangeLike[] {
  const out: CampoChangeLike[] = [];
  const push = (campo: string, a: unknown, b: unknown) => {
    const pa = fmtDocVal(a);
    const pb = fmtDocVal(b);
    if (pa !== pb) out.push({ campo, prima: pa, dopo: pb });
  };
  push("Nome", before.nome, after.nome);
  push("Categoria", labelCategoria(before.categoria), labelCategoria(after.categoria));
  push("Note", before.note ?? "", after.note ?? "");
  push("Ambito", before.applicabilita ?? "", after.applicabilita ?? "");
  push("Marca (assegnazione)", before.marcaKey ?? before.marca, after.marcaKey ?? after.marca);
  push("Modello (assegnazione)", before.modelloKey ?? before.macchina, after.modelloKey ?? after.macchina);
  push("Marca (legacy)", before.marca, after.marca);
  push("Modello (legacy)", before.macchina, after.macchina);
  push("Dimensione (KB)", before.dimensioneKb, after.dimensioneKb);
  return out;
}

function DocGlyph({ doc }: { doc: DocumentoGestionale }) {
  const base =
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-[9px] font-bold uppercase tracking-tight shadow-sm";
  const byCat =
    doc.categoria === "listini"
      ? "border-amber-200/90 bg-gradient-to-br from-amber-50 to-amber-100/80 text-amber-900 dark:border-amber-800/60 dark:from-amber-950/80 dark:to-amber-900/40 dark:text-amber-100"
      : doc.categoria === "cataloghi"
        ? "border-sky-200/90 bg-gradient-to-br from-sky-50 to-sky-100/80 text-sky-900 dark:border-sky-800/60 dark:from-sky-950/80 dark:to-sky-900/40 dark:text-sky-100"
        : doc.categoria === "manuali"
          ? "border-emerald-200/90 bg-gradient-to-br from-emerald-50 to-emerald-100/80 text-emerald-900 dark:border-emerald-800/60 dark:from-emerald-950/80 dark:to-emerald-900/40 dark:text-emerald-100"
          : "border-zinc-200/90 bg-gradient-to-br from-zinc-50 to-zinc-100/80 text-zinc-700 dark:border-zinc-600 dark:from-zinc-800 dark:to-zinc-900 dark:text-zinc-200";
  const icon =
    doc.categoria === "listini" ? (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      </svg>
    ) : doc.categoria === "cataloghi" ? (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path d="M4 6h16M4 12h10M4 18h16" />
      </svg>
    ) : doc.categoria === "manuali" ? (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
        <path d="M8 7h8M8 11h6" />
      </svg>
    ) : doc.tipoFile === "pdf" ? (
      <span aria-hidden>PDF</span>
    ) : (
      <span aria-hidden>{doc.tipoFile === "immagine" ? "IMG" : "FILE"}</span>
    );
  return (
    <div className={`${base} ${byCat}`} title={`${labelCategoria(doc.categoria)} · ${labelTipoFile(doc.tipoFile)}`}>
      {icon}
    </div>
  );
}

function MarcaGlyph({ nome }: { nome: string }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-surface-2)] text-[10px] font-bold text-[color:var(--cab-text-muted)] shadow-[var(--cab-shadow-sm)]">
      {nome.slice(0, 2).toUpperCase()}
    </span>
  );
}

function ArchiveDocRow({
  doc,
  selected,
  onSelect,
  onEdit,
  onDelete,
  onInfo,
  onToast,
  onApri,
  canEdit,
  canDelete,
}: {
  doc: DocumentoGestionale;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onInfo: () => void;
  onToast: (s: string) => void;
  onApri: () => void;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const href = getDocumentApriHref(doc);
  const stop = (e: MouseEvent) => e.stopPropagation();
  const senzaMarca = documentoSenzaMarca(doc);

  const handleEditClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (!canEdit) return;
    if (!window.confirm(`Modificare i metadati di «${doc.nome}»?`)) return;
    onEdit();
  };

  const handleDeleteClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (!canDelete) return;
    onDelete();
  };

  const actionButtons = (
    <>
      <IconActionButton
        label="Apri"
        className={dsTableActionBtnPrimary}
        disabled={!href}
        onClick={() => {
          if (!href) onToast("File non disponibile");
          else onApri();
        }}
      >
        <svg className={dsTableActionGlyph} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </IconActionButton>
      <IconActionButton label="Info" className={dsTableActionBtnInfo} onClick={onInfo}>
        <svg className={dsTableActionGlyph} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      </IconActionButton>
      <IconActionButton
        label="Modifica"
        tooltipContent={canEdit ? "Modifica" : "Sola lettura"}
        className={dsTableActionBtnPrimary}
        disabled={!canEdit}
        onClick={handleEditClick}
      >
        <svg className={dsTableActionGlyph} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </IconActionButton>
      <IconActionButton
        label="Elimina"
        tooltipContent={canDelete ? "Elimina" : "Sola lettura"}
        className={dsTableActionBtnDanger}
        disabled={!canDelete}
        onClick={handleDeleteClick}
      >
        <svg className={dsTableActionGlyph} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </IconActionButton>
    </>
  );

  return (
    <li
      id={`documento-row-${doc.id}`}
      role="option"
      aria-selected={selected}
      className={`group flex w-full cursor-pointer flex-col gap-2 border-b border-[color:var(--cab-border)] px-2.5 py-2 transition-[background-color] duration-150 last:border-b-0 md:flex-row md:items-center md:justify-between md:gap-3 ${
        senzaMarca
          ? "border-l-4 border-l-[color:var(--cab-warning)] bg-[color:color-mix(in_srgb,var(--cab-warning)_10%,var(--cab-surface))]"
          : selected
            ? "bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))]"
            : "hover:bg-[var(--cab-hover)]"
      } ${selected && !senzaMarca ? "ring-1 ring-inset ring-[color:color-mix(in_srgb,var(--cab-primary)_35%,var(--cab-border))]" : ""}`}
      onClick={onSelect}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <DocGlyph doc={doc} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-[color:var(--cab-text)]">{doc.nome}</p>
            {senzaMarca ? (
              <span
                className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[color:color-mix(in_srgb,var(--cab-warning)_22%,var(--cab-surface))] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[color:var(--cab-text)] ring-1 ring-[color:color-mix(in_srgb,var(--cab-warning)_50%,var(--cab-border))]"
                title="Assegna una marca per collocare il documento nell'archivio"
              >
                <span aria-hidden>⚠️</span>
                Senza marca
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-[11px] text-[color:var(--cab-text-muted)]">
            {formatDocumentoRigaSintetica(doc)} · {labelCategoria(doc.categoria)} · {labelTipoFile(doc.tipoFile)}
          </p>
        </div>
      </div>
      <div
        className={`${dsTableActionsGroupEnd} w-full shrink-0 justify-end pt-2 md:ml-auto md:w-auto md:pt-0`}
        onClick={stop}
      >
        {actionButtons}
      </div>
    </li>
  );
}

function SubTreeHeading({ title }: { title: string }) {
  return (
    <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">{title}</h3>
  );
}

export function DocumentiView() {
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const permissions = usePermissions();
  const canUploadDocuments = permissions.canUploadDocuments;
  const canDeleteRecords = permissions.canDeleteRecords;
  const { authorName: author } = useAuth();
  const authorTrim = author.trim() || "Operatore";
  const { data: settingsPayload } = useCabAppSettingsPayloadQuery();
  const appSettings = settingsPayload?.resolved;
  const mezziQuery = useMezziListQuery();
  const documentiQuery = useDocumentiListQuery();
  const mezziSnap = useMemo(() => (mezziQuery.data ?? []).map(toMezzoUI), [mezziQuery.data]);
  const [docBusy, setDocBusy] = useState(false);

  const catalog = useMemo(() => {
    const prefs = migrateMezziListePrefs(appSettings?.mezziListe ?? createMezziListePrefsDefault());
    return buildDocumentiCatalogFromImpostazioni(prefs, mezziSnap);
  }, [appSettings?.mezziListe, mezziSnap]);

  const docs = useMemo(
    () =>
      (documentiQuery.data ?? [])
        .map(documentoRowToGestionale)
        .map((d) => resolveDocumentoApplicazione({ ...d })),
    [documentiQuery.data],
  );

  const [searchInput, setSearchInput] = useState("");
  const [searchApplied, setSearchApplied] = useState("");
  const [advancedFilters, setAdvancedFilters] = useState<DocumentiAdvancedFilters>(
    () => loadDocumentiAdvancedFiltersPersisted() ?? DOCUMENTI_ADVANCED_FILTERS_EMPTY,
  );
  const [filtriEspansi, setFiltriEspansi] = useState(false);

  const [sortColumn, setSortColumn] = useState<DocumentiSortKey | null>(null);
  const [sortPhase, setSortPhase] = useState<DocumentiSortPhase>("natural");

  const [expandedMarche, setExpandedMarche] = useState<Set<string>>(() => new Set());
  const [expandedModelli, setExpandedModelli] = useState<Set<string>>(() => new Set());
  const documentiMarcheInitDone = useRef(false);
  const urlHydratedRef = useRef(false);

  const patchAdvancedFilters = useCallback((patch: Partial<DocumentiAdvancedFilters>) => {
    setAdvancedFilters((prev) => {
      const next = { ...prev, ...patch };
      saveDocumentiAdvancedFiltersPersisted(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setSearchApplied(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const flushPageSearch = useCallback(() => {
    setSearchApplied(searchInput.trim());
  }, [searchInput]);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [infoDoc, setInfoDoc] = useState<DocumentoGestionale | null>(null);
  const [editDoc, setEditDoc] = useState<DocumentoGestionale | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [logEntries, setLogEntries] = useState<DocumentiLogStored[]>(() => loadDocumentiChangeLog());

  useEffect(() => {
    function onLogRefresh() {
      setLogEntries(loadDocumentiChangeLog());
    }
    window.addEventListener(CAB_DOCUMENTI_LOG_REFRESH, onLogRefresh);
    return () => window.removeEventListener(CAB_DOCUMENTI_LOG_REFRESH, onLogRefresh);
  }, []);

  useEffect(() => {
    if (logOpen) setLogEntries(loadDocumentiChangeLog());
  }, [logOpen]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (urlHydratedRef.current || catalog.length === 0) return;
    urlHydratedRef.current = true;

    const rawQ = searchParams.get("q");
    if (rawQ?.trim()) {
      const q = decodeURIComponent(rawQ.trim());
      setSearchInput(q);
      setSearchApplied(q);
    }

    const marcaQ = searchParams.get("marca")?.trim();
    const modelloQ = searchParams.get("modello")?.trim();
    const mid = searchParams.get("mezzoId")?.trim();
    const mezzo = mid ? mezziSnap.find((m) => m.id === mid) : null;
    const marcaNome = marcaQ || mezzo?.marca?.trim() || "";
    if (!marcaNome) return;

    const mar = catalog.find((c) => c.nome.trim().toLowerCase() === marcaNome.toLowerCase());
    if (!mar) return;

    let modelloId: string = FILTER_ALL;
    const modelloNome = modelloQ || mezzo?.modello?.trim() || "";
    if (modelloNome) {
      const mac = mar.macchine.find((x) => x.nome.trim().toLowerCase() === modelloNome.toLowerCase());
      if (mac) {
        modelloId = mac.id;
        setExpandedModelli((p) => new Set(p).add(`${mar.id}::${mac.id}`));
      }
    }

    setAdvancedFilters((prev) => {
      const next = { ...prev, marca: mar.id, modello: modelloId };
      saveDocumentiAdvancedFiltersPersisted(next);
      return next;
    });
    setExpandedMarche((p) => new Set(p).add(mar.id));
  }, [searchParams, mezziSnap, catalog]);

  useEffect(() => {
    if (catalog.length === 0 || documentiMarcheInitDone.current) return;
    documentiMarcheInitDone.current = true;
    if (readDocumentiTreePref() === "collapsed") return;
    setExpandedMarche(new Set(catalog.map((m) => m.id)));
  }, [catalog]);

  const pageFilters = useMemo(
    (): DocumentiPageFilters => ({
      search: searchApplied,
      ...advancedFilters,
    }),
    [searchApplied, advancedFilters],
  );

  const searchActive = searchApplied.trim().length > 0;

  const filteredView = useMemo(
    () =>
      buildDocumentiFilteredView(docs, catalog, mezziSnap, pageFilters, {
        sortColumn,
        sortPhase,
      }),
    [docs, catalog, mezziSnap, pageFilters, sortColumn, sortPhase],
  );

  const {
    senzaMarca: documentiSenzaMarca,
    conMarca: documentiConMarca,
    tree,
    senzaCollocazione: documentiSenzaCollocazione,
    totalDocs,
  } = filteredView;

  const listPageSize = useResponsiveListPageSize();
  const [marcaPage, setMarcaPage] = useState(1);
  const totalMarche = tree.length;
  const docPageCount = documentiMarcaPageCount(totalMarche, listPageSize);
  const showDocPager = totalMarche > listPageSize;

  const docListDeps = useMemo(
    () =>
      `${searchApplied}|${advancedFilters.marca}|${advancedFilters.modello}|${advancedFilters.categoria}|${sortColumn ?? ""}|${sortPhase}|${totalDocs}|${totalMarche}`,
    [searchApplied, advancedFilters, sortColumn, sortPhase, totalDocs, totalMarche],
  );

  useEffect(() => {
    setMarcaPage((p) => Math.min(Math.max(1, p), docPageCount));
  }, [docPageCount]);

  useEffect(() => {
    setMarcaPage(1);
  }, [docListDeps, listPageSize]);

  const pagedTree = useMemo(
    () => sliceDocumentiTreePage(tree, marcaPage, listPageSize),
    [tree, marcaPage, listPageSize],
  );

  const docPagerLabel = useMemo(
    () => documentiMarcaPagerLabel(marcaPage, listPageSize, totalMarche),
    [marcaPage, listPageSize, totalMarche],
  );

  const {
    page: docLogPage,
    setPage: setDocLogPage,
    pageCount: docLogPageCount,
    sliceItems: sliceDocLogEntries,
    showPager: showDocLogPager,
    label: docLogPagerLabel,
    resetPage: resetDocLogPage,
  } = useClientPagination(logEntries.length, listPageSize);
  useEffect(() => {
    resetDocLogPage();
  }, [logOpen, logEntries.length, listPageSize, resetDocLogPage]);
  const pagedDocLogEntries = useMemo(() => sliceDocLogEntries(logEntries), [logEntries, sliceDocLogEntries, docLogPage]);

  const hasDocumentiInLista = totalDocs > 0;

  useEffect(() => {
    if (
      selectedDocId &&
      !documentiSenzaMarca.some((d) => d.id === selectedDocId) &&
      !documentiConMarca.some((d) => d.id === selectedDocId)
    ) {
      setSelectedDocId(null);
    }
  }, [documentiConMarca, documentiSenzaMarca, selectedDocId]);

  const didAutoExpandTree = useRef(false);
  useEffect(() => {
    if (didAutoExpandTree.current) return;
    if (tree.length === 0) return;
    if (readDocumentiTreePref() === "collapsed") {
      didAutoExpandTree.current = true;
      return;
    }
    const modKeys = new Set<string>();
    for (const { marca, modelli } of tree) {
      for (const mod of modelli) {
        const mk = `${marca.id}::${mod.modello.id}`;
        if (mod.files.length > 0) modKeys.add(mk);
      }
    }
    if (modKeys.size === 0) return;
    setExpandedModelli((p) => new Set([...p, ...modKeys]));
    didAutoExpandTree.current = true;
  }, [tree]);

  const sortSelectValue = useMemo(
    () => documentiSortSelectValue(sortColumn, sortPhase),
    [sortColumn, sortPhase],
  );

  const onSortSelect = useCallback((v: string) => {
    applyDocumentiSortSelect(v, setSortColumn, setSortPhase);
  }, []);

  const refreshDocumenti = useCallback(() => {
    dispatchGestionaleLocalMutation(qc, ["documenti"]);
  }, [qc]);

  const handleUpload = useCallback(
    async (payload: Omit<DocumentoGestionale, "id">) => {
      if (!canUploadDocuments) return;
      setDocBusy(true);
      try {
        let urlFile = payload.urlDocumento?.trim() ?? "";
        if (payload.urlBlob?.trim()) {
          const up = await uploadDocumentoBlob(payload.urlBlob, payload.nome || "documento");
          if (!up.success || !up.data) {
            setToast(up.error ?? "Caricamento file non riuscito.");
            return;
          }
          urlFile = up.data;
          try {
            URL.revokeObjectURL(payload.urlBlob);
          } catch {
            /* ignore */
          }
        }
        if (!urlFile) {
          setToast("File non disponibile per il salvataggio.");
          return;
        }
        const insert = gestionaleToDocumentoInsert(payload, urlFile);
        const res = await documentiService.create(insert);
        if (!res.success || !res.data) {
          setToast(res.error ?? "Impossibile salvare il documento.");
          return;
        }
        const row = resolveDocumentoApplicazione(documentoRowToGestionale(res.data));
        appendDocumentiChangeLog({
          tone: "create",
          tipoRiga: "CARICAMENTO",
          oggettoRiga: `Documento: ${row.nome}`,
          modificaRiga: `Upload in archivio. Categoria: ${labelCategoria(row.categoria)}.`,
          autore: authorTrim,
          atIso: new Date().toISOString(),
        });
        refreshDocumenti();
        setToast("Documento caricato.");
      } finally {
        setDocBusy(false);
      }
    },
    [authorTrim, refreshDocumenti, canUploadDocuments],
  );

  const handleSaveEdit = useCallback(
    async (next: DocumentoGestionale) => {
      if (!canUploadDocuments) return;
      const old = docs.find((d) => d.id === next.id);
      setDocBusy(true);
      try {
        const update = gestionaleToDocumentoUpdate(next);
        const res = await documentiService.update(next.id, update);
        if (!res.success || !res.data) {
          setToast(res.error ?? "Impossibile aggiornare il documento.");
          return;
        }
        if (old) {
          const saved = resolveDocumentoApplicazione(documentoRowToGestionale(res.data));
          const changes = diffDocumentiMetadati(old, saved);
          if (changes.length > 0) {
            appendDocumentiChangeLog({
              tone: "update",
              tipoRiga: "MODIFICA",
              oggettoRiga: `Documento: ${saved.nome}`,
              modificaRiga: buildModificaRigaFromChanges(changes),
              autore: authorTrim,
              atIso: new Date().toISOString(),
            });
          }
        }
        refreshDocumenti();
        setToast("Documento aggiornato.");
      } finally {
        setDocBusy(false);
      }
    },
    [docs, authorTrim, refreshDocumenti, canUploadDocuments],
  );

  const handleDelete = useCallback(
    async (victim: DocumentoGestionale) => {
      if (!canDeleteRecords) return;
      const ok = window.confirm(
        documentoSenzaMarca(victim)
          ? `Eliminare definitivamente «${victim.nome}»? Il documento non ha marca assegnata.`
          : `Eliminare definitivamente «${victim.nome}»?`,
      );
      if (!ok) return;
      setDocBusy(true);
      try {
        const res = await documentiService.remove(victim.id);
        if (!res.success) {
          setToast(res.error ?? "Impossibile eliminare il documento.");
          return;
        }
        appendDocumentiChangeLog({
          tone: "delete",
          tipoRiga: "ELIMINAZIONE",
          oggettoRiga: `Documento: ${victim.nome}`,
          modificaRiga: `Rimosso dall’archivio. Categoria: ${labelCategoria(victim.categoria)}.`,
          autore: authorTrim,
          atIso: new Date().toISOString(),
        });
        const blob = victim.urlBlob;
        if (blob) {
          try {
            URL.revokeObjectURL(blob);
          } catch {
            /* ignore */
          }
        }
        setSelectedDocId((cur) => (cur === victim.id ? null : cur));
        setInfoDoc((d) => (d?.id === victim.id ? null : d));
        setEditDoc((d) => (d?.id === victim.id ? null : d));
        refreshDocumenti();
        setToast("Documento eliminato.");
      } finally {
        setDocBusy(false);
      }
    },
    [authorTrim, refreshDocumenti, canDeleteRecords],
  );

  function openDoc(doc: DocumentoGestionale) {
    const href = getDocumentApriHref(doc);
    if (!href) {
      setToast("File non disponibile");
      return;
    }
    openUrlInNewTab(href, { revokeBlobUrlAfterMs: href.startsWith("blob:") ? 120_000 : undefined });
  }

  function toggleMarca(id: string) {
    setExpandedMarche((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function toggleModello(key: string) {
    setExpandedModelli((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  }

  const collapseAllTreeGroups = useCallback(() => {
    setExpandedMarche(new Set());
    setExpandedModelli(new Set());
    writeDocumentiTreePref("collapsed");
  }, []);

  const expandAllTreeGroups = useCallback(() => {
    const mar = new Set<string>();
    const mod = new Set<string>();
    for (const { marca, modelli } of pagedTree) {
      mar.add(marca.id);
      for (const { modello } of modelli) {
        mod.add(`${marca.id}::${modello.id}`);
      }
    }
    setExpandedMarche(mar);
    setExpandedModelli(mod);
    writeDocumentiTreePref("expanded");
  }, [pagedTree]);

  function marcaOpen(id: string) {
    return searchActive || expandedMarche.has(id);
  }

  function modelloOpen(marcaId: string, modelloId: string) {
    return searchActive || expandedModelli.has(`${marcaId}::${modelloId}`);
  }

  const resetRicerca = useCallback(() => {
    setSearchInput("");
    setSearchApplied("");
  }, []);

  const resetFiltri = useCallback(() => {
    setAdvancedFilters(DOCUMENTI_ADVANCED_FILTERS_EMPTY);
    saveDocumentiAdvancedFiltersPersisted(DOCUMENTI_ADVANCED_FILTERS_EMPTY);
    setFiltriEspansi(false);
    setSortColumn(null);
    setSortPhase("natural");
    setMarcaPage(1);
    resetRicerca();
  }, [resetRicerca]);

  const hasAdvancedPanelFilters = documentiAdvancedFiltersActive(advancedFilters);
  const hasPageClientFilters = searchActive || hasAdvancedPanelFilters;

  return (
    <>
      <PageHeader
        title="Documenti"
        actions={
          <GestionalePageToolbarActions
            canUndo={false}
            undoDisabled
            onOpenLog={() => setLogOpen(true)}
            logTitle="Storico modifiche documenti (ultime 200)"
          />
        }
      />

      <div className={dsStackPage}>
        <ShellCard>
        <div className={`${dsStickyToolbar} -mx-1 sm:mx-0`}>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <button
                type="button"
                onClick={() => setUploadOpen(true)}
                disabled={docBusy || documentiQuery.isLoading || !canUploadDocuments}
                title={!canUploadDocuments ? READONLY_PERMISSION_HINT : undefined}
                className={`${erpBtnNuovaLavorazione} h-11 shrink-0 disabled:opacity-60`}
              >
                <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Carica documento
              </button>
              <GestionaleSearchField
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    flushPageSearch();
                  }
                }}
                placeholder={GESTIONALE_SEARCH_PLACEHOLDER}
                aria-label="Cerca documenti"
                wrapperClassName="flex-1 sm:min-w-[12rem]"
              />
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
                {hasAdvancedPanelFilters ? (
                  <span
                    className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--cab-primary)] ring-2 ring-[var(--cab-surface)]"
                    title="Filtri attivi"
                    aria-hidden
                  ></span>
                ) : null}
              </button>
            </div>

            <div className="flex flex-col gap-2 border-t border-[color:var(--cab-border)] pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="inline-flex items-baseline gap-1 rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-border-strong)_85%,var(--cab-border))] bg-[var(--cab-surface)] px-2.5 py-1 text-xs text-[color:var(--cab-text-muted)] shadow-[var(--cab-shadow-sm)]">
                  <span className="tabular-nums text-sm font-semibold text-[color:var(--cab-text)]">
                    {totalDocs}
                  </span>
                  <span>risultat{totalDocs === 1 ? "o" : "i"}</span>
                </span>
                {hasPageClientFilters ? (
                  <span className="rounded-md bg-[color:color-mix(in_srgb,var(--cab-primary)_14%,var(--cab-surface))] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text)] ring-1 ring-[color:color-mix(in_srgb,var(--cab-primary)_35%,var(--cab-border))]">
                    Filtri attivi
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <button type="button" className={dsPageToolbarBtn} onClick={resetRicerca}>
                  Pulisci ricerca
                </button>
                <button type="button" className={dsPageToolbarBtn} onClick={resetFiltri}>
                  Reimposta filtri
                </button>
              </div>
            </div>
          </div>
        </div>

          <div
            className={`mt-3 grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              filtriEspansi ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            }`}
          >
            <div className="min-h-0 overflow-hidden">
              <DocumentiAdvancedFilterPanel
                filters={advancedFilters}
                onChange={patchAdvancedFilters}
                catalog={catalog}
                sortSelectValue={sortSelectValue}
                onSortSelect={onSortSelect}
              />
            </div>
          </div>

        <section className="mt-4 min-w-0" aria-label="Albero documenti">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            {hasDocumentiInLista ? (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={collapseAllTreeGroups} className={`${dsPageToolbarBtn} h-9 px-3 text-xs`} title="Chiudi tutti i gruppi">
                  Comprimi tutto
                </button>
                <button type="button" onClick={expandAllTreeGroups} className={`${dsPageToolbarBtn} h-9 px-3 text-xs`} title="Apri tutti i gruppi della pagina">
                  Espandi tutto
                </button>
              </div>
            ) : null}
          </div>
          <div className="overflow-hidden rounded-[var(--ds-radius-xl)] border border-[color:var(--cab-border)] bg-[var(--cab-card)] shadow-[var(--cab-shadow-sm)]">
              {documentiQuery.isLoading ? (
                <p className="p-8 text-center text-sm text-[color:var(--cab-text-muted)]">Caricamento documenti…</p>
              ) : documentiQuery.isError ? (
                <p className="p-8 text-center text-sm text-[color:var(--cab-danger)]">
                  Impossibile caricare i documenti. Riprova più tardi.
                </p>
              ) : !hasDocumentiInLista ? (
                <p className="p-8 text-center text-sm text-[color:var(--cab-text-muted)]">Nessun documento corrisponde ai filtri.</p>
              ) : (
                <div className="divide-y divide-[color:var(--cab-border)]">
                  {documentiSenzaMarca.length > 0 ? (
                    <div className="rounded-t-[var(--ds-radius-xl)] border-b-2 border-[color:color-mix(in_srgb,var(--cab-warning)_55%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-warning)_12%,var(--cab-surface))] p-3 sm:p-4">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="text-base" aria-hidden>
                          ⚠️
                        </span>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-[color:var(--cab-text)]">
                          Senza marca ({documentiSenzaMarca.length})
                        </p>
                      </div>
                      <p className="text-xs leading-snug text-[color:var(--cab-text-muted)]">
                        Questi documenti restano sempre visibili. Apri la scheda e assegna marca (e modello) quando sei pronto.
                      </p>
                      <ul
                        className="mt-2 overflow-hidden rounded-[var(--ds-radius-lg)] bg-[var(--cab-card)] ring-1 ring-inset ring-[color:color-mix(in_srgb,var(--cab-warning)_40%,var(--cab-border))]"
                        role="listbox"
                      >
                        {documentiSenzaMarca.map((d) => (
                          <ArchiveDocRow
                            key={d.id}
                            doc={d}
                            selected={selectedDocId === d.id}
                            onSelect={() => setSelectedDocId(d.id)}
                            onEdit={() => setEditDoc(d)}
                            onDelete={() => handleDelete(d)}
                            onInfo={() => setInfoDoc(d)}
                            onToast={setToast}
                            onApri={() => openDoc(d)}
                            canEdit={canUploadDocuments}
                            canDelete={canDeleteRecords}
                          />
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {pagedTree.map((node, marcaIndex) => {
                    const { marca, filesMarca, modelli } = node;
                    const { listini, altriMarca } = partitionMarcaLevelDocs(filesMarca);
                    const docCountMarca = countDocsInMarcaNode(node);
                    const isLastMarcaInTree =
                      marcaIndex === pagedTree.length - 1 &&
                      documentiSenzaCollocazione.length === 0 &&
                      !showDocPager;
                    const isFirstMarcaInTree =
                      marcaIndex === 0 && documentiSenzaMarca.length === 0 && marcaPage === 1;
                    return (
                      <div
                        key={marca.id}
                        className={[
                          "bg-[var(--cab-surface)]",
                          isFirstMarcaInTree ? "overflow-hidden rounded-t-[var(--ds-radius-xl)]" : "",
                          isLastMarcaInTree && !marcaOpen(marca.id) ? "overflow-hidden rounded-b-[var(--ds-radius-xl)]" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <button
                          type="button"
                          onClick={() => toggleMarca(marca.id)}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--cab-hover)] sm:px-4"
                          aria-expanded={marcaOpen(marca.id)}
                        >
                          <MarcaGlyph nome={marca.nome} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-[color:var(--cab-text)]">{marca.nome}</p>
                            <p className="text-[11px] text-[color:var(--cab-text-muted)]">
                              <span className="font-medium tabular-nums text-[color:var(--cab-text)]">{docCountMarca}</span>{" "}
                              document{docCountMarca === 1 ? "o" : "i"}
                              {modelli.length > 0 ? (
                                <>
                                  {" · "}
                                  {modelli.length} modell{modelli.length === 1 ? "o" : "i"}
                                </>
                              ) : null}
                            </p>
                          </div>
                          <svg
                            className={`h-5 w-5 shrink-0 text-[color:var(--cab-text-muted)] transition-transform duration-200 ${marcaOpen(marca.id) ? "rotate-180" : ""}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                            aria-hidden
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${marcaOpen(marca.id) ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                          <div className="min-h-0 overflow-hidden">
                            <div
                              className={`space-y-4 border-t border-[color:var(--cab-border)] bg-[var(--cab-surface-2)]/50 px-3 pb-3 pt-3 sm:px-4 ${
                                isLastMarcaInTree ? "rounded-b-[var(--ds-radius-xl)]" : ""
                              }`}
                            >
                              {listini.length > 0 ? (
                                <div>
                                  <SubTreeHeading title="Listini" />
                                  <ul
                                    className="mt-1 overflow-hidden rounded-[var(--ds-radius-md)] ring-1 ring-inset ring-[color:var(--cab-border)]"
                                    role="listbox"
                                  >
                                    {listini.map((d) => (
                                      <ArchiveDocRow
                                        key={d.id}
                                        doc={d}
                                        selected={selectedDocId === d.id}
                                        onSelect={() => setSelectedDocId(d.id)}
                                        onEdit={() => setEditDoc(d)}
                                        onDelete={() => handleDelete(d)}
                                        onInfo={() => setInfoDoc(d)}
                                        onToast={setToast}
                                        onApri={() => openDoc(d)}
                                        canEdit={canUploadDocuments}
                                        canDelete={canDeleteRecords}
                                      />
                                    ))}
                                  </ul>
                                </div>
                              ) : null}

                              {altriMarca.length > 0 ? (
                                <div>
                                  <SubTreeHeading title="Generali (marca)" />
                                  <ul
                                    className="mt-1 overflow-hidden rounded-[var(--ds-radius-md)] ring-1 ring-inset ring-[color:var(--cab-border)]"
                                    role="listbox"
                                  >
                                    {altriMarca.map((d) => (
                                      <ArchiveDocRow
                                        key={d.id}
                                        doc={d}
                                        selected={selectedDocId === d.id}
                                        onSelect={() => setSelectedDocId(d.id)}
                                        onEdit={() => setEditDoc(d)}
                                        onDelete={() => handleDelete(d)}
                                        onInfo={() => setInfoDoc(d)}
                                        onToast={setToast}
                                        onApri={() => openDoc(d)}
                                        canEdit={canUploadDocuments}
                                        canDelete={canDeleteRecords}
                                      />
                                    ))}
                                  </ul>
                                </div>
                              ) : null}

                              <div>
                                <SubTreeHeading title="Modelli" />
                                <div className="mt-1 overflow-hidden rounded-[var(--ds-radius-lg)] ring-1 ring-inset ring-[color:var(--cab-border)]">
                                  {modelli
                                    .filter(({ files }) => files.length > 0)
                                    .map(({ modello, files }, modelloIndex) => {
                                    const mk = `${marca.id}::${modello.id}`;
                                    return (
                                      <div
                                        key={mk}
                                        className={
                                          modelloIndex > 0 ? "border-t border-[color:var(--cab-border)]" : ""
                                        }
                                      >
                                        <button
                                          type="button"
                                          onClick={() => toggleModello(mk)}
                                          className="flex w-full items-center gap-2 bg-[var(--cab-surface)]/60 px-3 py-2.5 text-left transition-colors hover:bg-[var(--cab-hover)]"
                                          aria-expanded={modelloOpen(marca.id, modello.id)}
                                        >
                                          <span className="w-4 shrink-0 text-center text-xs font-medium text-[color:var(--cab-text-muted)]" aria-hidden>
                                            ·
                                          </span>
                                          <span className="flex-1 text-sm font-medium text-[color:var(--cab-text)]">{modello.nome}</span>
                                          <span className="rounded-full bg-[var(--cab-surface-2)] px-2 py-0.5 text-[10px] font-semibold tabular-nums text-[color:var(--cab-text-muted)]">
                                            {files.length}
                                          </span>
                                          <svg
                                            className={`h-4 w-4 shrink-0 text-[color:var(--cab-text-muted)] transition-transform ${modelloOpen(marca.id, modello.id) ? "rotate-180" : ""}`}
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            strokeWidth={2}
                                          >
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                          </svg>
                                        </button>
                                        <div
                                          className={`grid bg-[var(--cab-card)] transition-[grid-template-rows] duration-200 ${modelloOpen(marca.id, modello.id) ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                                        >
                                          <div className="min-h-0 overflow-hidden border-t border-[color:var(--cab-border)]">
                                            <ul className="py-0.5" role="listbox">
                                              {files.map((d) => (
                                                <ArchiveDocRow
                                                  key={d.id}
                                                  doc={d}
                                                  selected={selectedDocId === d.id}
                                                  onSelect={() => setSelectedDocId(d.id)}
                                                  onEdit={() => setEditDoc(d)}
                                                  onDelete={() => handleDelete(d)}
                                                  onInfo={() => setInfoDoc(d)}
                                                  onToast={setToast}
                                                  onApri={() => openDoc(d)}
                                                  canEdit={canUploadDocuments}
                                                  canDelete={canDeleteRecords}
                                                />
                                              ))}
                                            </ul>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {documentiSenzaCollocazione.length > 0 ? (
                    <div className="rounded-b-[var(--ds-radius-xl)] border-t border-[color:color-mix(in_srgb,var(--cab-warning)_45%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-warning)_8%,var(--cab-surface))] p-3 sm:p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--cab-text)]">Senza collocazione</p>
                      <p className="mt-1 text-xs leading-snug text-[color:var(--cab-text-muted)]">
                        Marca o modello non allineati all&apos;anagrafica. Aggiorna le impostazioni o il documento.
                      </p>
                      <ul
                        className="mt-2 overflow-hidden rounded-[var(--ds-radius-lg)] ring-1 ring-inset ring-[color:color-mix(in_srgb,var(--cab-warning)_35%,var(--cab-border)]"
                        role="listbox"
                      >
                        {documentiSenzaCollocazione.map((d) => (
                          <ArchiveDocRow
                            key={d.id}
                            doc={d}
                            selected={selectedDocId === d.id}
                            onSelect={() => setSelectedDocId(d.id)}
                            onEdit={() => setEditDoc(d)}
                            onDelete={() => handleDelete(d)}
                            onInfo={() => setInfoDoc(d)}
                            onToast={setToast}
                            onApri={() => openDoc(d)}
                            canEdit={canUploadDocuments}
                            canDelete={canDeleteRecords}
                          />
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
            {showDocPager ? (
              <TablePagination
                page={marcaPage}
                pageCount={docPageCount}
                onPageChange={setMarcaPage}
                label={docPagerLabel}
                className="rounded-b-[var(--ds-radius-xl)] border border-t-0 border-[color:var(--cab-border)] bg-[var(--cab-surface-2)]/40"
              />
            ) : null}
          </section>
        </ShellCard>
      </div>

      {uploadOpen && canUploadDocuments ? (
        <UploadDocumentoModal catalog={catalog} onRequestClose={() => setUploadOpen(false)} onSubmit={handleUpload} />
      ) : null}

      {infoDoc ? (
        <DocumentoInfoModal
          doc={infoDoc}
          onRequestClose={() => setInfoDoc(null)}
          onEdit={() => {
            const d = infoDoc;
            setInfoDoc(null);
            setEditDoc(d);
          }}
        />
      ) : null}

      {editDoc && canUploadDocuments ? (
        <DocumentoEditModal key={editDoc.id} doc={editDoc} catalog={catalog} onRequestClose={() => setEditDoc(null)} onSave={handleSaveEdit} />
      ) : null}

      <Drawer open={logOpen} onClose={() => setLogOpen(false)} title="Log modifiche documenti" ariaLabel="Log modifiche documenti">
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-3">
          <div className={`${gestionaleLogScrollEmbeddedClass} min-h-0 flex-1`}>
            {logEntries.length === 0 ? (
                  <GestionaleLogEmpty message="Nessuna modifica registrata." />
                ) : (
                  <GestionaleLogList>
                    {pagedDocLogEntries.map((entry) => (
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
                              onDismiss={() => removeDocumentiChangeLogEntryById(entry.id)}
                            />
                          }
                        />
                      </li>
                    ))}
                  </GestionaleLogList>
            )}
          </div>
          {showDocLogPager ? (
            <TablePagination page={docLogPage} pageCount={docLogPageCount} onPageChange={setDocLogPage} label={docLogPagerLabel} />
          ) : null}
        </div>
      </Drawer>

      {toast ? (
        <p
          className="fixed bottom-6 left-1/2 z-[110] max-w-sm -translate-x-1/2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-center text-xs font-medium text-zinc-700 shadow-lg dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
          role="status"
          aria-live="polite"
        >
          {toast}
        </p>
      ) : null}
    </>
  );
}
