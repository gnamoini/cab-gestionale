"use client";

import { OptionalTooltip, TruncatedTextTooltip, Tooltip } from "@/components/ui";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { documentiEntry } from "@/lib/domain/documenti-entry";
import { useDocumentiListQuery, useLogListQuery, useMezziListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { documentoRowToGestionale } from "@/lib/mezzi/mezzi-db-ui-adapter";
import { deleteDocumentoStoragePath } from "@/lib/documenti/delete-documento-fully";
import {
  gestionaleToDocumentoInsert,
  gestionaleToDocumentoUpdate,
  uploadDocumentoBlob,
  uploadDocumentoFile,
} from "@/lib/documenti/documenti-db-mapper";
import { buildDocumentPreviewUrl } from "@/lib/documents/document-preview-url";
import { DocumentThumbnail } from "@/components/gestionale/documenti/document-thumbnail";
import { useUploadFeedback } from "@/context/upload-feedback-context";
import { invalidateEntity } from "@/lib/cache/minimal-invalidation-contract";
import { invalidateAfterMagazzinoOrMovimenti } from "@/src/lib/react-query/invalidate-related";
import { cabSyncEventForEntity } from "@/lib/sync/gestionale-sync-dispatch";
import { warmupDocumentPreview } from "@/lib/observability/asset-cache-warmup";
import { traceMutationLifecycle } from "@/lib/observability/trace-mutation-lifecycle";
import { useGestionaleListSearch } from "@/lib/search/use-gestionale-list-search";
import type { DocumentoGestionale } from "@/lib/types/gestionale";
import { DocumentiTableSection } from "@/components/gestionale/documenti/documenti-page-structure";
import {
  pageActionLogItem,
  type PageActionItem,
} from "@/components/ui";
import { ShellCard } from "@/components/gestionale/shell-card";
import { GestionaleSearchField } from "@/components/gestionale/gestionale-search-field";
import { TablePagination } from "@/components/gestionale/table-pagination";
import { buildLogModificheDisplayEntries, logAutoreLabel } from "@/lib/gestionale-log/log-modifiche-view-model";
import {
  erpBtnNeutral,
  erpBtnNuovaLavorazione,
  erpFocus,
} from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import {
  dsPageToolbarBtn,
  dsPageToolbarCtaCompact,
  GESTIONALE_SEARCH_PLACEHOLDER,
  dsTableActionsGroupEnd,
  dsTableActionBtnPrimary,
  dsTableActionBtnInfo,
  dsTableActionBtnSecondary,
  dsTableActionGlyph,
} from "@/lib/ui/design-system";
import { PageHeaderPageActionMenu } from "@/components/gestionale/page-header-actions-portal";
import {
  IconActionButton,
  LoadingButton,
  LoadingErrorState,
  LoadingSkeletonBlock,
  PageToolbar,
  PageToolbarCtaLabel,
  PageToolbarResultCount,
  SkeletonBoundary,
} from "@/components/design-system";
import { buildModificaRigaFromChanges, type CampoChangeLike } from "@/lib/gestionale-log/view-model";
import { useAuth } from "@/context/auth-context";
import {
  COLLAPSIBLE_LEGACY_EXPAND_ALL_KEY,
  collapsibleExpandedBoolPref,
  collapsibleSetPref,
  read,
  useCollapsiblePreference,
  write,
} from "@/lib/ui/collapsible-prefs";
import {
  canOpenDocumento,
  documentoSenzaMarca,
  documentoSenzaMarcaConAvviso,
  documentoFileUnavailableLabel,
  formatDocumentoRigaSintetica,
  openDocumentoFile,
  labelCategoria,
  labelTipoFile,
  resolveDocumentoApplicazione,
  type ArchiveDocMarcaNode,
  type DocumentiSortKey,
  type DocumentiSortPhase,
} from "@/components/gestionale/documenti/documenti-helpers";
import {
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
  documentiMarcaPageCount,
  documentiMarcaPagerLabel,
  sliceDocumentiTreePage,
  type DocumentiPageFilters,
} from "@/lib/documenti/documenti-list-ui-filters";
import { useDocumentiListDerived } from "@/lib/documenti/use-documenti-list-derived";
import { buildDocumentiCatalogFromImpostazioni } from "@/lib/documenti/documenti-catalog";
import { createMezziListePrefsDefault } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { migrateMezziListePrefs } from "@/lib/mezzi/attrezzature-prefs";
import { useCabAppSettingsPayloadQuery } from "@/src/hooks/gestionale/use-settings-queries";
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import { useResponsiveListPageSize } from "@/lib/ui/use-responsive-list-page-size";
import { GestionaleSectionGate } from "@/components/gestionale/gestionale-section-gate";
import { layoutPageRoot } from "@/lib/ui/responsive-layout-core";
import { SettingsEliminaConfirmDialog } from "@/components/dashboard/settings-elimina-confirm-dialog";
import { useGestionaleConfirm } from "@/src/hooks/use-gestionale-confirm";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { usePermissionsSnapshot } from "@/src/hooks/use-permissions";
import { READONLY_PERMISSION_HINT } from "@/src/lib/auth/permissions";
import { canImportListinoFromDocumento } from "@/lib/magazzino/listino-import/listino-import-client";
import { GestionaleUploadDropExpand } from "@/components/gestionale/upload";
import {
  DOCUMENTO_UPLOAD_ACCEPT,
  DOCUMENTO_UPLOAD_MAX_MB,
  validateDocumentoUploadFile,
} from "@/components/gestionale/documenti/documento-file-dropzone";

const loadDocumentiModals = () => import("@/components/gestionale/documenti/documenti-modals");

const UploadDocumentoModal = dynamic(
  () => loadDocumentiModals().then((m) => m.UploadDocumentoModal),
  { ssr: false },
);
const DocumentoEditModal = dynamic(
  () => loadDocumentiModals().then((m) => m.DocumentoEditModal),
  { ssr: false },
);
const DocumentoInfoModal = dynamic(
  () => loadDocumentiModals().then((m) => m.DocumentoInfoModal),
  { ssr: false },
);
const ListinoImportPreviewModal = dynamic(
  () =>
    import("@/components/gestionale/documenti/listino-import-preview-modal").then(
      (m) => m.ListinoImportPreviewModal,
    ),
  { ssr: false },
);

const DocumentiAdvancedFilterPanel = dynamic(
  () =>
    import("@/components/gestionale/documenti/documenti-advanced-filter-panel").then(
      (m) => m.DocumentiAdvancedFilterPanel,
    ),
  { ssr: false },
);

const DocumentiLogDrawer = dynamic(
  () => import("@/components/gestionale/documenti/documenti-log-drawer").then((m) => m.DocumentiLogDrawer),
  { ssr: false },
);


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
      ? "border-amber-200/90 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/80 dark:text-amber-100"
      : doc.categoria === "cataloghi"
        ? "border-sky-200/90 bg-sky-50 text-sky-900 dark:border-sky-800/60 dark:bg-sky-950/80 dark:text-sky-100"
        : doc.categoria === "manuali"
          ? "border-emerald-200/90 bg-emerald-50 text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/80 dark:text-emerald-100"
          : doc.categoria === "certificazioni"
            ? "border-violet-200/90 bg-violet-50 text-violet-900 dark:border-violet-800/60 dark:bg-violet-950/80 dark:text-violet-100"
            : "border-zinc-200/90 bg-zinc-50 text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200";
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
    ) : doc.categoria === "certificazioni" ? (
      <span aria-hidden>CERT</span>
    ) : doc.tipoFile === "pdf" ? (
      <span aria-hidden>PDF</span>
    ) : (
      <span aria-hidden>{doc.tipoFile === "immagine" ? "IMG" : "FILE"}</span>
    );
  return (
    <Tooltip content={`${labelCategoria(doc.categoria)} · ${labelTipoFile(doc.tipoFile)}`}><div className={`${base} ${byCat}`}>
      {icon}
    </div></Tooltip>
  );
}

function flattenMarcaNodeFiles(node: ArchiveDocMarcaNode): DocumentoGestionale[] {
  return [...node.filesMarca, ...node.modelli.flatMap(({ files }) => files)];
}

function ArchiveDocRow({
  doc,
  selected,
  eagerPreview,
  onSelect,
  onInfo,
  onFileUnavailable,
  onApri,
  showImportListino,
  onImportListino,
}: {
  doc: DocumentoGestionale;
  selected: boolean;
  eagerPreview?: boolean;
  onSelect: () => void;
  onInfo: () => void;
  onFileUnavailable?: (message: string) => void;
  onApri: () => void;
  showImportListino?: boolean;
  onImportListino?: () => void;
}) {
  const canOpen = canOpenDocumento(doc);
  const unavailableHint = documentoFileUnavailableLabel(doc) ?? "File non disponibile.";
  const stop = (e: MouseEvent) => e.stopPropagation();
  const senzaMarcaAvviso = documentoSenzaMarcaConAvviso(doc);
  const rowToneClass = senzaMarcaAvviso
    ? "border-l-4 border-l-[color:var(--cab-warning)] bg-[color:color-mix(in_srgb,var(--cab-warning)_10%,var(--cab-surface))] hover:bg-[color:color-mix(in_srgb,var(--cab-warning)_16%,var(--cab-surface))]"
    : "hover:bg-[var(--cab-hover)]";

  const handleRowClick = () => {
    // Evita setState/rerender inutili quando la riga e' gia' attiva.
    if (selected) return;
    onSelect();
  };

  const actionButtons = (
    <>
      <IconActionButton
        label={canOpen ? "Apri" : unavailableHint}
        className={dsTableActionBtnPrimary}
        disabled={!canOpen}
        onClick={() => {
          if (!canOpen) onFileUnavailable?.(unavailableHint);
          else onApri();
        }}
      >
        <svg className={dsTableActionGlyph} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </IconActionButton>
      {showImportListino && onImportListino ? (
        <IconActionButton
          label="Importa in magazzino"
          className={dsTableActionBtnSecondary}
          onClick={onImportListino}
        >
          <svg className={dsTableActionGlyph} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
        </IconActionButton>
      ) : null}
      <IconActionButton label="Info" className={dsTableActionBtnInfo} onClick={onInfo}>
        <svg className={dsTableActionGlyph} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
        </svg>
      </IconActionButton>
    </>
  );

  return (
    <li
      id={`documento-row-${doc.id}`}
      role="option"
      aria-selected={selected}
      tabIndex={0}
      className={`group flex w-full cursor-pointer flex-col gap-2 border-b border-[color:var(--cab-border)] px-2.5 py-2 outline-none transition-[background-color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--cab-primary)_38%,transparent)] focus-visible:ring-inset last:border-b-0 md:flex-row md:items-center md:justify-between md:gap-3 ${rowToneClass}`}
      onClick={handleRowClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleRowClick();
        }
      }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <DocumentThumbnail
          documentId={doc.id}
          hasPreview={doc.hasPreview ?? (doc.tipoFile === "pdf" || doc.tipoFile === "immagine")}
          contentVersion={doc.contentVersion}
          eager={eagerPreview}
          fallback={<DocGlyph doc={doc} />}
        />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-nowrap items-center gap-2 sm:flex-wrap">
            <button type="button" className="min-w-0 max-w-full text-left focus-visible:outline-none" onClick={(e) => {
        e.stopPropagation();
        if (!canOpen)
            onFileUnavailable?.(unavailableHint);
        else
            onApri();
    }}>
              <TruncatedTextTooltip text={doc.nome} className="truncate text-sm font-semibold text-[color:var(--cab-text)] underline-offset-2 hover:underline" />
            </button>
            {!canOpen && doc.urlDocumento?.trim() ? (
              <Tooltip content={unavailableHint}><span className="inline-flex shrink-0 items-center rounded-md bg-[color:color-mix(in_srgb,var(--cab-danger)_12%,var(--cab-surface))] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[color:var(--cab-danger)] ring-1 ring-[color:color-mix(in_srgb,var(--cab-danger)_35%,var(--cab-border))]">
                File non collegato
              </span></Tooltip>
            ) : null}
            {senzaMarcaAvviso ? (
              <Tooltip content={"Assegna una marca per collocare il documento nell'archivio"}><span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[color:color-mix(in_srgb,var(--cab-warning)_22%,var(--cab-surface))] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[color:var(--cab-text)] ring-1 ring-[color:color-mix(in_srgb,var(--cab-warning)_50%,var(--cab-border))]">
                <span aria-hidden>⚠️</span>
                Senza marca
              </span></Tooltip>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-[11px] text-[color:var(--cab-text-muted)]">
            {formatDocumentoRigaSintetica(doc)} · {labelCategoria(doc.categoria)} · {labelTipoFile(doc.tipoFile)}
          </p>
        </div>
      </div>
      <div
        className="flex w-full shrink-0 justify-end pt-2 md:ml-auto md:w-auto md:pt-0"
        onClick={stop}
      >
        <div className={dsTableActionsGroupEnd}>{actionButtons}</div>
      </div>
    </li>
  );
}

export function DocumentiView() {
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const { global: globalPerm, modules: permModules } = usePermissionsSnapshot();
  const docPerm = permModules.documenti;
  const magPerm = permModules.magazzino;
  const canUploadDocuments = docPerm.canWrite;
  const canDeleteRecords = docPerm.canWrite;
  const listinoImportPerms = useMemo(
    () => ({ canReadDocumenti: docPerm.canRead, canWriteMagazzino: magPerm.canWrite }),
    [docPerm.canRead, magPerm.canWrite],
  );
  const showListinoImportForDoc = useCallback(
    (doc: DocumentoGestionale) => canImportListinoFromDocumento(doc, listinoImportPerms),
    [listinoImportPerms],
  );
  const { authorName: author, user } = useAuth();
  const authorTrim = author.trim() || "Operatore";
  const userId = user?.id ?? null;
  const { data: settingsPayload } = useCabAppSettingsPayloadQuery({ tier: "static" });
  const appSettings = settingsPayload?.resolved;
  const mezziQuery = useMezziListQuery();
  const documentiQuery = useDocumentiListQuery();
  const documentiInitialLoading = documentiQuery.isLoading && documentiQuery.data === undefined;
  const mezziSnap = mezziQuery.data ?? [];
  const { runUpload, isUploading: docUploadInFlight } = useUploadFeedback();
  const [docMutating, setDocMutating] = useState(false);
  const docBusy = docMutating || docUploadInFlight;

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

  const {
    searchInput,
    setSearchInput,
    searchApplied,
    flushSearch: flushPageSearch,
    clearSearch,
    applySearchImmediate,
  } = useGestionaleListSearch({ domain: "documenti" });

  const [advancedFilters, setAdvancedFilters] = useState<DocumentiAdvancedFilters>(
    () => loadDocumentiAdvancedFiltersPersisted() ?? DOCUMENTI_ADVANCED_FILTERS_EMPTY,
  );
  const [filtriEspansi, setFiltriEspansi] = useCollapsiblePreference(
    collapsibleExpandedBoolPref(false, { scope: "documenti", key: "filters", userId }),
  );
  const [toolbarOverflowOpen, setToolbarOverflowOpen] = useState(false);

  const [sortColumn, setSortColumn] = useState<DocumentiSortKey | null>(null);
  const [sortPhase, setSortPhase] = useState<DocumentiSortPhase>("natural");

  const [expandedMarche, setExpandedMarche] = useCollapsiblePreference(
    collapsibleSetPref([], { scope: "documenti", key: "tree", userId }),
  );
  const legacyExpandAllDone = useRef(false);
  const urlHydratedRef = useRef(false);

  const patchAdvancedFilters = useCallback((patch: Partial<DocumentiAdvancedFilters>) => {
    setAdvancedFilters((prev) => {
      const next = { ...prev, ...patch };
      saveDocumentiAdvancedFiltersPersisted(next);
      return next;
    });
  }, []);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadInitialFile, setUploadInitialFile] = useState<File | null>(null);
  const uploadSourceFileRef = useRef<File | null>(null);
  const [listinoImportDocId, setListinoImportDocId] = useState<string | null>(null);
  const [infoDoc, setInfoDoc] = useState<DocumentoGestionale | null>(null);
  const [editDoc, setEditDoc] = useState<DocumentoGestionale | null>(null);
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<DocumentoGestionale | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const gestToast = useGestionaleToast();
  const { confirm, confirmDialog } = useGestionaleConfirm();
  const [logOpen, setLogOpen] = useState(false);
  const logQuery = useLogListQuery({ entita: "documenti", limit: 100 }, { enabled: logOpen });
  const logDisplayEntries = useMemo(
    () =>
      buildLogModificheDisplayEntries(logQuery.data ?? [], (row) =>
        logAutoreLabel(row, user?.id ?? null, author),
      ),
    [author, logQuery.data, user?.id],
  );

  useEffect(() => {
    if (urlHydratedRef.current) return;
    urlHydratedRef.current = true;

    const rawQ = searchParams.get("q");
    if (rawQ?.trim()) {
      const q = decodeURIComponent(rawQ.trim());
      applySearchImmediate(q);
    }

    const marcaQ = searchParams.get("marca")?.trim();
    const modelloQ = searchParams.get("modello")?.trim();
    const mid = searchParams.get("mezzoId")?.trim();
    const mezzo = mid ? mezziSnap.find((m) => m.id === mid) : null;
    const marcaNome = marcaQ || mezzo?.marca?.trim() || "";
    if (!marcaNome) return;

    const modelloNome = modelloQ || mezzo?.modello?.trim() || "";
    const mar = catalog.find((c) => c.nome.trim().toLowerCase() === marcaNome.toLowerCase());

    setAdvancedFilters((prev) => {
      const next = {
        ...prev,
        marca: marcaNome,
        modello: modelloNome || FILTER_ALL,
      };
      saveDocumentiAdvancedFiltersPersisted(next);
      return next;
    });

    if (!mar) return;
    setExpandedMarche((p) => new Set(p).add(mar.id));
  }, [searchParams, mezziSnap, catalog]);

  useEffect(() => {
    if (!userId || catalog.length === 0 || legacyExpandAllDone.current) return;
    const blob = read(userId, "documenti");
    if (blob.sections[COLLAPSIBLE_LEGACY_EXPAND_ALL_KEY] !== true) return;
    legacyExpandAllDone.current = true;
    const allIds = new Set(catalog.map((m) => m.id));
    setExpandedMarche(allIds);
    const sections: Record<string, boolean | string | number | string[]> = { ...blob.sections, tree: [...allIds] };
    delete sections[COLLAPSIBLE_LEGACY_EXPAND_ALL_KEY];
    write(userId, "documenti", sections);
  }, [userId, catalog, setExpandedMarche]);

  const pageFilters = useMemo(
    (): DocumentiPageFilters => ({
      search: searchApplied,
      ...advancedFilters,
    }),
    [searchApplied, advancedFilters],
  );

  const searchActive = searchApplied.trim().length > 0;

  const filteredView = useDocumentiListDerived(docs, catalog, mezziSnap, pageFilters, {
    sortColumn,
    sortPhase,
  });

  const {
    senzaMarca: documentiSenzaMarca,
    certificazioniSenzaMarca: documentiCertificazioniSenzaMarca,
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

  const marcaFilesById = useMemo(
    () =>
      new Map(
        pagedTree.map((node) => [node.marca.id, flattenMarcaNodeFiles(node)] as const),
      ),
    [pagedTree],
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
  } = useClientPagination(logDisplayEntries.length, listPageSize);
  useEffect(() => {
    resetDocLogPage();
  }, [logOpen, logDisplayEntries.length, listPageSize, resetDocLogPage]);
  const pagedDocLogEntries = useMemo(
    () => sliceDocLogEntries(logDisplayEntries),
    [logDisplayEntries, sliceDocLogEntries, docLogPage],
  );

  const hasDocumentiInLista = totalDocs > 0;

  useEffect(() => {
    if (
      selectedDocId &&
      !documentiSenzaMarca.some((d) => d.id === selectedDocId) &&
      !documentiCertificazioniSenzaMarca.some((d) => d.id === selectedDocId) &&
      !documentiConMarca.some((d) => d.id === selectedDocId)
    ) {
      setSelectedDocId(null);
    }
  }, [documentiConMarca, documentiCertificazioniSenzaMarca, documentiSenzaMarca, selectedDocId]);

  const sortSelectValue = useMemo(
    () => documentiSortSelectValue(sortColumn, sortPhase),
    [sortColumn, sortPhase],
  );

  const onSortSelect = useCallback((v: string) => {
    applyDocumentiSortSelect(v, setSortColumn, setSortPhase);
  }, []);

  const refreshDocumenti = useCallback(
    (documentoId?: string, dbVersion?: string, operation = "refresh") => {
      void traceMutationLifecycle(
        {
          entityType: "documento",
          entityId: documentoId ?? "list",
          operation,
          scope: documentoId ? "full" : "reactQuery",
        },
        () =>
          invalidateEntity({
            queryClient: qc,
            entityType: "documento",
            entityId: documentoId ?? "list",
            scope: documentoId ? "full" : "reactQuery",
            dbVersion,
          }),
      );
    },
    [qc],
  );

  const handleUpload = useCallback(
    async (
      payload: Omit<DocumentoGestionale, "id">,
      sourceFile?: File | null,
    ): Promise<DocumentoGestionale | void> => {
      if (!canUploadDocuments) return;
      if (sourceFile) {
        uploadSourceFileRef.current = sourceFile;
      }
      const fileName = payload.nome?.trim() || sourceFile?.name || "documento";
      const result = await runUpload({
        fileName,
        label: `Documento: ${fileName}`,
        successToast: "Documento caricato.",
        showErrorToast: false,
        run: async () => {
          const file = uploadSourceFileRef.current;
          let urlFile = payload.urlDocumento?.trim() ?? "";
          let uploadIntelligence;
          if (file) {
            const up = await uploadDocumentoFile(file, payload.categoria);
            if (!up.success || !up.data) {
              throw new Error(up.error ?? "Caricamento file non riuscito.");
            }
            urlFile = up.data.path;
            uploadIntelligence = up.data.intelligence;
          } else if (payload.urlBlob?.trim()) {
            const up = await uploadDocumentoBlob(payload.urlBlob, payload.nome || "documento", payload.categoria);
            if (!up.success || !up.data) {
              throw new Error(up.error ?? "Caricamento file non riuscito.");
            }
            urlFile = up.data.path;
            uploadIntelligence = up.data.intelligence;
            try {
              URL.revokeObjectURL(payload.urlBlob);
            } catch {
              /* ignore */
            }
          }
          if (!urlFile) {
            throw new Error("File non disponibile per il salvataggio.");
          }
          const insert = gestionaleToDocumentoInsert(payload, urlFile, uploadIntelligence);
          const res = await documentiEntry.create(insert);
          if (!res.success || !res.data) {
            if (urlFile) {
              await deleteDocumentoStoragePath(urlFile);
            }
            throw new Error(res.error ?? "Impossibile salvare il documento.");
          }
          void fetch(buildDocumentPreviewUrl(res.data.id), { credentials: "include" }).catch(() => {});
          const row = resolveDocumentoApplicazione(documentoRowToGestionale(res.data));
          const uploadedAt =
            typeof res.data.meta === "object" && res.data.meta && "uploadedAt" in res.data.meta
              ? String((res.data.meta as { uploadedAt?: string }).uploadedAt ?? "")
              : undefined;
          refreshDocumenti(row.id, uploadedAt || row.caricatoIl);
          warmupDocumentPreview(row.id, { source: "archive" });
          uploadSourceFileRef.current = null;
          return row;
        },
      });
      if (!result.ok) {
        gestToast.errorOnce("documenti-upload", result.error, { module: "documenti" });
        throw new Error(result.error);
      }
      return result.data;
    },
    [authorTrim, gestToast, refreshDocumenti, canUploadDocuments, runUpload],
  );

  const handleSaveEdit = useCallback(
    async (next: DocumentoGestionale): Promise<boolean> => {
      if (!canUploadDocuments) return false;
      const old = docs.find((d) => d.id === next.id);
      setDocMutating(true);
      try {
        const update = gestionaleToDocumentoUpdate(next);
        const res = await documentiEntry.update(next.id, update);
        if (!res.success || !res.data) {
          gestToast.errorOnce("documenti-update", res.error ?? "Impossibile aggiornare il documento.", {
            module: "documenti",
          });
          return false;
        }
        if (old) {
          const saved = resolveDocumentoApplicazione(documentoRowToGestionale(res.data));
          const changes = diffDocumentiMetadati(old, saved);
          if (changes.length > 0) {
            void changes;
          }
        }
        refreshDocumenti();
        gestToast.successOnce("documenti-update", "Documento aggiornato.");
        return true;
      } finally {
        setDocMutating(false);
      }
    },
    [docs, authorTrim, gestToast, refreshDocumenti, canUploadDocuments],
  );

  const executeDelete = useCallback(
    async (victim: DocumentoGestionale) => {
      setDocMutating(true);
      try {
        const res = await documentiEntry.remove(victim.id);
        if (!res.success) {
          gestToast.errorOnce("documenti-delete", res.error ?? "Impossibile eliminare il documento.", {
            module: "documenti",
          });
          return;
        }
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
        refreshDocumenti(victim.id, victim.contentVersion);
        gestToast.successDeleted();
      } finally {
        setDocMutating(false);
        setDeleteConfirmDoc(null);
      }
    },
    [authorTrim, gestToast, refreshDocumenti],
  );

  const handleDelete = useCallback(
    (victim: DocumentoGestionale) => {
      if (!canDeleteRecords) return;
      setDeleteConfirmDoc(victim);
    },
    [canDeleteRecords],
  );

  async function openDoc(doc: DocumentoGestionale) {
    const result = await openDocumentoFile(doc);
    if (!result.ok) gestToast.warning(result.message);
  }

  function handleMarcaCollapsedChange(id: string, collapsed: boolean) {
    setExpandedMarche((prev) => {
      const next = new Set(prev);
      if (collapsed) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const collapseAllTreeGroups = useCallback(() => {
    setExpandedMarche(new Set());
  }, [setExpandedMarche]);

  const expandAllTreeGroups = useCallback(() => {
    setExpandedMarche(new Set(pagedTree.map((n) => n.marca.id)));
  }, [pagedTree, setExpandedMarche]);

  function marcaOpen(id: string) {
    return searchActive || expandedMarche.has(id);
  }

  const resetRicerca = useCallback(() => {
    clearSearch();
  }, [clearSearch]);

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

  const uploadDropDisabled =
    !canUploadDocuments || docBusy || documentiQuery.isLoading || uploadOpen;

  const handlePageUploadDrop = useCallback(
    (file: File) => {
      if (uploadDropDisabled) return;
      uploadSourceFileRef.current = file;
      setUploadInitialFile(file);
      setUploadOpen(true);
    },
    [uploadDropDisabled],
  );

  const closeUploadModal = useCallback(() => {
    setUploadOpen(false);
    setUploadInitialFile(null);
    uploadSourceFileRef.current = null;
  }, []);

  const documentiMenuItems = useMemo((): PageActionItem[] => [
    pageActionLogItem(() => setLogOpen(true), "Log attività"),
  ], []);

  return (
    <GestionaleSectionGate module="documenti">
    <div className={layoutPageRoot}>
    <>
      <PageHeaderPageActionMenu
        items={documentiMenuItems}
        onRefresh={() => void refreshDocumenti()}
      />
        <GestionaleUploadDropExpand
          overlay
          accept={DOCUMENTO_UPLOAD_ACCEPT}
          disabled={uploadDropDisabled}
          validateFile={validateDocumentoUploadFile}
          onFile={handlePageUploadDrop}
          dropTitle="Rilascia per caricare documento"
          dropHint={`PDF, Office, immagini · max ${DOCUMENTO_UPLOAD_MAX_MB} MB`}
          className="min-w-0"
        >
        <ShellCard>
        <PageToolbar
          testId="page-ready-toolbar"
          className="sm:mx-0"
          primaryAction={
            <OptionalTooltip content={!canUploadDocuments ? READONLY_PERMISSION_HINT : undefined}>
              <button
                type="button"
                onClick={() => setUploadOpen(true)}
                disabled={docBusy || documentiQuery.isLoading || !canUploadDocuments}
                className={`${dsPageToolbarCtaCompact} disabled:opacity-60`}
              >
                {docBusy ? (
                  <>
                    <svg className="h-5 w-5 shrink-0 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <span className="sm:hidden">…</span>
                    <span className="hidden sm:inline">Caricamento…</span>
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <PageToolbarCtaLabel short="Carica" full="Carica documento" />
                  </>
                )}
              </button>
            </OptionalTooltip>
          }
          search={
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
              wrapperClassName="min-w-0 flex-1 sm:min-w-[12rem]"
            />
          }
          filtersExpanded={filtriEspansi}
          onFiltersToggle={() => setFiltriEspansi((o) => !o)}
          filtersActive={hasPageClientFilters}
          filtersPanel={
            filtriEspansi ? (
              <DocumentiAdvancedFilterPanel
                filters={advancedFilters}
                onChange={patchAdvancedFilters}
                sortSelectValue={sortSelectValue}
                onSortSelect={onSortSelect}
              />
            ) : null
          }
          onFilterReset={resetFiltri}
          overflowOpen={toolbarOverflowOpen}
          onOverflowToggle={() => setToolbarOverflowOpen((o) => !o)}
          overflowActions={
            hasDocumentiInLista ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (searchActive) resetRicerca();
                    collapseAllTreeGroups();
                  }}
                  className={`${dsPageToolbarBtn} h-9 w-full justify-center px-3 text-xs sm:w-auto`}
                >
                  Comprimi tutto
                </button>
                <button
                  type="button"
                  onClick={expandAllTreeGroups}
                  className={`${dsPageToolbarBtn} h-9 w-full justify-center px-3 text-xs sm:w-auto`}
                >
                  Espandi tutto
                </button>
              </>
            ) : null
          }
          meta={
            <PageToolbarResultCount
              count={totalDocs}
              filtersActive={hasAdvancedPanelFilters}
              searchActive={searchActive}
              onSearchReset={resetRicerca}
              onFilterReset={resetFiltri}
            />
          }
        />
        </ShellCard>

        <SkeletonBoundary loading={documentiInitialLoading}>
        <DocumentiTableSection mode="content" geometry="table-documenti" className="mt-4">
        {documentiQuery.isError ? (
          <ShellCard>
            <LoadingErrorState
              title="Impossibile caricare i documenti"
              description="Controlla la connessione e riprova."
              onRetry={() => void documentiQuery.refetch()}
            />
          </ShellCard>
        ) : !hasDocumentiInLista ? (
          <ShellCard>
            <p className="p-8 text-center text-sm text-[color:var(--cab-text-muted)]">
              Nessun documento corrisponde ai filtri.
            </p>
          </ShellCard>
        ) : (
          <div className="min-w-0 mt-[length:var(--ds-space-xl)] space-y-4">
            {documentiSenzaMarca.length > 0 ? (
              <div className="overflow-hidden rounded-[var(--ds-radius-xl)] border-2 border-[color:color-mix(in_srgb,var(--cab-warning)_55%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-warning)_12%,var(--cab-surface))] p-3 sm:p-4">
                <div className="mb-2 flex min-w-0 flex-nowrap items-center gap-2 sm:flex-wrap">
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
                  role="list"
                >
                  {documentiSenzaMarca.map((d, i) => (
                    <ArchiveDocRow
                      key={d.id}
                      doc={d}
                      eagerPreview={i < 3}
                      selected={selectedDocId === d.id}
                      onSelect={() => setSelectedDocId(d.id)}
                      onInfo={() => setInfoDoc(d)}
                      onFileUnavailable={(msg) => gestToast.warning(msg)}
                      onApri={() => openDoc(d)}
                      showImportListino={showListinoImportForDoc(d)}
                      onImportListino={() => setListinoImportDocId(d.id)}
                    />
                  ))}
                </ul>
              </div>
            ) : null}

            {documentiCertificazioniSenzaMarca.length > 0 ? (
              <ShellCard
                title="Certificazioni"
                subtitle={`${documentiCertificazioniSenzaMarca.length} document${documentiCertificazioniSenzaMarca.length === 1 ? "o" : "i"}`}
                collapsible
                compactContent
                persistScope="documenti"
                persistKey="certificazioni"
              >
                <ul
                  className="overflow-hidden rounded-[var(--ds-radius-lg)] ring-1 ring-inset ring-[color:var(--cab-border)]"
                  role="list"
                >
                  {documentiCertificazioniSenzaMarca.map((d) => (
                    <ArchiveDocRow
                      key={d.id}
                      doc={d}
                      selected={selectedDocId === d.id}
                      onSelect={() => setSelectedDocId(d.id)}
                      onInfo={() => setInfoDoc(d)}
                      onFileUnavailable={(msg) => gestToast.warning(msg)}
                      onApri={() => openDoc(d)}
                      showImportListino={showListinoImportForDoc(d)}
                      onImportListino={() => setListinoImportDocId(d.id)}
                    />
                  ))}
                </ul>
              </ShellCard>
            ) : null}

            {pagedTree.map((node) => {
              const files = marcaFilesById.get(node.marca.id) ?? [];
              const isExpanded = marcaOpen(node.marca.id);
              const docCount = files.length;

              return (
                <ShellCard
                  key={node.marca.id}
                  title={node.marca.nome}
                  subtitle={`${docCount} document${docCount === 1 ? "o" : "i"}`}
                  collapsible
                  collapsed={!isExpanded}
                  onCollapsedChange={(collapsed) => handleMarcaCollapsedChange(node.marca.id, collapsed)}
                  compactContent
                >
                  {files.length > 0 ? (
                    <ul
                      className="overflow-hidden rounded-[var(--ds-radius-lg)] ring-1 ring-inset ring-[color:var(--cab-border)]"
                      role="list"
                    >
                      {files.map((d) => (
                        <ArchiveDocRow
                          key={d.id}
                          doc={d}
                          selected={selectedDocId === d.id}
                          onSelect={() => setSelectedDocId(d.id)}
                          onInfo={() => setInfoDoc(d)}
                          onFileUnavailable={(msg) => gestToast.warning(msg)}
                          onApri={() => openDoc(d)}
                          showImportListino={showListinoImportForDoc(d)}
                          onImportListino={() => setListinoImportDocId(d.id)}
                        />
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-[color:var(--cab-text-muted)]">Nessun documento in questa marca.</p>
                  )}
                </ShellCard>
              );
            })}

            {documentiSenzaCollocazione.length > 0 ? (
              <div className="overflow-hidden rounded-[var(--ds-radius-xl)] border border-[color:color-mix(in_srgb,var(--cab-warning)_45%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-warning)_8%,var(--cab-surface))] p-3 sm:p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--cab-text)]">
                  Senza collocazione
                </p>
                <p className="mt-1 text-xs leading-snug text-[color:var(--cab-text-muted)]">
                  Marca o modello non allineati all&apos;anagrafica. Aggiorna le impostazioni o il documento.
                </p>
                <ul
                  className="mt-2 overflow-hidden rounded-[var(--ds-radius-lg)] ring-1 ring-inset ring-[color:color-mix(in_srgb,var(--cab-warning)_35%,var(--cab-border)]"
                  role="list"
                >
                  {documentiSenzaCollocazione.map((d) => (
                    <ArchiveDocRow
                      key={d.id}
                      doc={d}
                      selected={selectedDocId === d.id}
                      onSelect={() => setSelectedDocId(d.id)}
                      onInfo={() => setInfoDoc(d)}
                      onFileUnavailable={(msg) => gestToast.warning(msg)}
                      onApri={() => openDoc(d)}
                      showImportListino={showListinoImportForDoc(d)}
                      onImportListino={() => setListinoImportDocId(d.id)}
                    />
                  ))}
                </ul>
              </div>
            ) : null}

            {showDocPager ? (
              <TablePagination
                page={marcaPage}
                pageCount={docPageCount}
                onPageChange={setMarcaPage}
                label={docPagerLabel}
                className="rounded-[var(--ds-radius-xl)] border border-[color:var(--cab-border)] bg-[var(--cab-surface-2)]/40"
              />
            ) : null}
          </div>
        )}
        </DocumentiTableSection>
        </SkeletonBoundary>
        </GestionaleUploadDropExpand>

      {uploadOpen && canUploadDocuments ? (
        <UploadDocumentoModal
          isUploading={docUploadInFlight}
          initialFile={uploadInitialFile}
          onRequestClose={closeUploadModal}
          onSubmit={handleUpload}
          onImportListino={(doc) => setListinoImportDocId(doc.id)}
        />
      ) : null}

      {listinoImportDocId ? (
        <ListinoImportPreviewModal
          documentoId={listinoImportDocId}
          documentoNome={docs.find((d) => d.id === listinoImportDocId)?.nome}
          onRequestClose={() => setListinoImportDocId(null)}
          onCompleted={() => {
            void invalidateAfterMagazzinoOrMovimenti(qc, [
              cabSyncEventForEntity("magazzino_ricambi", "listino-import", "entity_created", "magazzino_ricambi"),
            ]);
          }}
        />
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
          onDelete={() => {
            const d = infoDoc;
            setInfoDoc(null);
            handleDelete(d);
          }}
          canEdit={canUploadDocuments}
          canDelete={canDeleteRecords}
        />
      ) : null}

      {editDoc && canUploadDocuments ? (
        <DocumentoEditModal key={editDoc.id} doc={editDoc} onRequestClose={() => setEditDoc(null)} onSave={handleSaveEdit} />
      ) : null}

      <DocumentiLogDrawer
        open={logOpen}
        onClose={() => setLogOpen(false)}
        entries={logDisplayEntries}
        pagedEntries={pagedDocLogEntries}
        showPager={showDocLogPager}
        page={docLogPage}
        pageCount={docLogPageCount}
        pagerLabel={docLogPagerLabel}
        onPageChange={setDocLogPage}
        isLoading={logQuery.isLoading}
      />

      <SettingsEliminaConfirmDialog
        open={deleteConfirmDoc != null}
        itemLabel={deleteConfirmDoc?.nome}
        detail={
          deleteConfirmDoc && documentoSenzaMarcaConAvviso(deleteConfirmDoc)
            ? "Il documento non ha marca assegnata."
            : undefined
        }
        pending={docMutating}
        onCancel={() => {
          if (!docMutating) setDeleteConfirmDoc(null);
        }}
        onConfirm={() => {
          if (deleteConfirmDoc) void executeDelete(deleteConfirmDoc);
        }}
      />
      {confirmDialog}
    </>
    </div>
    </GestionaleSectionGate>
  );
}
