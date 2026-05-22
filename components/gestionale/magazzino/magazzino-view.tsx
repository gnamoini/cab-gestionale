"use client";

import "./magazzino-scroll.css";

import type { ReactNode } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CardMobile, CloseButton } from "@/components/design-system";
import { MagazzinoGiacenzaBell } from "@/components/gestionale/magazzino/magazzino-giacenza-bell";
import { MagazzinoPrezziLineari } from "@/components/gestionale/magazzino/magazzino-prezzi-lineari";
import { gestionaleFormFocusScopeProps } from "@/components/gestionale/gestionale-form-focus-scope";
import { RicambioFormFields } from "@/components/gestionale/magazzino/ricambio-form-fields";
import {
  magazzinoRowToRicambioUI,
  ricambioUiToMagazzinoInsert,
  ricambioUiToMagazzinoUpdate,
} from "@/lib/magazzino/magazzino-db-ui-adapter";
import { magazzinoService } from "@/src/services/magazzino.service";
import { useMagazzinoListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { useQueryClient } from "@tanstack/react-query";
import { QK } from "@/src/lib/react-query/invalidate-related";
import { getMagazzinoReportSnapshot, setMagazzinoReportSnapshot } from "@/lib/magazzino/magazzino-report-sync";
import { MAGAZZINO_PRODOTTI_REFRESH_EVENT } from "@/lib/magazzino/magazzino-prodotti-refresh-event";
import { suppressSettingsRemoteNotify } from "@/lib/sistema/settings-remote-notify-guard";
import { flattenCompatDaAttrezzature, migrateMezziListePrefs } from "@/lib/mezzi/attrezzature-prefs";
import { createMezziListePrefsDefault } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { capitaleImmobilizzato } from "@/lib/magazzino/calculations";
import {
  loadMagazzinoChangeLog,
  saveMagazzinoChangeLog,
  type MagazzinoChangeLogEntry,
} from "@/lib/magazzino/magazzino-change-log-storage";
import {
  emptyRicambioForm,
  formatMarkupDisplay,
  ricambioFromForm,
  ricambioFromFormLenient,
  toFormDraft,
  validateRicambioListFields,
  type RicambioFormState,
} from "@/lib/magazzino/form";
import { latestUndoableScortaEntryForRicambio, parseScortaChange, entryMatchesMagazzinoUndoScope, type MagazzinoUndoScope } from "@/lib/magazzino/magazzino-scorta-undo";
import { useUndoSessionId } from "@/lib/gestionale-log/use-undo-session-id";
import {
  analyzeArchiveDuplicateCodes,
  findFirstDuplicateByCodiceOriginale,
  type MagazzinoArchiveDuplicateCodeGroup,
} from "@/lib/magazzino/duplicates";
import { compareByColumn, compareNaturalOrder, type SortPhaseMagazzino } from "@/lib/magazzino/sort-order";
import {
  buildConsumoMapMagazzinoRolling36ForProducts,
  formatAutonomiaMesi,
  formatAvgMonthlyMagazzinoIt,
  formatMonthKeyIt,
} from "@/lib/magazzino/ricambio-consumo-from-log";
import type { RicambioMagazzino, SortKeyMagazzino } from "@/lib/magazzino/types";
import {
  dsPageToolbarBtn,
  dsStackPage,
  GESTIONALE_SEARCH_PLACEHOLDER,
  dsTableRow,
  dsBtnNeutral,
  dsBtnGhost,
  dsBtnPrimary,
  dsBtnSoftOrange,
  dsFocus,
  dsZModalHigh,
  dsTableTdActions,
  dsTableActionsGroup,
  dsTableActionBtnPrimary,
  dsTableActionBtnSecondary,
  dsTableActionBtnUndo,
  dsTableActionBtnInfo,
  dsTableActionGlyph,
  dsTableTdCompact,
} from "@/lib/ui/design-system";
import {
  globalTableSortActive,
  globalTableSortButton,
  globalTableSortIdle,
  globalTableSortLabelSingle,
  globalTableThCell,
  globalTableThLabel,
} from "@/lib/ui/global-table";
import {
  gestionaleListTableClass,
  gestionaleListTableMasterWrapClass,
  gestionaleListTableRowSurfaceClass,
  gestionaleListTableTbodyClass,
  gestionaleListTableTheadClass,
  gestionaleListTableHeadRowClass,
  gestionaleListTableTdAzioni,
  gestionaleListTableThAzioni,
} from "@/lib/ui/gestionale-list-table";
import { PageHeader } from "@/components/gestionale/page-header";
import { GestionalePageToolbarActions } from "@/components/gestionale/page-header-toolbar";
import { ShellCard } from "@/components/gestionale/shell-card";
import { TablePagination } from "@/components/gestionale/table-pagination";
import {
  Drawer,
  PageToolbar,
  PageToolbarActions,
  PageToolbarResultCount,
} from "@/components/design-system";
import { GestionaleListSearchField } from "@/components/gestionale/gestionale-list-search-field";
import { MagazzinoAdvancedFilterPanel } from "@/components/gestionale/magazzino/magazzino-advanced-filter-panel";
import { RecordImageManager, type RecordImageLogEvent } from "@/components/gestionale/media/record-image-manager";
import { useBodyScrollLock } from "@/lib/ui/use-body-scroll-lock";
import { erpBtnNuovaLavorazione } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import {
  buildMagazzinoFilterCatalog,
  loadMagazzinoAdvancedFiltersPersisted,
  MAGAZZINO_ADVANCED_FILTERS_EMPTY,
  magazzinoAdvancedFiltersActive,
  saveMagazzinoAdvancedFiltersPersisted,
  type MagazzinoAdvancedFilters,
} from "@/lib/magazzino/magazzino-advanced-filters";
import {
  buildMagazzinoSearchSuggestions,
  magazzinoRowMatchesPageFilters,
  type MagazzinoPageFilters,
} from "@/lib/magazzino/magazzino-list-ui-filters";
import {
  buildMagazzinoGestionaleLogViewModel,
  GestionaleLogEmpty,
  GestionaleLogEntryFourLines,
  GestionaleLogList,
  gestionaleLogScrollEmbeddedClass,
  logEntryDismissBtnClass,
} from "@/components/gestionale/gestionale-log-ui";
import { useAuth } from "@/context/auth-context";
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import { useResponsiveListPageSize } from "@/lib/ui/use-responsive-list-page-size";
import { CAB_SETTINGS_KEY, CAB_SETTINGS_MODULE } from "@/src/lib/app-settings/keys";
import { useCabAppSettingsPayloadQuery, useSettingsUpsertMutation } from "@/src/hooks/gestionale/use-settings-queries";
import { usePermissions } from "@/src/hooks/use-permissions";
import { READONLY_PERMISSION_HINT } from "@/src/lib/auth/permissions";
import { Q_FOCUS_RICAMBIO } from "@/lib/navigation/dashboard-log-links";

function eur(n: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
}

function initialMasterFromProducts(rows: RicambioMagazzino[]) {
  const marche = new Set<string>();
  const categorie = new Set<string>();
  const mezzi = new Set<string>();
  for (const r of rows) {
    marche.add(r.marca);
    categorie.add(r.categoria);
    r.compatibilitaMezzi.forEach((m) => mezzi.add(m));
  }
  return {
    marche: [...marche].sort((a, b) => a.localeCompare(b, "it")),
    categorie: [...categorie].sort((a, b) => a.localeCompare(b, "it")),
    mezzi: [...mezzi].sort((a, b) => a.localeCompare(b, "it")),
  };
}

function initialFornitoriFromProducts(rows: RicambioMagazzino[]) {
  const s = new Set<string>();
  for (const r of rows) {
    const t = r.fornitoreNonOriginale.trim();
    if (t) s.add(t);
  }
  return [...s].sort((a, b) => a.localeCompare(b, "it"));
}

function mergeMasterWithRows(master: string[], rowValues: string[]) {
  const s = new Set([...master, ...rowValues]);
  return [...s].sort((a, b) => a.localeCompare(b, "it"));
}

function compatLabel(list: string[]) {
  return list.join(", ");
}

function rowStockBg(r: RicambioMagazzino) {
  if (r.scorta < r.scortaMinima) {
    return "bg-red-50/50 dark:bg-red-950/20";
  }
  return "";
}

function rowStockBorderFirstTd(r: RicambioMagazzino) {
  if (r.scorta < r.scortaMinima) {
    return "border-l-4 border-l-red-500";
  }
  return "";
}

function formatTimestampHover(iso: string) {
  return new Date(iso).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDataUltimaMain(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isModificaOlderThanMonths(iso: string, months: number) {
  const t = new Date(iso).getTime();
  const limit = new Date();
  limit.setMonth(limit.getMonth() - months);
  return t < limit.getTime();
}

const CAMPO_LABEL: Partial<Record<keyof RicambioMagazzino, string>> = {
  marca: "Marca",
  codiceFornitoreOriginale: "Codice",
  descrizione: "Descrizione",
  note: "Note",
  categoria: "Categoria",
  compatibilitaMezzi: "Compatibilità",
  scorta: "Scorta",
  scortaMinima: "Scorta minima",
  prezzoFornitoreOriginale: "Prezzo listino OE",
  scontoFornitoreOriginale: "Sconto OE %",
  markupPercentuale: "Markup %",
  prezzoVendita: "Prezzo vendita",
  fornitoreNonOriginale: "Fornitore alternativo",
  codiceFornitoreNonOriginale: "Codice alternativo",
  prezzoFornitoreNonOriginale: "Prezzo alternativo",
  scontoFornitoreNonOriginale: "Sconto alt. %",
};

const DIFF_KEYS: (keyof RicambioMagazzino)[] = [
  "marca",
  "codiceFornitoreOriginale",
  "descrizione",
  "note",
  "categoria",
  "compatibilitaMezzi",
  "scorta",
  "scortaMinima",
  "prezzoFornitoreOriginale",
  "scontoFornitoreOriginale",
  "markupPercentuale",
  "prezzoVendita",
  "fornitoreNonOriginale",
  "codiceFornitoreNonOriginale",
  "prezzoFornitoreNonOriginale",
  "scontoFornitoreNonOriginale",
];

const CAMPO_KEY_BY_LABEL = new Map<string, keyof RicambioMagazzino>(
  DIFF_KEYS.map((key) => [CAMPO_LABEL[key] ?? String(key), key]),
);

type CampoChange = { campo: string; prima: string; dopo: string };

function parseUndoValue(key: keyof RicambioMagazzino, raw: string, current: RicambioMagazzino): RicambioMagazzino[keyof RicambioMagazzino] {
  if (key === "compatibilitaMezzi") {
    return raw === "—" ? [] : raw.split(",").map((x) => x.trim()).filter(Boolean);
  }
  if (typeof current[key] === "number") {
    const cleaned = raw.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
    return Number(cleaned) || 0;
  }
  return raw === "—" ? "" : raw;
}

function fmtForDiff(k: keyof RicambioMagazzino, r: RicambioMagazzino): string {
  const v = r[k];
  if (Array.isArray(v)) return (v as string[]).join(", ") || "—";
  if (typeof v === "number") {
    if (k === "markupPercentuale") {
      return formatMarkupDisplay(v);
    }
    if (k === "scontoFornitoreOriginale" || k === "scontoFornitoreNonOriginale") {
      return `${v}%`;
    }
    if (
      k === "prezzoFornitoreOriginale" ||
      k === "prezzoFornitoreNonOriginale" ||
      k === "prezzoVendita"
    ) {
      return eur(v);
    }
    return String(v);
  }
  const s = String(v ?? "").trim();
  return s || "—";
}

function diffRicambi(before: RicambioMagazzino, after: RicambioMagazzino): CampoChange[] {
  const out: CampoChange[] = [];
  for (const key of DIFF_KEYS) {
    const b = fmtForDiff(key, before);
    const a = fmtForDiff(key, after);
    if (b !== a) {
      out.push({ campo: CAMPO_LABEL[key] ?? String(key), prima: b, dopo: a });
    }
  }
  return out;
}

function changesForNuovoRicambio(r: RicambioMagazzino): CampoChange[] {
  return DIFF_KEYS.map((key) => ({
    campo: CAMPO_LABEL[key] ?? String(key),
    prima: "—",
    dopo: fmtForDiff(key, r),
  })).filter((c) => c.dopo !== "—");
}

type MagazzinoLogTipo = "aggiunta" | "update" | "rimozione";

type MagazzinoLogEntry = MagazzinoChangeLogEntry;

function computeRiepilogo(changes: CampoChange[]): string {
  const parts: string[] = [];
  for (const c of changes) {
    if (c.campo === "Scorta") {
      const p = Number.parseInt(c.prima, 10);
      const d = Number.parseInt(c.dopo, 10);
      if (!Number.isNaN(p) && !Number.isNaN(d)) {
        const delta = d - p;
        parts.push(delta >= 0 ? `Scorta +${delta}` : `Scorta ${delta}`);
      } else {
        parts.push("Scorta aggiornata");
      }
    } else if (c.campo === "Prezzo vendita") {
      parts.push("Prezzo vendita aggiornato");
    } else if (c.campo === "Descrizione") {
      parts.push("Descrizione modificata");
    } else {
      parts.push(`${c.campo} aggiornato`);
    }
  }
  return [...new Set(parts)].join(", ");
}

/** Stile interazioni ERP uniforme (hover / active / ring) */
const erpFocus = dsFocus;
const erpBtnNeutral = dsBtnNeutral;
const erpBtnAccent = dsBtnPrimary;
const erpBtnSoftOrange = dsBtnSoftOrange;
function IconInfoMagazzino({ className = dsTableActionGlyph }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" d="M12 10.5V16M12 8.2v-.1" />
    </svg>
  );
}

function IconUndoMagazzino({ className = dsTableActionGlyph }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"
      />
    </svg>
  );
}

const SEARCH_DEBOUNCE_MS = 320;

function MagazzinoSortBtn({
  label,
  columnKey,
  sortColumn,
  sortPhase,
  onSort,
  buttonClassName = "",
  labelClassName = "",
}: {
  label: string;
  columnKey: SortKeyMagazzino;
  sortColumn: SortKeyMagazzino | null;
  sortPhase: SortPhaseMagazzino;
  onSort: (k: SortKeyMagazzino) => void;
  buttonClassName?: string;
  labelClassName?: string;
}) {
  const active = sortColumn === columnKey && (sortPhase === "asc" || sortPhase === "desc");
  let icon: ReactNode = <span className="opacity-40">↕</span>;
  if (active) {
    icon = sortPhase === "asc" ? <span>↑</span> : <span>↓</span>;
  }
  return (
    <button
      type="button"
      onClick={() => onSort(columnKey)}
      className={`${globalTableSortButton} min-w-0 max-w-full ${buttonClassName} ${
        active ? globalTableSortActive : globalTableSortIdle
      }`}
    >
      <span className={labelClassName ? labelClassName : globalTableSortLabelSingle}>{label}</span>
      {icon}
    </button>
  );
}

function SortTh({
  label,
  columnKey,
  sortColumn,
  sortPhase,
  onSort,
  headerClassName = "",
  buttonClassName = "",
  labelClassName = "",
}: {
  label: string;
  columnKey: SortKeyMagazzino;
  sortColumn: SortKeyMagazzino | null;
  sortPhase: SortPhaseMagazzino;
  onSort: (k: SortKeyMagazzino) => void;
  headerClassName?: string;
  buttonClassName?: string;
  /** Es. `min-w-0 truncate` per colonne strette. */
  labelClassName?: string;
}) {
  return (
    <th className={`${globalTableThCell} ${headerClassName}`}>
      <MagazzinoSortBtn
        label={label}
        columnKey={columnKey}
        sortColumn={sortColumn}
        sortPhase={sortPhase}
        onSort={onSort}
        buttonClassName={buttonClassName}
        labelClassName={labelClassName}
      />
    </th>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[128px_1fr] gap-2 border-b border-zinc-100 py-2 text-sm last:border-b-0 dark:border-zinc-800">
      <div className="font-medium text-zinc-500">{label}</div>
      <div className="text-zinc-900 dark:text-zinc-100">{value}</div>
    </div>
  );
}

function ArchiveDupRicambioRow({
  p,
  onOpen,
}: {
  p: RicambioMagazzino;
  onOpen: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(p.id)}
      className="w-full rounded-lg border border-zinc-200/90 bg-white px-2.5 py-2 text-left text-xs transition-colors hover:border-orange-300/60 hover:bg-orange-50/40 dark:border-zinc-700 dark:bg-zinc-900/50"
    >
      <div className="font-semibold text-zinc-800 dark:text-zinc-100">{p.marca}</div>
      <div className="mt-0.5 font-mono text-[11px] font-medium text-zinc-700 dark:text-zinc-200">{p.codiceFornitoreOriginale}</div>
      <div className="mt-0.5 min-w-0 text-[11px] leading-snug text-zinc-600 dark:text-zinc-300">{p.descrizione}</div>
      <div className="mt-1 font-mono text-[11px] tabular-nums text-zinc-500 dark:text-zinc-400">Scorta {p.scorta}</div>
    </button>
  );
}

export function MagazzinoView() {
  const { authorName, user } = useAuth();
  const undoSessionId = useUndoSessionId();
  const magUndoScope = useMemo((): MagazzinoUndoScope | null => {
    if (!user?.id || !undoSessionId) return null;
    return { userId: user.id, sessionId: undoSessionId };
  }, [user?.id, undoSessionId]);

  function magazzinoLogScopeFields(): Pick<MagazzinoLogEntry, "autoreUserId" | "undoSessionId"> {
    return {
      autoreUserId: user?.id,
      undoSessionId: undoSessionId || undefined,
    };
  }
  const settingsPayload = useCabAppSettingsPayloadQuery();
  const appSettings = settingsPayload.data?.resolved;
  const settingsRows = settingsPayload.data?.rows ?? [];
  const magPerm = usePermissions("magazzino");
  const globalPerm = usePermissions();
  /** Creazione ricambio: `can_write` o `can_admin` sul modulo (viewer resta escluso). */
  const magCanCreateRicambio = magPerm.canWrite || magPerm.canAdmin;
  const magCanDeleteRicambio = globalPerm.canDeleteRecords;
  const upsertMagazzinoMaster = useSettingsUpsertMutation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const orderMapRef = useRef<Map<string, number> | null>(null);
  const nextOrderRef = useRef<number | null>(null);
  if (orderMapRef.current === null) {
    orderMapRef.current = new Map();
    nextOrderRef.current = 0;
  }

  function registerOrderIndex(id: string) {
    const m = orderMapRef.current!;
    if (!m.has(id)) {
      m.set(id, nextOrderRef.current!);
      nextOrderRef.current! += 1;
    }
  }

  const queryClient = useQueryClient();
  const magazzinoListQ = useMagazzinoListQuery();
  const [prodotti, setProdotti] = useState<RicambioMagazzino[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [searchApplied, setSearchApplied] = useState("");
  const searchInputRef = useRef(searchInput);
  searchInputRef.current = searchInput;
  const [sortColumn, setSortColumn] = useState<SortKeyMagazzino | null>(null);
  const [sortPhase, setSortPhase] = useState<SortPhaseMagazzino>("natural");
  const [advancedFilters, setAdvancedFilters] = useState<MagazzinoAdvancedFilters>(
    () => loadMagazzinoAdvancedFiltersPersisted() ?? MAGAZZINO_ADVANCED_FILTERS_EMPTY,
  );
  const [soloSottoScorta, setSoloSottoScorta] = useState(false);
  const [filtriEspansi, setFiltriEspansi] = useState(false);

  const patchAdvancedFilters = useCallback((patch: Partial<MagazzinoAdvancedFilters>) => {
    setAdvancedFilters((prev) => {
      const next = { ...prev, ...patch };
      saveMagazzinoAdvancedFiltersPersisted(next);
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

  const [masterMarche, setMasterMarche] = useState<string[]>([]);
  const [masterCategorie, setMasterCategorie] = useState<string[]>([]);
  const [masterMezzi, setMasterMezzi] = useState<string[]>([]);
  const [masterFornitori, setMasterFornitori] = useState<string[]>([]);
  const [nuovaMarca, setNuovaMarca] = useState("");
  const [nuovaCategoria, setNuovaCategoria] = useState("");
  const [nuovoFornitore, setNuovoFornitore] = useState("");
  const [masterPrefsHydrated, setMasterPrefsHydrated] = useState(false);
  const lastMergedSigRef = useRef<string>("");
  const mezziListePrefs = useMemo(
    () => migrateMezziListePrefs(appSettings?.mezziListe ?? createMezziListePrefsDefault()),
    [appSettings?.mezziListe],
  );

  const [newOpen, setNewOpen] = useState(false);
  const [newRicambioFocusToken, setNewRicambioFocusToken] = useState(0);
  const [newRicambioDraftId, setNewRicambioDraftId] = useState<string | null>(null);
  const [newForm, setNewForm] = useState<RicambioFormState>(emptyRicambioForm());
  const [dupCheckModalOpen, setDupCheckModalOpen] = useState(false);
  const [newIncompleteOpen, setNewIncompleteOpen] = useState(false);
  const [newIncompleteList, setNewIncompleteList] = useState<string[]>([]);

  const [detail, setDetail] = useState<{ id: string; mode: "info" | "edit" } | null>(null);
  const [editDraft, setEditDraft] = useState<RicambioFormState | null>(null);
  const [newListFieldInvalid, setNewListFieldInvalid] = useState(false);
  const [editListFieldInvalid, setEditListFieldInvalid] = useState(false);

  const [flashRowId, setFlashRowId] = useState<string | null>(null);
  const flashClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filteredSortedRef = useRef<RicambioMagazzino[]>([]);
  const listPageSizeRef = useRef(10);
  const setMagazzinoPageRef = useRef<(n: number) => void>(() => {});
  const logSeqRef = useRef(0);
  const LOG_DEBOUNCE_MS = 650;
  const pendingLogRef = useRef<{
    ricambioId: string;
    ricambioLabel: string;
    autore: string;
    changes: Map<string, { prima: string; dopo: string }>;
    timer: ReturnType<typeof setTimeout> | null;
  } | null>(null);

  const [logEntries, setLogEntries] = useState<MagazzinoLogEntry[]>([]);
  const [logPersistReady, setLogPersistReady] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const undoableMagazzinoLog = useMemo(
    () =>
      logEntries.find(
        (entry) =>
          entry.tipo === "update" &&
          !entry.annullato &&
          entryMatchesMagazzinoUndoScope(entry, magUndoScope) &&
          entry.changes.some((ch) => CAMPO_KEY_BY_LABEL.has(ch.campo)),
      ) ?? null,
    [logEntries, magUndoScope],
  );

  const listPageSize = useResponsiveListPageSize();
  listPageSizeRef.current = listPageSize;
  const {
    page: magLogPage,
    setPage: setMagLogPage,
    pageCount: magLogPageCount,
    sliceItems: sliceMagLogEntries,
    showPager: showMagLogPager,
    label: magLogPagerLabel,
    resetPage: resetMagLogPage,
  } = useClientPagination(logEntries.length, listPageSize);

  useEffect(() => {
    resetMagLogPage();
  }, [logOpen, logEntries.length, listPageSize, resetMagLogPage]);

  const pagedMagLogEntries = useMemo(() => sliceMagLogEntries(logEntries), [logEntries, sliceMagLogEntries, magLogPage]);

  const [timelineByRicambio, setTimelineByRicambio] = useState<Record<string, MagazzinoLogEntry[]>>({});

  useEffect(() => {
    if (!magazzinoListQ.data) return;
    const mapped = magazzinoListQ.data.map((row) => magazzinoRowToRicambioUI(row));
    setProdotti(mapped);
    const order = new Map<string, number>();
    mapped.forEach((r, i) => order.set(r.id, i));
    orderMapRef.current = order;
    nextOrderRef.current = mapped.length;
  }, [magazzinoListQ.data]);

  const setEditForm = useCallback<Dispatch<SetStateAction<RicambioFormState>>>((action) => {
    setEditDraft((prev) => {
      if (prev === null) return null;
      return typeof action === "function" ? action(prev) : action;
    });
  }, []);

  function mergeIntoPending(map: Map<string, { prima: string; dopo: string }>, ch: CampoChange) {
    const ex = map.get(ch.campo);
    if (ex) map.set(ch.campo, { prima: ex.prima, dopo: ch.dopo });
    else map.set(ch.campo, { prima: ch.prima, dopo: ch.dopo });
  }

  function applyLogEntry(entry: MagazzinoLogEntry) {
    setLogEntries((prev) => [entry, ...prev].slice(0, 100));
    setTimelineByRicambio((prev) => ({
      ...prev,
      [entry.ricambioId]: [entry, ...(prev[entry.ricambioId] ?? [])].slice(0, 80),
    }));
  }

  function removeMagazzinoLogEntry(id: string) {
    setLogEntries((prev) => prev.filter((e) => e.id !== id));
    setTimelineByRicambio((prev) => {
      const next: Record<string, MagazzinoLogEntry[]> = { ...prev };
      for (const k of Object.keys(next)) {
        next[k] = (next[k] ?? []).filter((e) => e.id !== id);
      }
      return next;
    });
  }

  function markMagazzinoLogEntryAnnullato(id: string) {
    setLogEntries((prev) => prev.map((e) => (e.id === id ? { ...e, annullato: true } : e)));
    setTimelineByRicambio((prev) => {
      const next: Record<string, MagazzinoLogEntry[]> = { ...prev };
      for (const k of Object.keys(next)) {
        next[k] = (next[k] ?? []).map((e) => (e.id === id ? { ...e, annullato: true } : e));
      }
      return next;
    });
  }

  function flushPendingLog() {
    const p = pendingLogRef.current;
    if (!p) return;
    if (p.timer) clearTimeout(p.timer);
    p.timer = null;
    pendingLogRef.current = null;
    const changes: CampoChange[] = Array.from(p.changes.entries()).map(([campo, v]) => ({
      campo,
      prima: v.prima,
      dopo: v.dopo,
    }));
    if (changes.length === 0) return;
    const base = computeRiepilogo(changes);
    const riepilogo = `${p.autore} — ${base}`;
    const entry: MagazzinoLogEntry = {
      id: `log-${Date.now()}-${++logSeqRef.current}`,
      tipo: "update",
      ricambioId: p.ricambioId,
      ricambio: p.ricambioLabel,
      autore: p.autore,
      at: new Date().toISOString(),
      changes,
      riepilogo,
      ...magazzinoLogScopeFields(),
    };
    applyLogEntry(entry);
  }

  function queueFieldUpdates(ricambioId: string, ricambioLabel: string, incoming: CampoChange[], autore: string) {
    const cur = pendingLogRef.current;
    if (cur && cur.ricambioId !== ricambioId) flushPendingLog();
    let p = pendingLogRef.current;
    if (!p || p.ricambioId !== ricambioId) {
      p = {
        ricambioId,
        ricambioLabel,
        autore,
        changes: new Map(),
        timer: null,
      };
      pendingLogRef.current = p;
    }
    for (const ch of incoming) mergeIntoPending(p.changes, ch);
    if (p.timer) clearTimeout(p.timer);
    p.timer = setTimeout(flushPendingLog, LOG_DEBOUNCE_MS);
  }

  function logImmediate(
    ricambioId: string,
    ricambioLabel: string,
    tipo: MagazzinoLogTipo,
    changes: CampoChange[],
    autore: string = authorName,
  ) {
    flushPendingLog();
    const riepilogo =
      tipo === "aggiunta"
        ? "Nuovo ricambio registrato"
        : tipo === "rimozione"
          ? "Rimosso dal magazzino"
          : `${autore} — ${computeRiepilogo(changes)}`;
    const entry: MagazzinoLogEntry = {
      id: `log-${Date.now()}-${++logSeqRef.current}`,
      tipo,
      ricambioId,
      ricambio: ricambioLabel,
      autore,
      at: new Date().toISOString(),
      changes,
      riepilogo,
      ...magazzinoLogScopeFields(),
    };
    applyLogEntry(entry);
  }

  function logImageEvent(ev: RecordImageLogEvent, ricambio: RicambioMagazzino) {
    logImmediate(
      ev.recordId,
      ricambio.descrizione,
      "update",
      [{ campo: "Foto", prima: "—", dopo: ev.action === "image_uploaded" ? "Foto aggiunta" : "Foto rimossa" }],
      authorName,
    );
  }

  const flashRow = useCallback((id: string, opts?: { durationMs?: number }) => {
    if (flashClearRef.current) clearTimeout(flashClearRef.current);
    setFlashRowId(id);
    const ms = opts?.durationMs ?? 820;
    flashClearRef.current = setTimeout(() => {
      setFlashRowId(null);
      flashClearRef.current = null;
    }, ms);
  }, []);

  const focusRicambioInTable = useCallback(
    (ricambioId: string, opts?: { applySottoScorta?: boolean; flashMs?: number }) => {
      flushPendingLog();
      setDupCheckModalOpen(false);
      setNewOpen(false);
      setAdvancedFilters(MAGAZZINO_ADVANCED_FILTERS_EMPTY);
      saveMagazzinoAdvancedFiltersPersisted(MAGAZZINO_ADVANCED_FILTERS_EMPTY);
      setSoloSottoScorta(Boolean(opts?.applySottoScorta));
      setSearchInput("");
      setSearchApplied("");
      setLogOpen(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.setTimeout(() => {
            const rows = filteredSortedRef.current;
            const ps = Math.max(1, listPageSizeRef.current);
            const idx = rows.findIndex((p) => p.id === ricambioId);
            if (idx >= 0) {
              setMagazzinoPageRef.current(Math.floor(idx / ps));
            } else {
              setMagazzinoPageRef.current(0);
            }
            flashRow(ricambioId, { durationMs: opts?.flashMs ?? 1400 });
            window.setTimeout(() => {
              document.getElementById(`magazzino-row-${ricambioId}`)?.scrollIntoView({
                behavior: "smooth",
                block: "center",
                inline: "nearest",
              });
            }, 60);
          }, 0);
        });
      });
    },
    [flashRow],
  );

  useEffect(() => {
    const id = searchParams.get(Q_FOCUS_RICAMBIO);
    if (!id) return;
    const t = window.setTimeout(() => {
      focusRicambioInTable(id);
      router.replace(pathname, { scroll: false });
    }, 120);
    return () => window.clearTimeout(t);
  }, [searchParams, pathname, router, focusRicambioInTable]);

  useEffect(() => {
    return () => {
      if (flashClearRef.current) clearTimeout(flashClearRef.current);
      const pend = pendingLogRef.current;
      if (pend?.timer) clearTimeout(pend.timer);
      pendingLogRef.current = null;
    };
  }, []);

  useEffect(() => {
    setMagazzinoReportSnapshot(prodotti);
  }, [prodotti]);

  useEffect(() => {
    const raw = { mag: appSettings?.magazzinoMaster, liste: appSettings?.mezziListe };
    const sig = JSON.stringify(raw);
    if (sig === lastMergedSigRef.current) return;
    lastMergedSigRef.current = sig;

    const src = prodotti;
    const fromP = initialMasterFromProducts(src);
    const fromF = initialFornitoriFromProducts(src);
    const listeSrc = migrateMezziListePrefs(appSettings?.mezziListe ?? createMezziListePrefsDefault());
    const fromListe = flattenCompatDaAttrezzature(listeSrc);
    const stored = appSettings?.magazzinoMaster;
    if (
      stored &&
      (stored.marche.length > 0 ||
        stored.categorie.length > 0 ||
        stored.mezziCompatibili.length > 0 ||
        (stored.fornitori?.length ?? 0) > 0)
    ) {
      setMasterMarche(mergeMasterWithRows(stored.marche, fromP.marche));
      setMasterCategorie(mergeMasterWithRows(stored.categorie, fromP.categorie));
      setMasterMezzi(mergeMasterWithRows(mergeMasterWithRows(stored.mezziCompatibili, fromP.mezzi), fromListe));
      setMasterFornitori(mergeMasterWithRows(stored.fornitori ?? [], fromF));
    } else {
      setMasterMarche(fromP.marche);
      setMasterCategorie(fromP.categorie);
      setMasterMezzi(mergeMasterWithRows(fromP.mezzi, fromListe));
      setMasterFornitori(fromF);
    }
    setMasterPrefsHydrated(true);
  }, [appSettings, prodotti]);

  const magMasterSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settingsRowsRef = useRef(settingsRows);
  settingsRowsRef.current = settingsRows;
  const lastSyncedMagMasterSigRef = useRef<string | null>(null);

  const magMasterPayloadSig = useCallback(
    () =>
      JSON.stringify({
        marche: masterMarche,
        categorie: masterCategorie,
        mezziCompatibili: masterMezzi,
        fornitori: masterFornitori,
      }),
    [masterMarche, masterCategorie, masterMezzi, masterFornitori],
  );

  useEffect(() => {
    if (!masterPrefsHydrated || !magPerm.canWrite) return;
    const sig = magMasterPayloadSig();
    if (sig === lastSyncedMagMasterSigRef.current) return;

    if (magMasterSaveTimer.current) clearTimeout(magMasterSaveTimer.current);
    magMasterSaveTimer.current = setTimeout(() => {
      magMasterSaveTimer.current = null;
      const masterRow = settingsRowsRef.current.find(
        (r) => r.module === CAB_SETTINGS_MODULE.magazzino && r.key === CAB_SETTINGS_KEY.master,
      );
      const serverVal = masterRow?.value as
        | { marche?: string[]; categorie?: string[]; mezziCompatibili?: string[]; fornitori?: string[] }
        | undefined;
      const serverSig = JSON.stringify({
        marche: serverVal?.marche ?? [],
        categorie: serverVal?.categorie ?? [],
        mezziCompatibili: serverVal?.mezziCompatibili ?? [],
        fornitori: serverVal?.fornitori ?? [],
      });
      if (sig === serverSig) {
        lastSyncedMagMasterSigRef.current = sig;
        return;
      }
      suppressSettingsRemoteNotify(6000);
      void upsertMagazzinoMaster
        .mutateAsync({
          module: CAB_SETTINGS_MODULE.magazzino,
          key: CAB_SETTINGS_KEY.master,
          value: {
            marche: masterMarche,
            categorie: masterCategorie,
            mezziCompatibili: masterMezzi,
            fornitori: masterFornitori,
          },
          expectedUpdatedAt: masterRow?.updated_at,
        })
        .then(() => {
          lastSyncedMagMasterSigRef.current = sig;
        });
    }, 900);
    return () => {
      if (magMasterSaveTimer.current) clearTimeout(magMasterSaveTimer.current);
    };
  }, [masterPrefsHydrated, magPerm.canWrite, magMasterPayloadSig, masterMarche, masterCategorie, masterMezzi, masterFornitori, upsertMagazzinoMaster]);

  useEffect(() => {
    setLogEntries(loadMagazzinoChangeLog());
    setLogPersistReady(true);
  }, []);

  useEffect(() => {
    if (!logPersistReady) return;
    saveMagazzinoChangeLog(logEntries);
  }, [logEntries, logPersistReady]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncFromSnapshot = () => {
      setProdotti(() => getMagazzinoReportSnapshot().map((r) => ({ ...r })));
      setLogEntries(loadMagazzinoChangeLog());
    };
    window.addEventListener(MAGAZZINO_PRODOTTI_REFRESH_EVENT, syncFromSnapshot);
    return () => window.removeEventListener(MAGAZZINO_PRODOTTI_REFRESH_EVENT, syncFromSnapshot);
  }, []);

  const marche = useMemo(
    () => mergeMasterWithRows(masterMarche, prodotti.map((p) => p.marca)),
    [masterMarche, prodotti],
  );

  const categorie = useMemo(
    () => mergeMasterWithRows(masterCategorie, prodotti.map((p) => p.categoria)),
    [masterCategorie, prodotti],
  );

  const fornitori = useMemo(
    () => mergeMasterWithRows(masterFornitori, prodotti.map((p) => p.fornitoreNonOriginale)),
    [masterFornitori, prodotti],
  );

  const mezzi = useMemo(() => {
    const fromRows: string[] = [];
    prodotti.forEach((p) => p.compatibilitaMezzi.forEach((m) => fromRows.push(m)));
    return mergeMasterWithRows(masterMezzi, fromRows);
  }, [masterMezzi, prodotti]);

  const mezziCompatOptions = useMemo(() => {
    const fromAttrezzature = flattenCompatDaAttrezzature(migrateMezziListePrefs(mezziListePrefs));
    return [...new Set([...mezzi, ...fromAttrezzature])].sort((a, b) => a.localeCompare(b, "it"));
  }, [mezzi, mezziListePrefs]);

  const sottoScortaTotale = useMemo(
    () => prodotti.filter((p) => p.scorta < p.scortaMinima).length,
    [prodotti],
  );

  const sottoScortaList = useMemo(
    () => prodotti.filter((p) => p.scorta < p.scortaMinima),
    [prodotti],
  );

  const archivioDupCodeGroups = useMemo(() => analyzeArchiveDuplicateCodes(prodotti), [prodotti]);
  const archivioDupCodeCount = archivioDupCodeGroups.length;

  const nuovoCodiceDupEsistente = useMemo(() => {
    if (!newOpen) return null;
    return findFirstDuplicateByCodiceOriginale(prodotti, newForm.codiceFornitoreOriginale);
  }, [newOpen, prodotti, newForm.codiceFornitoreOriginale]);

  const nuovoCodiceBloccaSalvataggio = Boolean(nuovoCodiceDupEsistente);

  const consumoMap = useMemo(
    () => buildConsumoMapMagazzinoRolling36ForProducts(logEntries, prodotti, new Date()),
    [logEntries, prodotti],
  );

  const consumoAvgById = useMemo(() => {
    const m = new Map<string, number | null>();
    for (const p of prodotti) {
      const c = consumoMap.get(p.id);
      m.set(p.id, c?.avgMonthly ?? null);
    }
    return m;
  }, [prodotti, consumoMap]);

  const canUndoScortaById = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const p of prodotti) {
      const e = latestUndoableScortaEntryForRicambio(logEntries, p.id, magUndoScope);
      if (!e) {
        m.set(p.id, false);
        continue;
      }
      const parsed = parseScortaChange(e);
      m.set(p.id, Boolean(parsed && p.scorta === parsed.dopo));
    }
    return m;
  }, [prodotti, logEntries, magUndoScope]);

  const filterCatalog = useMemo(
    () => buildMagazzinoFilterCatalog(prodotti, mezziListePrefs, categorie),
    [prodotti, mezziListePrefs, categorie],
  );

  const pageFilters = useMemo(
    (): MagazzinoPageFilters => ({
      search: searchApplied,
      soloSottoScorta,
      ...advancedFilters,
    }),
    [searchApplied, soloSottoScorta, advancedFilters],
  );

  const searchSuggestionPool = useMemo(
    () => buildMagazzinoSearchSuggestions(prodotti, searchInput),
    [prodotti, searchInput],
  );

  const filteredSorted = useMemo(() => {
    const orderMap = orderMapRef.current!;
    let rows = prodotti.filter((p) => magazzinoRowMatchesPageFilters(p, pageFilters));

    rows = [...rows].sort((a, b) => {
      if (sortPhase === "natural" || sortColumn === null) {
        return compareNaturalOrder(a, b, orderMap);
      }
      const primary = compareByColumn(a, b, sortColumn, sortPhase, consumoAvgById);
      if (primary !== 0) return primary;
      return compareNaturalOrder(a, b, orderMap);
    });

    return rows;
  }, [prodotti, pageFilters, sortColumn, sortPhase, consumoAvgById]);

  filteredSortedRef.current = filteredSorted;

  const { page, setPage, pageCount, sliceItems, showPager, label, resetPage } = useClientPagination(filteredSorted.length, listPageSize);

  useEffect(() => {
    setMagazzinoPageRef.current = setPage;
  }, [setPage]);

  useEffect(() => {
    resetPage();
  }, [searchApplied, advancedFilters, soloSottoScorta, sortColumn, sortPhase, listPageSize, resetPage]);

  const pagedMagazzino = useMemo(() => sliceItems(filteredSorted), [sliceItems, filteredSorted, page]);

  function onSort(k: SortKeyMagazzino) {
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

  function touch(p: RicambioMagazzino): RicambioMagazzino {
    return {
      ...p,
      dataUltimaModifica: new Date().toISOString(),
      autoreUltimaModifica: authorName,
    };
  }

  function adjustScorta(id: string, delta: number) {
    if (!magCanCreateRicambio) return;
    const row = prodotti.find((p) => p.id === id);
    if (!row) return;
    const dopo = Math.max(0, Math.round(row.scorta + delta));
    queueFieldUpdates(
      id,
      row.descrizione,
      [{ campo: "Scorta", prima: String(row.scorta), dopo: String(dopo) }],
      authorName,
    );
    const next = touch({ ...row, scorta: dopo });
    setProdotti((prev) => prev.map((p) => (p.id === id ? next : p)));
    void magazzinoService.update(id, ricambioUiToMagazzinoUpdate(next)).then((res) => {
      if (!res.success) window.alert(res.error ?? "Aggiornamento scorta non riuscito.");
      else void queryClient.invalidateQueries({ queryKey: [...QK.magazzino] });
    });
    flashRow(id);
  }

  function undoLastScorta(id: string) {
    if (!magCanCreateRicambio) return;
    flushPendingLog();
    const entry = latestUndoableScortaEntryForRicambio(logEntries, id, magUndoScope);
    if (!entry) {
      window.alert("Nessuna modifica di scorta annullabile per questo ricambio.");
      return;
    }
    const parsed = parseScortaChange(entry);
    if (!parsed) return;
    const row = prodotti.find((p) => p.id === id);
    if (!row || row.scorta !== parsed.dopo) {
      window.alert("La scorta non corrisponde più all’ultima registrazione: annullamento non disponibile.");
      return;
    }
    setProdotti((prev) => prev.map((p) => (p.id === id ? touch({ ...p, scorta: parsed.prima }) : p)));
    markMagazzinoLogEntryAnnullato(entry.id);
  }

  async function undoUltimoMagazzino() {
    if (!magCanCreateRicambio) return;
    flushPendingLog();
    const entry = undoableMagazzinoLog;
    if (!entry) return;
    const row = prodotti.find((p) => p.id === entry.ricambioId);
    if (!row) {
      window.alert("Ricambio non trovato: undo non disponibile.");
      return;
    }
    if (!window.confirm("Annullare l'ultima azione reversibile sul magazzino?")) return;
    const next: RicambioMagazzino = { ...row };
    for (const ch of entry.changes) {
      const key = CAMPO_KEY_BY_LABEL.get(ch.campo);
      if (!key) continue;
      (next as unknown as Record<string, unknown>)[key] = parseUndoValue(key, ch.prima, row);
    }
    const touched = touch(next);
    const updated = await magazzinoService.update(entry.ricambioId, ricambioUiToMagazzinoUpdate(touched));
    if (!updated.success || !updated.data) {
      window.alert(updated.error ?? "Undo non riuscito.");
      return;
    }
    const ui = magazzinoRowToRicambioUI(updated.data, authorName);
    setProdotti((prev) => prev.map((p) => (p.id === entry.ricambioId ? touch(ui) : p)));
    markMagazzinoLogEntryAnnullato(entry.id);
    flashRow(entry.ricambioId);
    void queryClient.invalidateQueries({ queryKey: [...QK.magazzino] });
  }

  function openNewModal() {
    if (!magCanCreateRicambio) return;
    flushPendingLog();
    setDupCheckModalOpen(false);
    setNewIncompleteOpen(false);
    setNewIncompleteList([]);
    setNewListFieldInvalid(false);
    setNewForm(emptyRicambioForm());
    setNewRicambioDraftId(crypto.randomUUID());
    setNewRicambioFocusToken((t) => t + 1);
    setNewOpen(true);
  }

  async function finalizeNewRicambio() {
    setNewListFieldInvalid(false);
    const r = ricambioFromFormLenient(newForm, newRicambioDraftId ?? undefined, authorName);
    if (findFirstDuplicateByCodiceOriginale(prodotti, newForm.codiceFornitoreOriginale)) {
      return;
    }
    const created = await magazzinoService.create(ricambioUiToMagazzinoInsert(r));
    if (!created.success || !created.data) {
      window.alert(created.error ?? "Creazione ricambio non riuscita.");
      return;
    }
    const ui = magazzinoRowToRicambioUI(created.data, authorName);
    registerOrderIndex(ui.id);
    setProdotti((prev) => [ui, ...prev]);
    setNewForm(emptyRicambioForm());
    setNewRicambioDraftId(null);
    setNewOpen(false);
    setNewIncompleteOpen(false);
    setNewIncompleteList([]);
    logImmediate(ui.id, ui.descrizione, "aggiunta", changesForNuovoRicambio(ui), authorName);
    flashRow(ui.id);
    void queryClient.invalidateQueries({ queryKey: [...QK.magazzino] });
  }

  function submitNew(e: React.FormEvent) {
    e.preventDefault();
    if (nuovoCodiceBloccaSalvataggio) return;
    void finalizeNewRicambio();
  }

  const detailRicambio = detail ? prodotti.find((p) => p.id === detail.id) : undefined;

  function openInfo(p: RicambioMagazzino) {
    setDetail({ id: p.id, mode: "info" });
    setEditDraft(null);
  }

  function startEditFromInfo() {
    if (!magCanCreateRicambio) return;
    if (!detailRicambio) return;
    setEditListFieldInvalid(false);
    setEditDraft(toFormDraft(detailRicambio));
    setDetail({ id: detailRicambio.id, mode: "edit" });
  }

  function cancelEditBackToInfo() {
    if (!detail) return;
    setEditDraft(null);
    setDetail({ id: detail.id, mode: "info" });
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!magCanCreateRicambio) return;
    if (!detail || detail.mode !== "edit" || !editDraft) return;
    const listErr = validateRicambioListFields(editDraft, {
      marche,
      categorie,
      mezziListe: mezziListePrefs,
    });
    if (listErr) {
      setEditListFieldInvalid(true);
      window.alert(listErr);
      return;
    }
    setEditListFieldInvalid(false);
    const before = prodotti.find((p) => p.id === detail.id);
    const next = ricambioFromForm(editDraft, detail.id, authorName);
    if (!next || !before) {
      window.alert("Compila tutti i campi obbligatori.");
      return;
    }
    const changes = diffRicambi(before, next);
    const updated = await magazzinoService.update(detail.id, ricambioUiToMagazzinoUpdate(next));
    if (!updated.success || !updated.data) {
      window.alert(updated.error ?? "Salvataggio non riuscito.");
      return;
    }
    const ui = magazzinoRowToRicambioUI(updated.data, authorName);
    setProdotti((prev) => prev.map((p) => (p.id === detail.id ? touch(ui) : p)));
    setEditDraft(null);
    setDetail({ id: detail.id, mode: "info" });
    if (changes.length > 0) {
      logImmediate(detail.id, ui.descrizione, "update", changes, authorName);
    }
    flashRow(detail.id);
    void queryClient.invalidateQueries({ queryKey: [...QK.magazzino] });
  }

  async function eliminaRicambio() {
    if (!detailRicambio) return;
    if (!magCanDeleteRicambio) return;
    if (!window.confirm(`Eliminare il ricambio "${detailRicambio.descrizione}" dal magazzino?`)) return;
    const removed = await magazzinoService.remove(detailRicambio.id);
    if (!removed.success) {
      window.alert(removed.error ?? "Eliminazione non riuscita.");
      return;
    }
    logImmediate(detailRicambio.id, detailRicambio.descrizione, "rimozione", [], authorName);
    setProdotti((prev) => prev.filter((p) => p.id !== detailRicambio.id));
    setDetail(null);
    setEditDraft(null);
    void queryClient.invalidateQueries({ queryKey: [...QK.magazzino] });
  }

  function closeDetail() {
    setDetail(null);
    setEditDraft(null);
  }

  const infoTimeline = useMemo(() => {
    if (!detailRicambio) return [];
    return [...(timelineByRicambio[detailRicambio.id] ?? [])].sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
    );
  }, [detailRicambio, timelineByRicambio]);

  const anyOverlayOpen = newOpen || newIncompleteOpen || !!detail || logOpen || dupCheckModalOpen;
  useBodyScrollLock(anyOverlayOpen);

  function addMasterMarca() {
    const t = nuovaMarca.trim();
    if (!t) return;
    setMasterMarche((prev) => [...new Set([...prev, t])].sort((a, b) => a.localeCompare(b, "it")));
    setNuovaMarca("");
  }
  function removeMasterMarca(m: string) {
    const n = prodotti.filter((p) => p.marca === m).length;
    if (n > 0 && !window.confirm(`Marca usata da ${n} ricambi. Rimuoverla dall'anagrafica?`)) return;
    setMasterMarche((prev) => prev.filter((x) => x !== m));
  }
  function addMasterCategoria() {
    const t = nuovaCategoria.trim();
    if (!t) return;
    setMasterCategorie((prev) => [...new Set([...prev, t])].sort((a, b) => a.localeCompare(b, "it")));
    setNuovaCategoria("");
  }
  function removeMasterCategoria(c: string) {
    const n = prodotti.filter((p) => p.categoria === c).length;
    if (n > 0 && !window.confirm(`Categoria usata da ${n} ricambi. Rimuoverla dall'anagrafica?`)) return;
    setMasterCategorie((prev) => prev.filter((x) => x !== c));
  }
  function removeMasterMezzo(m: string) {
    const n = prodotti.reduce((acc, p) => acc + (p.compatibilitaMezzi.includes(m) ? 1 : 0), 0);
    if (n > 0 && !window.confirm(`Mezzo indicato su ${n} ricambi. Rimuoverlo dall'anagrafica?`)) return;
    setMasterMezzi((prev) => prev.filter((x) => x !== m));
  }
  function addMasterFornitore() {
    const t = nuovoFornitore.trim();
    if (!t) return;
    setMasterFornitori((prev) => [...new Set([...prev, t])].sort((a, b) => a.localeCompare(b, "it")));
    setNuovoFornitore("");
  }
  function removeMasterFornitore(f: string) {
    const n = prodotti.filter((p) => p.fornitoreNonOriginale.trim() === f).length;
    if (n > 0 && !window.confirm(`Fornitore indicato su ${n} ricambi. Rimuoverlo dall'anagrafica?`)) return;
    setMasterFornitori((prev) => prev.filter((x) => x !== f));
  }

  function resetMagazzinoRicerca() {
    setSearchInput("");
    setSearchApplied("");
  }

  function resetMagazzinoFilters() {
    setAdvancedFilters(MAGAZZINO_ADVANCED_FILTERS_EMPTY);
    saveMagazzinoAdvancedFiltersPersisted(MAGAZZINO_ADVANCED_FILTERS_EMPTY);
    setSoloSottoScorta(false);
    resetMagazzinoRicerca();
    setFiltriEspansi(false);
  }

  const hasAdvancedPanelFilters = magazzinoAdvancedFiltersActive(advancedFilters);

  const hasMagazzinoFilters =
    searchApplied.trim().length > 0 || hasAdvancedPanelFilters || soloSottoScorta;

  return (
    <div className="magazzino-scroll-scope min-w-0">
      <PageHeader
        title="Magazzino ricambi"
        topRowClassName="max-sm:flex-nowrap max-sm:items-center max-sm:gap-1.5 [&_.cab-page-title-box]:max-sm:truncate"
        actions={
          <GestionalePageToolbarActions
            className="max-sm:flex-nowrap max-sm:gap-1"
            leading={
              <MagazzinoGiacenzaBell
                count={sottoScortaTotale}
                items={sottoScortaList}
                onSelectRicambio={(id) => focusRicambioInTable(id, { applySottoScorta: true })}
                triggerClassName={`${dsPageToolbarBtn} shrink-0 px-2.5 sm:px-3`}
              />
            }
            canUndo={Boolean(undoableMagazzinoLog)}
            undoDisabled={!magCanCreateRicambio}
            onUndo={() => void undoUltimoMagazzino()}
            onOpenLog={() => setLogOpen(true)}
            logTitle="Storico modifiche magazzino"
          />
        }
      />

      <div className={dsStackPage}>
      <ShellCard>
        {archivioDupCodeCount > 0 ? (
          <div className="mb-3 flex flex-col gap-2 rounded-lg border border-amber-200/80 bg-amber-50/50 px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between dark:border-amber-900/45 dark:bg-amber-950/25">
            <p className="text-amber-950 dark:text-amber-100">
              {archivioDupCodeCount === 1 ? (
                <>
                  Rilevato <span className="font-semibold tabular-nums">1</span> codice duplicato in archivio
                </>
              ) : (
                <>
                  Rilevati <span className="font-semibold tabular-nums">{archivioDupCodeCount}</span> codici duplicati in
                  archivio
                </>
              )}
            </p>
            <button
              type="button"
              onClick={() => setDupCheckModalOpen(true)}
              className={`${erpBtnSoftOrange} shrink-0 self-start sm:self-auto`}
            >
              Mostra
            </button>
          </div>
        ) : null}

        <section aria-label="Azioni e filtri magazzino">
          <PageToolbar
            primaryAction={
              <button
                type="button"
                onClick={openNewModal}
                disabled={!magCanCreateRicambio}
                className={`${erpBtnNuovaLavorazione} h-11 shrink-0 disabled:cursor-not-allowed disabled:opacity-50`}
                title={magCanCreateRicambio ? "Aggiungi un ricambio" : "Sola lettura"}
              >
                <span className="text-base font-semibold leading-none" aria-hidden>
                  +
                </span>
                Nuovo ricambio
              </button>
            }
            search={
              <GestionaleListSearchField
                id="magazzino-search"
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
                aria-label="Cerca in magazzino"
                wrapperClassName="min-w-0 flex-1 sm:min-w-[12rem]"
              />
            }
            filtersExpanded={filtriEspansi}
            onFiltersToggle={() => setFiltriEspansi((o) => !o)}
            filtersActive={hasAdvancedPanelFilters || soloSottoScorta}
            filtersPanel={
              <MagazzinoAdvancedFilterPanel
                filters={advancedFilters}
                onChange={patchAdvancedFilters}
                catalog={filterCatalog}
              />
            }
            meta={
              <>
                <PageToolbarResultCount count={filteredSorted.length} filtersActive={hasMagazzinoFilters} />
                <PageToolbarActions>
                  <button
                    type="button"
                    aria-pressed={soloSottoScorta}
                    onClick={() => setSoloSottoScorta((v) => !v)}
                    className={
                      soloSottoScorta
                        ? `${dsPageToolbarBtn} border-[color:color-mix(in_srgb,var(--cab-primary)_45%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))] text-[color:color-mix(in_srgb,var(--cab-primary)_88%,var(--cab-text))] ring-1 ring-[color:color-mix(in_srgb,var(--cab-primary)_28%,transparent)]`
                        : dsPageToolbarBtn
                    }
                  >
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        soloSottoScorta
                          ? "bg-[var(--cab-primary)]"
                          : "bg-[color:color-mix(in_srgb,var(--cab-text-muted)_55%,transparent)]"
                      }`}
                      aria-hidden
                    />
                    Sotto scorta minima
                  </button>
                  <button type="button" className={dsPageToolbarBtn} onClick={resetMagazzinoRicerca}>
                    Pulisci ricerca
                  </button>
                  <button type="button" className={dsPageToolbarBtn} onClick={resetMagazzinoFilters}>
                    Reimposta filtri
                  </button>
                </PageToolbarActions>
              </>
            }
          />
        </section>

        <div className={`mt-4 hidden md:block ${gestionaleListTableMasterWrapClass}`}>
          <table className={gestionaleListTableClass}>
            <colgroup>
              <col className="w-[10.5%]" />
              <col className="w-[7%]" />
              <col className="w-[20%]" />
              <col className="w-[9%]" />
              <col className="w-[6%]" />
              <col className="w-[7.5%]" />
              <col className="w-[10%]" />
              <col className="w-[8.5%]" />
              <col className="w-[9.5%]" />
              <col className="w-[12%]" />
            </colgroup>
            <thead className={gestionaleListTableTheadClass}>
              <tr className={gestionaleListTableHeadRowClass}>
                <SortTh
                  label="CODICE"
                  columnKey="codiceFornitoreOriginale"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSort}
                  headerClassName="!pl-4 pr-2.5 text-left"
                  buttonClassName="w-full justify-start"
                />
                <SortTh
                  label="Marca"
                  columnKey="marca"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSort}
                />
                <th className="min-w-0 px-2.5 py-2 align-top">
                  <div className="flex min-w-0 flex-col items-start gap-1">
                    <MagazzinoSortBtn
                      label="Descrizione"
                      columnKey="descrizione"
                      sortColumn={sortColumn}
                      sortPhase={sortPhase}
                      onSort={onSort}
                    />
                    <MagazzinoSortBtn
                      label="Compatibilità"
                      columnKey="compatibilitaMezzi"
                      sortColumn={sortColumn}
                      sortPhase={sortPhase}
                      onSort={onSort}
                      buttonClassName="text-[10px] font-semibold normal-case tracking-normal"
                    />
                  </div>
                </th>
                <SortTh
                  label="Categoria"
                  columnKey="categoria"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSort}
                  headerClassName="min-w-0"
                  labelClassName="min-w-0 truncate"
                  buttonClassName="w-full min-w-0 justify-start"
                />
                <SortTh
                  label="Scorta"
                  columnKey="scorta"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSort}
                  headerClassName="text-center"
                  buttonClassName="w-full justify-center"
                />
                <SortTh
                  label="Scorta min."
                  columnKey="scortaMinima"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSort}
                  headerClassName="min-w-0 text-center"
                  buttonClassName="w-full min-w-0 justify-center whitespace-nowrap"
                />
                <SortTh
                  label="Ultima modifica"
                  columnKey="dataUltimaModifica"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSort}
                  headerClassName="min-w-0 text-center"
                  buttonClassName="w-full justify-center whitespace-nowrap"
                />
                <SortTh
                  label="P. vendita"
                  columnKey="prezzoVendita"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSort}
                  headerClassName="text-center"
                  buttonClassName="w-full justify-center"
                />
                <SortTh
                  label="Consumo medio"
                  columnKey="consumoMedioMensile"
                  sortColumn={sortColumn}
                  sortPhase={sortPhase}
                  onSort={onSort}
                  headerClassName="whitespace-nowrap text-center"
                  buttonClassName="w-full justify-center whitespace-nowrap"
                />
                <th className={`${globalTableThCell} ${gestionaleListTableThAzioni}`}>
                  <span className={`${globalTableThLabel} block truncate whitespace-nowrap`}>Azioni</span>
                </th>
              </tr>
            </thead>
            <tbody className={gestionaleListTableTbodyClass}>
              {pagedMagazzino.map((p) => {
                const consumoRow = consumoMap.get(p.id);
                const avgM = consumoRow?.avgMonthly ?? null;
                const low = p.scorta < p.scortaMinima;
                const flash = flashRowId === p.id;
                return (
                  <tr
                    id={`magazzino-row-${p.id}`}
                    key={p.id}
                    className={[
                      dsTableRow,
                      gestionaleListTableRowSurfaceClass,
                      rowStockBg(p),
                      flash
                        ? "bg-white/95 shadow-[inset_0_0_0_1px_rgba(228,228,231,0.95),0_0_20px_rgba(255,255,255,0.65)] transition-[background-color,box-shadow] duration-200 ease-out dark:bg-zinc-100/12 dark:shadow-[inset_0_0_0_1px_rgba(82,82,91,0.45),0_0_18px_rgba(255,255,255,0.06)]"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <td className={`min-w-0 ${dsTableTdCompact} ${rowStockBorderFirstTd(p)}`}>
                      <span className="inline-block max-w-full break-all rounded-md bg-zinc-100 px-2 py-1 font-mono text-[12px] font-semibold leading-snug tracking-wide dark:bg-zinc-800">
                        {p.codiceFornitoreOriginale}
                      </span>
                    </td>
                    <td className={`${dsTableTdCompact} font-medium`}>{p.marca}</td>
                    <td className={`min-w-0 ${dsTableTdCompact}`}>
                      <div className="break-words font-medium leading-snug">{p.descrizione}</div>
                      <div className="mt-0.5 break-words text-xs leading-snug text-zinc-500 dark:text-zinc-400">
                        {compatLabel(p.compatibilitaMezzi)}
                      </div>
                    </td>
                    <td
                      className={`min-w-0 ${dsTableTdCompact} text-zinc-700 dark:text-zinc-300`}
                      title={p.categoria}
                    >
                      <span className="block truncate text-[13px] leading-snug">{p.categoria}</span>
                    </td>
                    <td className={`${dsTableTdCompact} text-center`}>
                      <span
                        className={`inline-flex min-w-[2.5rem] justify-center rounded-full px-2 py-0.5 font-mono text-xs font-semibold tabular-nums ${
                          low
                            ? "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100"
                            : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                        }`}
                      >
                        {p.scorta}
                      </span>
                    </td>
                    <td className={`${dsTableTdCompact} text-center font-mono text-xs tabular-nums text-zinc-700 dark:text-zinc-300`}>
                      {p.scortaMinima}
                    </td>
                    <td className={`${dsTableTdCompact} text-center align-middle`}>
                      {(() => {
                        const stale = isModificaOlderThanMonths(p.dataUltimaModifica, 6);
                        return (
                          <div
                            title={formatTimestampHover(p.dataUltimaModifica)}
                            className={`mx-auto inline-block max-w-full rounded-md px-1.5 py-1 text-center ${
                              stale
                                ? "bg-amber-50/95 ring-1 ring-amber-200/80 dark:bg-amber-950/35 dark:ring-amber-800/55"
                                : ""
                            }`}
                          >
                            <div className="text-[13px] font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                              {formatDataUltimaMain(p.dataUltimaModifica)}
                            </div>
                            <div className="text-[11px] leading-tight text-zinc-500 dark:text-zinc-400">
                              {p.autoreUltimaModifica}
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                    <td className={`${dsTableTdCompact} text-center font-medium tabular-nums`}>{eur(p.prezzoVendita)}</td>
                    <td
                      className={`${dsTableTdCompact} text-center text-[13px] tabular-nums text-zinc-700 dark:text-zinc-300`}
                      title={consumoRow?.insufficientReason ?? (avgM != null ? "Da log magazzino (uscite Δ scorta)" : undefined)}
                    >
                      {avgM != null ? formatAvgMonthlyMagazzinoIt(avgM) : "dati insufficienti"}
                    </td>
                    <td className={gestionaleListTableTdAzioni}>
                      <div className={dsTableActionsGroup}>
                        <button
                          type="button"
                          onClick={() => openInfo(p)}
                          className={dsTableActionBtnInfo}
                          title="Scheda informativa"
                          aria-label="Scheda informativa"
                        >
                          <IconInfoMagazzino />
                        </button>
                        <button
                          type="button"
                          onClick={() => undoLastScorta(p.id)}
                          disabled={!magCanCreateRicambio || !canUndoScortaById.get(p.id)}
                          className={dsTableActionBtnUndo}
                          title={!magCanCreateRicambio ? READONLY_PERMISSION_HINT : "Annulla l’ultima modifica di scorta (solo se registrata come singola operazione)"}
                          aria-label="Annulla ultima modifica scorta"
                        >
                          <IconUndoMagazzino />
                        </button>
                        <button
                          type="button"
                          onClick={() => adjustScorta(p.id, -1)}
                          disabled={!magCanCreateRicambio}
                          className={dsTableActionBtnSecondary}
                          title={!magCanCreateRicambio ? READONLY_PERMISSION_HINT : "Diminuisci scorta"}
                          aria-label="Diminuisci scorta"
                        >
                          −
                        </button>
                        <button
                          type="button"
                          onClick={() => adjustScorta(p.id, 1)}
                          disabled={!magCanCreateRicambio}
                          className={dsTableActionBtnPrimary}
                          title={!magCanCreateRicambio ? READONLY_PERMISSION_HINT : "Aumenta scorta"}
                          aria-label="Aumenta scorta"
                        >
                          +
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 space-y-3 md:hidden">
          {pagedMagazzino.map((p) => {
            const consumoRow = consumoMap.get(p.id);
            const avgM = consumoRow?.avgMonthly ?? null;
            const low = p.scorta < p.scortaMinima;
            const flash = flashRowId === p.id;
            return (
              <CardMobile
                id={`magazzino-row-${p.id}`}
                key={p.id}
                className={[
                  rowStockBg(p),
                  flash
                    ? "shadow-[inset_0_0_0_1px_rgba(251,146,60,0.45)] ring-2 ring-orange-400/35"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="line-clamp-2 text-lg font-semibold leading-snug tracking-tight text-[color:var(--cab-text)]">
                      {p.descrizione.trim() || "—"}
                    </p>
                    <p className="break-all font-mono text-sm font-medium tabular-nums tracking-wide text-[color:var(--cab-text)]">
                      {p.codiceFornitoreOriginale.trim() || "—"}
                    </p>
                    <p className="truncate text-[0.9375rem] font-medium leading-snug text-[color:var(--cab-text)]">
                      {p.marca.trim() || "—"}
                    </p>
                  </div>
                  <span
                    className={`mt-0.5 inline-flex min-h-11 min-w-[2.75rem] shrink-0 items-center justify-center rounded-full px-2 font-mono text-sm font-bold tabular-nums ring-2 ring-[var(--cab-card)] ${
                      low
                        ? "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100"
                        : "bg-[var(--cab-surface-2)] text-[color:var(--cab-text)]"
                    }`}
                    title={low ? "Sotto scorta minima" : "Giacenza"}
                  >
                    {p.scorta}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{compatLabel(p.compatibilitaMezzi)}</p>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div>
                    <dt className="text-zinc-500 dark:text-zinc-400">Categoria</dt>
                    <dd className="font-medium text-zinc-900 dark:text-zinc-100">{p.categoria}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500 dark:text-zinc-400">Scorta minima</dt>
                    <dd className="font-mono font-medium tabular-nums text-zinc-800 dark:text-zinc-200">{p.scortaMinima}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500 dark:text-zinc-400">P. vendita</dt>
                    <dd className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">{eur(p.prezzoVendita)}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500 dark:text-zinc-400">Consumo medio</dt>
                    <dd
                      className="font-medium tabular-nums text-zinc-700 dark:text-zinc-300"
                      title={consumoRow?.insufficientReason ?? (avgM != null ? "Da log magazzino (uscite Δ scorta)" : undefined)}
                    >
                      {avgM != null ? formatAvgMonthlyMagazzinoIt(avgM) : "dati insufficienti"}
                    </dd>
                  </div>
                </dl>
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-zinc-200/90 pt-3 dark:border-zinc-700/80">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Ultima modifica
                    </p>
                    <p className="truncate text-xs font-medium text-zinc-900 dark:text-zinc-100">
                      {formatDataUltimaMain(p.dataUltimaModifica)} · {p.autoreUltimaModifica}
                    </p>
                  </div>
                  <div className={`${dsTableActionsGroup} shrink-0`} role="group" aria-label="Azioni">
                  <button
                    type="button"
                    onClick={() => openInfo(p)}
                    className={dsTableActionBtnInfo}
                    title="Scheda informativa"
                    aria-label="Scheda informativa"
                  >
                    <IconInfoMagazzino />
                  </button>
                  <button
                    type="button"
                    onClick={() => undoLastScorta(p.id)}
                    disabled={!magCanCreateRicambio || !canUndoScortaById.get(p.id)}
                    className={dsTableActionBtnUndo}
                    title={!magCanCreateRicambio ? READONLY_PERMISSION_HINT : "Annulla l’ultima modifica di scorta (solo se registrata come singola operazione)"}
                    aria-label="Annulla ultima modifica scorta"
                  >
                    <IconUndoMagazzino />
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustScorta(p.id, -1)}
                    disabled={!magCanCreateRicambio}
                    className={dsTableActionBtnSecondary}
                    title={!magCanCreateRicambio ? READONLY_PERMISSION_HINT : "Diminuisci scorta"}
                    aria-label="Diminuisci scorta"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustScorta(p.id, 1)}
                    disabled={!magCanCreateRicambio}
                    className={dsTableActionBtnPrimary}
                    title={!magCanCreateRicambio ? READONLY_PERMISSION_HINT : "Aumenta scorta"}
                    aria-label="Aumenta scorta"
                  >
                    +
                  </button>
                  </div>
                </div>
              </CardMobile>
            );
          })}
        </div>
        {showPager ? (
          <TablePagination page={page} pageCount={pageCount} onPageChange={setPage} label={label} />
        ) : null}
      </ShellCard>
      </div>

      {newOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
              setNewRicambioDraftId(null);
              setNewOpen(false);
            }
          }}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-ricambio-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 id="new-ricambio-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Nuovo ricambio
              </h2>
              <CloseButton onClick={() => {
                setNewRicambioDraftId(null);
                setNewOpen(false);
              }} />
            </div>
            <form {...gestionaleFormFocusScopeProps()} onSubmit={submitNew} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
                <RicambioFormFields
                  form={newForm}
                  setForm={setNewForm}
                  relaxHtmlValidation
                  autoFocusToken={newRicambioFocusToken}
                  codiceOriginaleAvvisoDuplicato={
                    nuovoCodiceDupEsistente
                      ? {
                          existing: nuovoCodiceDupEsistente,
                          onVaiAlRicambio: () => focusRicambioInTable(nuovoCodiceDupEsistente.id),
                        }
                      : null
                  }
                  listFieldForceInvalid={newListFieldInvalid}
                />
                {newRicambioDraftId ? (
                  <RecordImageManager
                    scope="magazzino"
                    recordId={newRicambioDraftId}
                    title="Foto ricambio"
                    canEdit={magCanCreateRicambio}
                    onImageEvent={(ev) =>
                      logImageEvent(ev, ricambioFromFormLenient(newForm, newRicambioDraftId, authorName))
                    }
                  />
                ) : null}
              </div>
              <div className="shrink-0 space-y-2 border-t border-zinc-100 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <button
                  type="submit"
                  className={`${erpBtnAccent} w-full disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 disabled:grayscale`}
                  disabled={nuovoCodiceBloccaSalvataggio}
                  title={nuovoCodiceBloccaSalvataggio ? "Correggi il codice o apri il ricambio esistente" : undefined}
                >
                  Salva in magazzino
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {newIncompleteOpen ? (
        <div
          className={`fixed inset-0 ${dsZModalHigh} flex items-center justify-center bg-black/45 p-4`}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
              setNewIncompleteOpen(false);
            }
          }}
        >
          <div
            className="relative z-10 w-full max-w-md rounded-xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ricambio-incomplete-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2 id="ricambio-incomplete-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Attenzione: mancano alcune informazioni
            </h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-200">
              {newIncompleteList.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className={`${dsBtnGhost} w-full border border-zinc-200/90 bg-zinc-50/80 py-2.5 text-sm font-medium sm:w-auto dark:border-zinc-600 dark:bg-zinc-800/50`}
                onClick={() => {
                  setNewIncompleteOpen(false);
                }}
              >
                Torna a completare
              </button>
              <button
                type="button"
                className={erpBtnAccent}
                onClick={() => {
                  finalizeNewRicambio();
                }}
              >
                Conferma comunque
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {detail && detailRicambio ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
              closeDetail();
            }
          }}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-ricambio-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 id="detail-ricambio-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {detail.mode === "info" ? "Scheda ricambio" : "Modifica ricambio"}
              </h2>
              <CloseButton onClick={closeDetail} />
            </div>

            {detail.mode === "info" ? (
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4">
                <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
                  <p className="text-xs font-bold uppercase tracking-wide text-zinc-800 dark:text-zinc-100">
                    Dati principali ricambio
                  </p>
                  <InfoRow label="Marca" value={detailRicambio.marca} />
                  <InfoRow
                    label="Cod. OE"
                    value={<span className="font-mono text-[13px] font-semibold tracking-wide">{detailRicambio.codiceFornitoreOriginale}</span>}
                  />
                  <InfoRow label="Descrizione" value={detailRicambio.descrizione} />
                  <InfoRow label="Note" value={detailRicambio.note || "—"} />
                  <InfoRow label="Categoria" value={detailRicambio.categoria} />
                  <InfoRow label="Compatibilità" value={compatLabel(detailRicambio.compatibilitaMezzi)} />
                </div>
                <RecordImageManager
                  scope="magazzino"
                  recordId={detailRicambio.id}
                  title="Foto ricambio"
                  canEdit={magCanCreateRicambio}
                  onImageEvent={(ev) => logImageEvent(ev, detailRicambio)}
                />
                <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
                  <p className="text-xs font-bold uppercase tracking-wide text-zinc-800 dark:text-zinc-100">Altri dettagli</p>
                  <p className="mb-1 mt-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Giacenza</p>
                  <InfoRow label="Scorta" value={detailRicambio.scorta} />
                  <InfoRow label="Scorta minima" value={detailRicambio.scortaMinima} />
                  <p className="mb-1 mt-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Consumo (log magazzino)</p>
                  {(() => {
                    const cx = consumoMap.get(detailRicambio.id);
                    return (
                      <>
                        <InfoRow
                          label="Consumo medio mensile"
                          value={cx?.avgMonthly != null ? formatAvgMonthlyMagazzinoIt(cx.avgMonthly) : "dati insufficienti"}
                        />
                        <InfoRow label="Ultimo mese consumato" value={formatMonthKeyIt(cx?.lastExitMonthKey ?? null)} />
                        <InfoRow
                          label="Mesi osservati"
                          value={cx && cx.monthsObserved > 0 ? String(cx.monthsObserved) : "—"}
                        />
                        <InfoRow
                          label="Autonomia stimata"
                          value={
                            <span title="Scorta attuale ÷ consumo medio mensile">
                              {formatAutonomiaMesi(detailRicambio.scorta, cx?.avgMonthly ?? null)}
                            </span>
                          }
                        />
                      </>
                    );
                  })()}
                  <InfoRow label="Capitale immob." value={eur(capitaleImmobilizzato(detailRicambio))} />
                  <p className="mb-1 mt-3 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Audit</p>
                  <InfoRow
                    label="Ultima modifica"
                    value={new Date(detailRicambio.dataUltimaModifica).toLocaleString("it-IT", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  />
                  <InfoRow label="Autore" value={detailRicambio.autoreUltimaModifica} />
                </div>
                <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
                  <p className="text-xs font-bold uppercase tracking-wide text-zinc-800 dark:text-zinc-100">Fornitore alternativo</p>
                  <InfoRow label="Nome" value={detailRicambio.fornitoreNonOriginale || "—"} />
                  <InfoRow
                    label="Codice"
                    value={
                      detailRicambio.codiceFornitoreNonOriginale ? (
                        <span className="font-mono">{detailRicambio.codiceFornitoreNonOriginale}</span>
                      ) : (
                        "—"
                      )
                    }
                  />
                </div>
                <MagazzinoPrezziLineari
                  formatEur={eur}
                  listinoOE={detailRicambio.prezzoFornitoreOriginale}
                  scontoOE={detailRicambio.scontoFornitoreOriginale}
                  listinoAlt={detailRicambio.prezzoFornitoreNonOriginale}
                  scontoAlt={detailRicambio.scontoFornitoreNonOriginale}
                  markupPct={detailRicambio.markupPercentuale}
                  prezzoVendita={detailRicambio.prezzoVendita}
                />
                <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
                  <p className="text-xs font-bold uppercase tracking-wide text-zinc-800 dark:text-zinc-100">Storico modifiche</p>
                  <ul className={`${gestionaleLogScrollEmbeddedClass} mt-2 max-h-56 space-y-2 pr-0.5`}>
                    {infoTimeline.map((ev) => (
                      <li key={ev.id} className="list-none">
                        <GestionaleLogEntryFourLines
                          vm={buildMagazzinoGestionaleLogViewModel(ev)}
                          trailing={
                            <button
                              type="button"
                              className={logEntryDismissBtnClass}
                              aria-label="Rimuovi voce dal log"
                              title="Rimuovi voce dal log"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm("Rimuovere questa voce dal log?")) removeMagazzinoLogEntry(ev.id);
                              }}
                            >
                              ×
                            </button>
                          }
                        />
                      </li>
                    ))}
                  </ul>
                </div>
                <button type="button" onClick={startEditFromInfo} className={`${erpBtnAccent} w-full`} disabled={!magCanCreateRicambio} title={!magCanCreateRicambio ? READONLY_PERMISSION_HINT : undefined}>
                  Modifica
                </button>
              </div>
            ) : (
              <form {...gestionaleFormFocusScopeProps()} onSubmit={saveEdit} className="flex min-h-0 flex-1 flex-col">
                {editDraft ? (
                  <>
                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
                      <RicambioFormFields
                        form={editDraft}
                        setForm={setEditForm}
                        listFieldForceInvalid={editListFieldInvalid}
                      />
                      {detailRicambio ? (
                        <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
                          <p className="text-xs font-bold uppercase tracking-wide text-zinc-800 dark:text-zinc-100">
                            Consumo e autonomia (stima)
                          </p>
                          {(() => {
                            const cx = consumoMap.get(detailRicambio.id);
                            const scortaDraft = Math.max(0, Math.round(Number.parseInt(editDraft.scorta, 10) || 0));
                            return (
                              <>
                                <InfoRow
                                  label="Consumo medio mensile"
                                  value={cx?.avgMonthly != null ? formatAvgMonthlyMagazzinoIt(cx.avgMonthly) : "dati insufficienti"}
                                />
                                <InfoRow label="Ultimo mese consumato" value={formatMonthKeyIt(cx?.lastExitMonthKey ?? null)} />
                                <InfoRow
                                  label="Mesi osservati"
                                  value={cx && cx.monthsObserved > 0 ? String(cx.monthsObserved) : "—"}
                                />
                                <InfoRow
                                  label="Autonomia stimata"
                                  value={
                                    <span title="Scorta nel modulo ÷ consumo medio mensile">
                                      {formatAutonomiaMesi(scortaDraft, cx?.avgMonthly ?? null)}
                                    </span>
                                  }
                                />
                              </>
                            );
                          })()}
                        </div>
                      ) : null}
                    </div>
                    <div className="shrink-0 space-y-2 border-t border-zinc-100 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button type="submit" className={`${erpBtnAccent} flex-1`}>
                          Salva
                        </button>
                        <button type="button" onClick={cancelEditBackToInfo} className={`${dsBtnGhost} flex-1 border border-zinc-200/90 bg-zinc-50/90 py-2.5 text-sm font-medium sm:flex-initial dark:border-zinc-600 dark:bg-zinc-800/60`}>
                          Annulla
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={eliminaRicambio}
                        disabled={!magCanDeleteRicambio}
                        title={!magCanDeleteRicambio ? READONLY_PERMISSION_HINT : undefined}
                        className={`w-full rounded-lg border border-red-200 bg-red-50 py-2 text-sm font-medium text-red-800 shadow-sm hover:bg-red-100 hover:shadow-md hover:ring-1 hover:ring-red-200/60 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/55 ${erpFocus}`}
                      >
                        Elimina ricambio
                      </button>
                    </div>
                  </>
                ) : null}
              </form>
            )}
          </div>
        </div>
      ) : null}

      <Drawer
        open={logOpen}
        onClose={() => setLogOpen(false)}
        title="Log modifiche magazzino"
        ariaLabel="Log modifiche magazzino"
        lockScroll={false}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-3">
          <div className={`${gestionaleLogScrollEmbeddedClass} min-h-0 flex-1`}>
              {logEntries.length === 0 ? (
                <GestionaleLogEmpty message="Nessuna modifica registrata in questa sessione." />
              ) : (
                <GestionaleLogList>
                  {pagedMagLogEntries.map((entry) => (
                    <li key={entry.id} className="list-none">
                      <GestionaleLogEntryFourLines
                        vm={buildMagazzinoGestionaleLogViewModel(entry)}
                        onClick={() => focusRicambioInTable(entry.ricambioId)}
                        title="Mostra ricambio in tabella"
                        trailing={
                          <button
                            type="button"
                            className={logEntryDismissBtnClass}
                            aria-label="Rimuovi voce dal log"
                            title="Rimuovi voce dal log"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm("Rimuovere questa voce dal log?")) removeMagazzinoLogEntry(entry.id);
                            }}
                          >
                            ×
                          </button>
                        }
                      />
                    </li>
                  ))}
                </GestionaleLogList>
            )}
          </div>
          {showMagLogPager ? (
            <TablePagination page={magLogPage} pageCount={magLogPageCount} onPageChange={setMagLogPage} label={magLogPagerLabel} />
          ) : null}
        </div>
      </Drawer>

      {dupCheckModalOpen ? (
        <div
          className="fixed inset-0 z-[56] flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
              setDupCheckModalOpen(false);
            }
          }}
        >
          <div
            className="flex max-h-[min(92dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dup-magazzino-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
              <h2 id="dup-magazzino-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Codici duplicati in archivio
              </h2>
              <CloseButton onClick={() => setDupCheckModalOpen(false)} />
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
              {archivioDupCodeGroups.length === 0 ? (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Nessun codice duplicato rilevato.</p>
              ) : (
                <ul className="space-y-4">
                  {archivioDupCodeGroups.map((g: MagazzinoArchiveDuplicateCodeGroup) => (
                    <li
                      key={g.normalizedKey}
                      className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-700 dark:bg-zinc-800/30"
                    >
                      <p className="text-xs font-bold uppercase tracking-wide text-zinc-700 dark:text-zinc-200">
                        Codice <span className="font-mono normal-case">{g.labelCode}</span>
                      </p>
                      <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                        {g.items.length} ricambi con lo stesso codice normalizzato
                      </p>
                      <ul className="mt-2 space-y-2">
                        {g.items.map((p) => (
                          <li key={p.id}>
                            <ArchiveDupRicambioRow p={p} onOpen={(id) => focusRicambioInTable(id)} />
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
