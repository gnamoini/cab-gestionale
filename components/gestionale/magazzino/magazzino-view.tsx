"use client";

import "./magazzino-scroll.css";

import type { ReactElement, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUIAutonomyFixEngine } from "@/lib/ui-autonomy-fix/use-ui-autonomy-fix-engine";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CardMobile,
  CloseButton,
  IconActionButton,
  LoadingButton,
  LoadingFormSkeleton,
  LoadingMagazzinoListSkeleton,
  Tooltip,
} from "@/components/design-system";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { gestionaleModalBodyFlexClass } from "@/lib/ui/modal-max-width-class";
import { MagazzinoGiacenzaBell } from "@/components/gestionale/magazzino/magazzino-giacenza-bell";
import { MagazzinoScortaBadge } from "@/components/gestionale/magazzino/magazzino-scorta-badge";
import { gestionaleFormFocusScopeProps } from "@/components/gestionale/gestionale-form-focus-scope";
import { RicambioFormFields } from "@/components/gestionale/magazzino/ricambio-form-fields";
import { RicambioEditModal } from "@/components/gestionale/magazzino/ricambio-edit-modal";
import { probeRicambioInputLag } from "@/lib/debug/ricambio-input-lag-probe";
import { RicambioInfoPanel } from "@/components/gestionale/magazzino/ricambio-info-panel";
import {
  ricambioUiToMagazzinoInsert,
  ricambioUiToMagazzinoUpdate,
} from "@/lib/magazzino/magazzino-db-ui-adapter";
import { magazzinoService } from "@/src/services/magazzino.service";
import { useMagazzinoRicambiUIQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { useQueryClient } from "@tanstack/react-query";
import { QK, invalidateAfterMagazzinoOrMovimenti } from "@/src/lib/react-query/invalidate-related";
import { cabSyncEventForEntity } from "@/lib/sync/gestionale-sync-dispatch";
import { patchMagazzinoListCache, ricambioUiFromMagazzinoRow } from "@/lib/magazzino/magazzino-list-cache";
import { suppressSettingsRemoteNotify } from "@/lib/sistema/settings-remote-notify-guard";
import { flattenCompatDaAttrezzature, migrateMezziListePrefs } from "@/lib/mezzi/attrezzature-prefs";
import { createMezziListePrefsDefault } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import {
  loadMagazzinoChangeLog,
  purgeMagazzinoLogEntriesForRicambioId,
  saveMagazzinoChangeLog,
  type MagazzinoChangeLogEntry,
} from "@/lib/magazzino/magazzino-change-log-storage";
import {
  emptyRicambioForm,
  formatMarkupDisplay,
  ricambioFromFormLenient,
  validateRicambioListFields,
  type RicambioFormState,
} from "@/lib/magazzino/form";
import { scheduleCompatBackgroundAudit } from "@/lib/magazzino/compat/compat-runtime-sanitize";
import { readCompatDisplayForUi, readCompatLabelsForUi } from "@/lib/magazzino/compat/compat-read-guard";
import { latestUndoableScortaEntryForRicambio, parseScortaChange, entryMatchesMagazzinoUndoScope, type MagazzinoUndoScope } from "@/lib/magazzino/magazzino-scorta-undo";
import { useUndoSessionId } from "@/lib/gestionale-log/use-undo-session-id";
import {
  analyzeArchiveDuplicateCodes,
  findDuplicateByCodici,
  type MagazzinoArchiveDuplicateCodeGroup,
} from "@/lib/magazzino/duplicates";
import { ricambioHasFornitoreAlternativo } from "@/lib/magazzino/ricambio-fornitori-alternativi";
import { compareByColumn, compareNaturalOrder, type SortPhaseMagazzino } from "@/lib/magazzino/sort-order";
import {
  buildConsumoMapMagazzinoRolling36ForProducts,
  formatAvgMonthlyMagazzinoIt,
} from "@/lib/magazzino/ricambio-consumo-from-log";
import type { MagazzinoMasterPrefs } from "@/lib/magazzino/magazzino-master-prefs-storage";
import type { RicambioMagazzino, SortKeyMagazzino } from "@/lib/magazzino/types";
import {
  dsPageToolbarBtn,
  dsPageToolbarIconBtn,
  dsPageToolbarCtaCompact,
  dsStackPage,
  GESTIONALE_SEARCH_PLACEHOLDER,
  dsBtnNeutral,
  dsBtnDanger,
  dsBtnPrimary,
  dsBtnSoftOrange,
  dsFocus,
  dsModalFormFooter,
  dsTableActionBtnPrimary,
  dsTableActionBtnSecondary,
  dsTableActionBtnUndo,
  dsTableActionBtnInfo,
  dsTableActionGlyph,
} from "@/lib/ui/design-system";
import {
  GestionaleListTable,
  GestionaleListTableActionsHead,
  GlobalTableSortTh,
} from "@/components/gestionale/global-table";
import {
  gestionaleListTableRowClass,
  gestionaleListTableRowSurfaceClass,
  gestionaleListTableRowTone,
  gestionaleListTableTd,
  gestionaleListTableTdAzioni,
  gestionaleListTableTdCenter,
  gestionaleListTableActionsGroupEnd,
} from "@/lib/ui/gestionale-list-table";
import { MagazzinoDescrizioneSortTh } from "@/components/gestionale/magazzino/magazzino-descrizione-sort-th";
import { PageHeader } from "@/components/gestionale/page-header";
import { GestionalePageToolbarActions } from "@/components/gestionale/page-header-toolbar";
import { ShellCard } from "@/components/gestionale/shell-card";
import { TablePagination } from "@/components/gestionale/table-pagination";
import {
  Drawer,
  PageToolbar,
  PageToolbarCtaLabel,
  PageToolbarResultCount,
} from "@/components/design-system";
import { GestionaleListSearchField } from "@/components/gestionale/gestionale-list-search-field";
import { MagazzinoAdvancedFilterPanel } from "@/components/gestionale/magazzino/magazzino-advanced-filter-panel";
import { RecordImageManager, type RecordImageLogEvent } from "@/components/gestionale/media/record-image-manager";
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
  GestionaleLogEmpty,
  GestionaleLogEntryFourLines,
  GestionaleLogEntryDismissButton,
  GestionaleLogList,
  gestionaleLogScrollEmbeddedClass,
} from "@/components/gestionale/gestionale-log-ui";
import {
  buildMagazzinoLocalLogEntry,
  buildMagazzinoScortaPersistedLogEntry,
} from "@/lib/magazzino/magazzino-log-events";
import {
  applyScortaOptimisticDelta,
  awaitScortaSyncDrain,
  enqueueScortaSync,
} from "@/lib/magazzino/scorta-adjust-sync";
import { revealRicambioInTableAfterSave } from "@/lib/magazzino/magazzino-table-focus";
import { GestionaleSectionGate } from "@/components/gestionale/gestionale-section-gate";
import { layoutPageRoot } from "@/lib/ui/responsive-layout-core";
import type { TooltipSide } from "@/lib/ui/tooltip-portal";
import { SettingsEliminaConfirmDialog } from "@/components/dashboard/settings-elimina-confirm-dialog";
import { useGestionaleConfirm } from "@/src/hooks/use-gestionale-confirm";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { useMagazzinoLogFeed } from "@/lib/magazzino/use-magazzino-log-feed";
import { formatCompatMezziArrayForLog } from "@/lib/gestionale-log/log-summary";
import { useAuth } from "@/context/auth-context";
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import { useResponsiveListPageSize } from "@/lib/ui/use-responsive-list-page-size";
import { CAB_SETTINGS_KEY, CAB_SETTINGS_MODULE } from "@/src/lib/app-settings/keys";
import { useCabAppSettingsPayloadQuery, useSettingsUpsertMutation } from "@/src/hooks/gestionale/use-settings-queries";
import { usePermissions } from "@/src/hooks/use-permissions";
import { READONLY_PERMISSION_HINT } from "@/src/lib/auth/permissions";
import { Q_FOCUS_RICAMBIO } from "@/lib/navigation/dashboard-log-links";
import { useAdminNotificationStore } from "@/src/hooks/gestionale/use-admin-notification-store";

function eur(n: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
}

function initialMasterFromProducts(rows: RicambioMagazzino[], mezziListePrefs?: import("@/lib/mezzi/mezzi-liste-prefs-storage").MezziListePrefs) {
  const marche = new Set<string>();
  const categorie = new Set<string>();
  const mezzi = new Set<string>();
  for (const r of rows) {
    marche.add(r.marca);
    categorie.add(r.categoria);
    readCompatLabelsForUi(r, mezziListePrefs, "magazzino-view.initialMasterFromProducts").forEach((m) => mezzi.add(m));
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
    for (const alt of r.fornitoriAlternativi ?? []) {
      const f = alt.fornitore.trim();
      if (f) s.add(f);
    }
  }
  return [...s].sort((a, b) => a.localeCompare(b, "it"));
}

function formatFornitoreAlternativoDisplay(p: RicambioMagazzino): string {
  const alts = p.fornitoriAlternativi ?? [];
  const firstName = alts[0]?.fornitore.trim() || p.fornitoreNonOriginale.trim();
  if (!firstName) return "—";
  if (alts.length <= 1) return firstName;
  return `${firstName} (+${alts.length - 1})`;
}

function mergeMasterWithRows(master: string[], rowValues: string[]) {
  const s = new Set([...master, ...rowValues]);
  return [...s].sort((a, b) => a.localeCompare(b, "it"));
}

function rowUsesCompatLabel(
  row: RicambioMagazzino,
  label: string,
  liste: ReturnType<typeof migrateMezziListePrefs>,
): boolean {
  const resolved = readCompatLabelsForUi(row, liste, "magazzino-view.rowUsesCompatLabel");
  const want = label.trim().toLowerCase();
  return resolved.some((l) => l.trim().toLowerCase() === want);
}

function rowStockBg(r: RicambioMagazzino) {
  if (r.scorta < r.scortaMinima) {
    return "bg-red-50/50 dark:bg-red-950/20";
  }
  return "";
}

function rowStockBorderFirstTd(r: RicambioMagazzino) {
  // Evita artefatti sul bordo sinistro della tabella (border-collapsing).
  // Lo stato sotto scorta resta già evidenziato da badge/riga.
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

/** Card mobile magazzino: data (gg/mm/aa) e autore su due righe. */
function formatMagazzinoUltimaModificaMobileDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function formatMagazzinoUltimaModificaMobileAutore(autore: string): string {
  return autore.trim() || "—";
}

function isModificaOlderThanMonths(iso: string, months: number) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  const limit = new Date();
  limit.setMonth(limit.getMonth() - months);
  return t < limit.getTime();
}

const MAGAZZINO_STALE_MODIFICA_MONTHS = 6;
const MAGAZZINO_STALE_MODIFICA_HINT = "Ultima modifica oltre 6 mesi fa";

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
  marcaOriginaleSecondaria: "Marca secondaria",
  usatoInTagliandi: "Tagliando",
  fornitoreNonOriginale: "Fornitore alternativo",
  codiceFornitoreNonOriginale: "Codice alternativo",
  prezzoFornitoreNonOriginale: "Prezzo alternativo",
  scontoFornitoreNonOriginale: "Sconto alt. %",
};

function fmtFornitoriAlternativiDiff(rows: RicambioMagazzino["fornitoriAlternativi"]): string {
  if (!rows?.length) return "—";
  return rows
    .map(
      (r) =>
        `${r.fornitore}|${r.produttore}|${r.codice}|${r.prezzo}|${r.sconto}`,
    )
    .join("; ");
}

const DIFF_KEYS: (keyof RicambioMagazzino)[] = [
  "marca",
  "codiceFornitoreOriginale",
  "codiceFornitoreOriginaleSecondario",
  "marcaOriginaleSecondaria",
  "usatoInTagliandi",
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
  if (k === "fornitoriAlternativi") return fmtFornitoriAlternativiDiff(r.fornitoriAlternativi);
  const v = r[k];
  if (k === "usatoInTagliandi") return r.usatoInTagliandi ? "Sì" : "No";
  if (k === "compatibilitaMezzi") return formatCompatMezziArrayForLog(v);
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
  const bAlt = fmtFornitoriAlternativiDiff(before.fornitoriAlternativi);
  const aAlt = fmtFornitoriAlternativiDiff(after.fornitoriAlternativi);
  if (bAlt !== aAlt) {
    out.push({ campo: "Fornitori alternativi", prima: bAlt, dopo: aAlt });
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

function magazzinoConsumoMedioTooltip(
  consumoRow: { insufficientReason?: string | null } | undefined,
  avgM: number | null,
): string | undefined {
  return consumoRow?.insufficientReason ?? (avgM != null ? "Da log magazzino (uscite Δ scorta)" : undefined);
}

function MagazzinoOptionalTooltip({
  content,
  children,
  side = "top",
}: {
  content?: string;
  children: ReactElement;
  side?: TooltipSide;
}) {
  if (!content?.trim()) return children;
  return (
    <Tooltip content={content} side={side}>
      {children}
    </Tooltip>
  );
}

function MagazzinoDisabledButtonTooltip({
  content,
  disabled,
  children,
}: {
  content: string;
  disabled?: boolean;
  children: ReactElement;
}) {
  return (
    <Tooltip content={content}>
      {disabled ? <span className="inline-flex w-full min-w-0">{children}</span> : children}
    </Tooltip>
  );
}

function RicambioCodiceCell({ p }: { p: RicambioMagazzino }) {
  const secondary = p.codiceFornitoreOriginaleSecondario.trim();
  return (
    <div className="space-y-0.5">
      <span className="inline-block max-w-full break-all rounded-md bg-zinc-100 px-2 py-1 font-mono text-xs font-semibold leading-snug tracking-wide dark:bg-zinc-800">
        {p.codiceFornitoreOriginale}
      </span>
      {secondary ? (
        <div className="break-all pl-0.5 font-mono text-[11px] font-medium leading-snug tracking-wide text-zinc-500 dark:text-zinc-400">
          {secondary}
        </div>
      ) : null}
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
      className="w-full rounded-lg border border-zinc-200/90 bg-white px-2.5 py-2 text-left text-xs transition-colors hover:border-[color:color-mix(in_srgb,var(--cab-primary)_35%,var(--cab-border))] hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))] dark:border-zinc-700 dark:bg-zinc-900/50"
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
  const { clearMagazzinoNotifications } = useAdminNotificationStore();
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
  const magazzinoListQ = useMagazzinoRicambiUIQuery();
  const prodotti = magazzinoListQ.data ?? [];
  const magazzinoInitialLoading = magazzinoListQ.isLoading && magazzinoListQ.data === undefined;
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
  const [nascondiScortaZero, setNascondiScortaZero] = useState(false);
  const [filtriEspansi, setFiltriEspansi] = useState(false);
  const [toolbarOverflowOpen, setToolbarOverflowOpen] = useState(false);

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
  const [newRicambioDraftId, setNewRicambioDraftId] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const { success: toastSuccess, error: toastError, validation: toastValidation, successDeleted, errorOnce } =
    useGestionaleToast();
  const { confirm, confirmDialog } = useGestionaleConfirm();
  const [eliminaRicambioTarget, setEliminaRicambioTarget] = useState<RicambioMagazzino | null>(null);
  const [newForm, setNewForm] = useState<RicambioFormState>(emptyRicambioForm());
  const [dupCheckModalOpen, setDupCheckModalOpen] = useState(false);

  const [detail, setDetail] = useState<{ id: string; mode: "info" | "edit" } | null>(null);
  useUIAutonomyFixEngine("/magazzino", [newOpen, detail, dupCheckModalOpen]);
  const [newListFieldInvalid, setNewListFieldInvalid] = useState(false);
  const magViewRenderRef = useRef(0);

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
    feed: magLogFeed,
    timelineByRicambio: magLogTimelineByRicambio,
    isLoading: magLogFeedLoading,
    isLocalId: isMagLogLocalId,
  } = useMagazzinoLogFeed({
    localEntries: logEntries,
    prodotti,
    authorName,
    userId: user?.id ?? null,
  });

  const {
    page: magLogDrawerPage,
    setPage: setMagLogDrawerPage,
    pageCount: magLogDrawerPageCount,
    sliceItems: sliceMagLogFeed,
    showPager: showMagLogDrawerPager,
    label: magLogDrawerPagerLabel,
    resetPage: resetMagLogDrawerPage,
  } = useClientPagination(magLogFeed.length, listPageSize);

  useEffect(() => {
    resetMagLogDrawerPage();
  }, [logOpen, magLogFeed.length, listPageSize, resetMagLogDrawerPage]);

  const pagedMagLogFeed = useMemo(
    () => sliceMagLogFeed(magLogFeed),
    [magLogFeed, sliceMagLogFeed, magLogDrawerPage],
  );

  useEffect(() => {
    const mapped = magazzinoListQ.data ?? [];
    const order = new Map<string, number>();
    mapped.forEach((r, i) => order.set(r.id, i));
    orderMapRef.current = order;
    nextOrderRef.current = mapped.length;
  }, [magazzinoListQ.data]);

  function mergeIntoPending(map: Map<string, { prima: string; dopo: string }>, ch: CampoChange) {
    const ex = map.get(ch.campo);
    if (ex) map.set(ch.campo, { prima: ex.prima, dopo: ch.dopo });
    else map.set(ch.campo, { prima: ch.prima, dopo: ch.dopo });
  }

  function applyLogEntry(entry: MagazzinoLogEntry) {
    setLogEntries((prev) => [entry, ...prev].slice(0, 100));
  }

  function removeMagazzinoLogEntry(id: string) {
    if (!isMagLogLocalId(id)) return;
    setLogEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function markMagazzinoLogEntryAnnullato(id: string) {
    setLogEntries((prev) => prev.map((e) => (e.id === id ? { ...e, annullato: true } : e)));
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
    const entry = buildMagazzinoLocalLogEntry({
      id: `log-${Date.now()}-${++logSeqRef.current}`,
      tipo: "update",
      ricambioId: p.ricambioId,
      ricambioLabel: p.ricambioLabel,
      autore: p.autore,
      changes,
      ...magazzinoLogScopeFields(),
    });
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
    const entry = buildMagazzinoLocalLogEntry({
      id: `log-${Date.now()}-${++logSeqRef.current}`,
      tipo,
      ricambioId,
      ricambioLabel,
      autore,
      changes,
      ...magazzinoLogScopeFields(),
    });
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
      setNewRicambioDraftId((currentDraftId) => {
        if (currentDraftId) {
          purgeMagazzinoLogEntriesForRicambioId(currentDraftId);
          setLogEntries(loadMagazzinoChangeLog());
        }
        return null;
      });
      setNewForm(emptyRicambioForm());
      setNewListFieldInvalid(false);
      setNewOpen(false);
      setDetail(null);
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
    if (!globalPerm.isAdmin) return;
    clearMagazzinoNotifications();
  }, [globalPerm.isAdmin, clearMagazzinoNotifications]);

  useEffect(() => {
    return () => {
      if (flashClearRef.current) clearTimeout(flashClearRef.current);
      const pend = pendingLogRef.current;
      if (pend?.timer) clearTimeout(pend.timer);
      pendingLogRef.current = null;
    };
  }, []);

  const patchProdotti = useCallback(
    (updater: (prev: RicambioMagazzino[]) => RicambioMagazzino[]) => {
      patchMagazzinoListCache(queryClient, updater, authorName, mezziListePrefs);
    },
    [queryClient, authorName, mezziListePrefs],
  );

  useEffect(() => {
    const raw = { mag: appSettings?.magazzinoMaster, liste: appSettings?.mezziListe };
    const sig = JSON.stringify(raw);
    if (sig === lastMergedSigRef.current) return;
    lastMergedSigRef.current = sig;

    const src = prodotti;
    const fromP = initialMasterFromProducts(src, mezziListePrefs);
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
  }, [appSettings, prodotti, mezziListePrefs]);

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
      const serverVal = (masterRow?.value ?? {}) as MagazzinoMasterPrefs;
      const serverSig = JSON.stringify({
        marche: serverVal.marche ?? [],
        categorie: serverVal.categorie ?? [],
        mezziCompatibili: serverVal.mezziCompatibili ?? [],
        fornitori: serverVal.fornitori ?? [],
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
            ...serverVal,
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

  const marche = useMemo(
    () => mergeMasterWithRows(masterMarche, prodotti.map((p) => p.marca)),
    [masterMarche, prodotti],
  );

  const categorie = useMemo(
    () => mergeMasterWithRows(masterCategorie, prodotti.map((p) => p.categoria)),
    [masterCategorie, prodotti],
  );

  const fornitori = useMemo(
    () =>
      mergeMasterWithRows(
        masterFornitori,
        prodotti.flatMap((p) => {
          const names: string[] = [];
          const first = p.fornitoreNonOriginale.trim();
          if (first) names.push(first);
          for (const alt of p.fornitoriAlternativi ?? []) {
            const f = alt.fornitore.trim();
            if (f) names.push(f);
          }
          return names;
        }),
      ),
    [masterFornitori, prodotti],
  );

  const mezzi = useMemo(() => {
    const fromRows: string[] = [];
    prodotti.forEach((p) =>
      readCompatLabelsForUi(p, mezziListePrefs, "magazzino-view.masterMezzi").forEach((m) => fromRows.push(m)),
    );
    return mergeMasterWithRows(masterMezzi, fromRows);
  }, [masterMezzi, prodotti, mezziListePrefs]);

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
    return findDuplicateByCodici(prodotti, newForm.codiceFornitoreOriginale, {
      alsoCheckSecondary: newForm.codiceFornitoreOriginaleSecondario,
    });
  }, [newOpen, prodotti, newForm.codiceFornitoreOriginale, newForm.codiceFornitoreOriginaleSecondario]);

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
    () => buildMagazzinoFilterCatalog(prodotti, mezziListePrefs, categorie, masterFornitori),
    [prodotti, mezziListePrefs, categorie, masterFornitori],
  );

  const pageFilters = useMemo(
    (): MagazzinoPageFilters => ({
      search: searchApplied,
      soloSottoScorta,
      nascondiScortaZero,
      ...advancedFilters,
    }),
    [searchApplied, soloSottoScorta, nascondiScortaZero, advancedFilters],
  );

  const compatDisplayFor = useCallback(
    (row: RicambioMagazzino) => readCompatDisplayForUi(row, mezziListePrefs, "magazzino-view.compatDisplayFor"),
    [mezziListePrefs],
  );

  useEffect(() => {
    if (prodotti.length === 0) return;
    scheduleCompatBackgroundAudit(prodotti, mezziListePrefs, "magazzino-view.load");
  }, [prodotti, mezziListePrefs]);

  const searchSuggestionPool = useMemo(
    () => buildMagazzinoSearchSuggestions(prodotti, searchInput, 8, mezziListePrefs),
    [prodotti, searchInput, mezziListePrefs],
  );

  const filteredSorted = useMemo(() => {
    const orderMap = orderMapRef.current!;
    let rows = prodotti.filter((p) => magazzinoRowMatchesPageFilters(p, pageFilters, mezziListePrefs));

    rows = [...rows].sort((a, b) => {
      if (sortPhase === "natural" || sortColumn === null) {
        return compareNaturalOrder(a, b, orderMap);
      }
      const primary = compareByColumn(a, b, sortColumn, sortPhase, consumoAvgById, mezziListePrefs);
      if (primary !== 0) return primary;
      return compareNaturalOrder(a, b, orderMap);
    });

    return rows;
  }, [prodotti, pageFilters, sortColumn, sortPhase, consumoAvgById, mezziListePrefs]);

  filteredSortedRef.current = filteredSorted;

  const { page, setPage, pageCount, sliceItems, showPager, label, resetPage } = useClientPagination(filteredSorted.length, listPageSize);

  useEffect(() => {
    setMagazzinoPageRef.current = setPage;
  }, [setPage]);

  useEffect(() => {
    resetPage();
  }, [searchApplied, advancedFilters, soloSottoScorta, nascondiScortaZero, sortColumn, sortPhase, listPageSize, resetPage]);

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
    const applied = applyScortaOptimisticDelta(queryClient, id, delta, authorName, touch, mezziListePrefs);
    if (!applied.found) return;
    flashRow(id);
    enqueueScortaSync(queryClient, id, authorName, {
      onPersisted: ({ ricambioId, label, prima, dopo }) => {
        const entry = buildMagazzinoScortaPersistedLogEntry({
          id: `log-${Date.now()}-${++logSeqRef.current}`,
          ricambioId,
          ricambioLabel: label,
          autore: authorName,
          prima,
          dopo,
          ...magazzinoLogScopeFields(),
        });
        applyLogEntry(entry);
      },
      onError: ({ error }) => {
        toastError(error);
      },
      invalidate: () => {
        void invalidateAfterMagazzinoOrMovimenti(queryClient, [
          cabSyncEventForEntity("magazzino_ricambi", id, "entity_updated", "magazzino_ricambi"),
        ]);
      },
    }, mezziListePrefs);
  }

  async function undoLastScorta(id: string) {
    if (!magCanCreateRicambio) return;
    await awaitScortaSyncDrain(id);
    flushPendingLog();
    const entry = latestUndoableScortaEntryForRicambio(logEntries, id, magUndoScope);
    if (!entry) {
      toastValidation("Nessuna modifica di scorta annullabile per questo ricambio.");
      return;
    }
    const parsed = parseScortaChange(entry);
    if (!parsed) return;
    const row = prodotti.find((p) => p.id === id);
    if (!row || row.scorta !== parsed.dopo) {
      toastValidation("La scorta non corrisponde più all’ultima registrazione: annullamento non disponibile.");
      return;
    }
    const touched = touch({ ...row, scorta: parsed.prima });
    const updated = await magazzinoService.update(id, ricambioUiToMagazzinoUpdate(touched, mezziListePrefs));
    if (!updated.success || !updated.data) {
      toastError(updated.error ?? "Annullamento scorta non riuscito.");
      return;
    }
    const ui = ricambioUiFromMagazzinoRow(updated.data, authorName, mezziListePrefs);
    patchProdotti((prev) => prev.map((p) => (p.id === id ? touch(ui) : p)));
    markMagazzinoLogEntryAnnullato(entry.id);
    flashRow(id);
    void invalidateAfterMagazzinoOrMovimenti(queryClient, [
      cabSyncEventForEntity("magazzino_ricambi", id, "entity_updated", "magazzino_ricambi"),
    ]);
  }

  async function undoUltimoMagazzino() {
    if (!magCanCreateRicambio) return;
    flushPendingLog();
    const entry = undoableMagazzinoLog;
    if (!entry) return;
    const row = prodotti.find((p) => p.id === entry.ricambioId);
    if (!row) {
      toastValidation("Ricambio non trovato: undo non disponibile.");
      return;
    }
    const okUndo = await confirm({
      title: "Annullare l'ultima modifica?",
      message: "Verrà ripristinato l'ultimo cambiamento reversibile sul magazzino.",
      confirmLabel: "Annulla modifica",
      destructive: true,
    });
    if (!okUndo) return;
    const next: RicambioMagazzino = { ...row };
    for (const ch of entry.changes) {
      const key = CAMPO_KEY_BY_LABEL.get(ch.campo);
      if (!key) continue;
      (next as unknown as Record<string, unknown>)[key] = parseUndoValue(key, ch.prima, row);
    }
    const touched = touch(next);
    const updated = await magazzinoService.update(entry.ricambioId, ricambioUiToMagazzinoUpdate(touched, mezziListePrefs));
    if (!updated.success || !updated.data) {
      toastError(updated.error ?? "Undo non riuscito.");
      return;
    }
    const ui = ricambioUiFromMagazzinoRow(updated.data, authorName, mezziListePrefs);
    patchProdotti((prev) => prev.map((p) => (p.id === entry.ricambioId ? touch(ui) : p)));
    markMagazzinoLogEntryAnnullato(entry.id);
    flashRow(entry.ricambioId);
    void invalidateAfterMagazzinoOrMovimenti(queryClient, [
      cabSyncEventForEntity("magazzino_ricambi", entry.ricambioId, "entity_updated", "magazzino_ricambi"),
    ]);
  }

  function openNewModal() {
    if (!magCanCreateRicambio) return;
    flushPendingLog();
    setDupCheckModalOpen(false);
    setNewListFieldInvalid(false);
    setNewForm(emptyRicambioForm());
    setNewRicambioDraftId(crypto.randomUUID());
    setNewOpen(true);
  }

  function closeNewRicambioModal() {
    const draftId = newRicambioDraftId;
    if (draftId) {
      purgeMagazzinoLogEntriesForRicambioId(draftId);
      setLogEntries(loadMagazzinoChangeLog());
    }
    setNewRicambioDraftId(null);
    setNewForm(emptyRicambioForm());
    setNewListFieldInvalid(false);
    setNewOpen(false);
  }

  function completeMagazzinoSave(
    ricambioId: string,
    toastMessage: string,
    syncType: "entity_created" | "entity_updated" = "entity_updated",
  ) {
    const inView = revealRicambioInTableAfterSave({
      ricambioId,
      filteredSortedRef,
      listPageSizeRef,
      setMagazzinoPage: (p) => setMagazzinoPageRef.current(p),
      flashRow,
      closeOverlays: () => {
        setNewOpen(false);
        setDetail(null);
      },
    });
    toastSuccess(inView ? toastMessage : `${toastMessage} (fuori dai filtri attivi)`);
    void invalidateAfterMagazzinoOrMovimenti(queryClient, [
      cabSyncEventForEntity("magazzino_ricambi", ricambioId, syncType, "magazzino_ricambi"),
    ]);
  }

  async function finalizeNewRicambio() {
    if (saveBusy) return;
    const listErr = validateRicambioListFields(newForm, {
      marche,
      categorie,
      mezziListe: mezziListePrefs,
    });
    if (listErr) {
      setNewListFieldInvalid(true);
      toastError(listErr);
      return;
    }
    setNewListFieldInvalid(false);
    setSaveBusy(true);
    try {
      const r = ricambioFromFormLenient(newForm, newRicambioDraftId ?? undefined, authorName, {
        mezziListe: mezziListePrefs,
      });
      const created = await magazzinoService.create(ricambioUiToMagazzinoInsert(r, mezziListePrefs));
      if (!created.success || !created.data) {
        toastError(created.error ?? "Creazione ricambio non riuscita.");
        return;
      }
      const ui = ricambioUiFromMagazzinoRow(created.data, authorName, mezziListePrefs);
      registerOrderIndex(ui.id);
      patchProdotti((prev) => [ui, ...prev]);
      setNewForm(emptyRicambioForm());
      setNewRicambioDraftId(null);
      completeMagazzinoSave(ui.id, "Ricambio creato in magazzino.", "entity_created");
    } finally {
      setSaveBusy(false);
    }
  }

  function submitNew(e: React.FormEvent) {
    e.preventDefault();
    void finalizeNewRicambio();
  }

  const detailRicambio = detail ? prodotti.find((p) => p.id === detail.id) : undefined;

  function openInfo(p: RicambioMagazzino) {
    setDetail({ id: p.id, mode: "info" });
  }

  function startEditFromInfo() {
    if (!magCanCreateRicambio) return;
    if (!detailRicambio) return;
    setDetail({ id: detailRicambio.id, mode: "edit" });
  }

  function cancelEditBackToInfo() {
    if (!detail) return;
    setDetail({ id: detail.id, mode: "info" });
  }

  function requestEliminaRicambio() {
    if (!detailRicambio || !magCanDeleteRicambio) return;
    setEliminaRicambioTarget(detailRicambio);
  }

  async function executeEliminaRicambio() {
    if (!eliminaRicambioTarget) return;
    const id = eliminaRicambioTarget.id;
    const removed = await magazzinoService.remove(id);
    if (!removed.success) {
      toastError(removed.error ?? "Eliminazione non riuscita.", { module: "magazzino", action: "delete" });
      return;
    }
    patchProdotti((prev) => prev.filter((p) => p.id !== id));
    setDetail((d) => (d?.id === id ? null : d));
    setEliminaRicambioTarget(null);
    successDeleted();
    void invalidateAfterMagazzinoOrMovimenti(queryClient, [
      cabSyncEventForEntity("magazzino_ricambi", id, "entity_deleted", "magazzino_ricambi"),
    ]);
  }

  function closeDetail() {
    setDetail(null);
  }

  magViewRenderRef.current += 1;
  if (detail?.mode === "edit") {
    // #region agent log
    probeRicambioInputLag("magazzino-view.tsx:render-edit-mode", "E", {
      magViewRenderCount: magViewRenderRef.current,
    });
    // #endregion
  }

  const infoTimeline = useMemo(() => {
    if (!detailRicambio) return [];
    return magLogTimelineByRicambio[detailRicambio.id] ?? [];
  }, [detailRicambio, magLogTimelineByRicambio]);

  function addMasterMarca() {
    const t = nuovaMarca.trim();
    if (!t) return;
    setMasterMarche((prev) => [...new Set([...prev, t])].sort((a, b) => a.localeCompare(b, "it")));
    setNuovaMarca("");
  }
  async function removeMasterMarca(m: string) {
    const n = prodotti.filter((p) => p.marca === m).length;
    if (n > 0) {
      const ok = await confirm({
        title: "Rimuovere marca?",
        message: `Marca usata da ${n} ricambi. Rimuoverla dall'anagrafica?`,
        destructive: true,
        confirmLabel: "Rimuovi",
      });
      if (!ok) return;
    }
    setMasterMarche((prev) => prev.filter((x) => x !== m));
  }
  function addMasterCategoria() {
    const t = nuovaCategoria.trim();
    if (!t) return;
    setMasterCategorie((prev) => [...new Set([...prev, t])].sort((a, b) => a.localeCompare(b, "it")));
    setNuovaCategoria("");
  }
  async function removeMasterCategoria(c: string) {
    const n = prodotti.filter((p) => p.categoria === c).length;
    if (n > 0) {
      const ok = await confirm({
        title: "Rimuovere categoria?",
        message: `Categoria usata da ${n} ricambi. Rimuoverla dall'anagrafica?`,
        destructive: true,
        confirmLabel: "Rimuovi",
      });
      if (!ok) return;
    }
    setMasterCategorie((prev) => prev.filter((x) => x !== c));
  }
  async function removeMasterMezzo(m: string) {
    const n = prodotti.reduce((acc, p) => acc + (rowUsesCompatLabel(p, m, mezziListePrefs) ? 1 : 0), 0);
    if (n > 0) {
      const ok = await confirm({
        title: "Rimuovere mezzo?",
        message: `Mezzo indicato su ${n} ricambi. Rimuoverlo dall'anagrafica?`,
        destructive: true,
        confirmLabel: "Rimuovi",
      });
      if (!ok) return;
    }
    setMasterMezzi((prev) => prev.filter((x) => x !== m));
  }
  function addMasterFornitore() {
    const t = nuovoFornitore.trim();
    if (!t) return;
    setMasterFornitori((prev) => [...new Set([...prev, t])].sort((a, b) => a.localeCompare(b, "it")));
    setNuovoFornitore("");
  }
  async function removeMasterFornitore(f: string) {
    const n = prodotti.filter((p) => ricambioHasFornitoreAlternativo(p, f)).length;
    if (n > 0) {
      const ok = await confirm({
        title: "Rimuovere fornitore?",
        message: `Fornitore indicato su ${n} ricambi. Rimuoverlo dall'anagrafica?`,
        destructive: true,
        confirmLabel: "Rimuovi",
      });
      if (!ok) return;
    }
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
    setNascondiScortaZero(false);
    resetMagazzinoRicerca();
    setFiltriEspansi(false);
  }

  const hasAdvancedPanelFilters = magazzinoAdvancedFiltersActive(advancedFilters);

  const hasMagazzinoFilters =
    searchApplied.trim().length > 0 || hasAdvancedPanelFilters || soloSottoScorta || nascondiScortaZero;

  return (
    <GestionaleSectionGate module="magazzino">
    <div className={`magazzino-scroll-scope ${layoutPageRoot}`}>
      <PageHeader
        title="Magazzino ricambi"
        actions={
          <GestionalePageToolbarActions
            className="max-sm:flex-nowrap max-sm:gap-1"
            leading={
              <MagazzinoGiacenzaBell
                count={sottoScortaTotale}
                items={sottoScortaList}
                onSelectRicambio={(id) => focusRicambioInTable(id, { applySottoScorta: true })}
                triggerClassName={dsPageToolbarIconBtn}
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
              <MagazzinoDisabledButtonTooltip
                content={magCanCreateRicambio ? "Aggiungi un ricambio" : "Sola lettura"}
                disabled={!magCanCreateRicambio}
              >
                <button
                  type="button"
                  onClick={openNewModal}
                  disabled={!magCanCreateRicambio}
                  className={`${dsPageToolbarCtaCompact} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <PageToolbarCtaLabel short="+ Nuovo" full="+ Nuovo ricambio" />
                </button>
              </MagazzinoDisabledButtonTooltip>
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
            filtersActive={hasAdvancedPanelFilters || soloSottoScorta || nascondiScortaZero}
            filtersPanel={
              <MagazzinoAdvancedFilterPanel
                filters={advancedFilters}
                onChange={patchAdvancedFilters}
                catalog={filterCatalog}
              />
            }
            onFilterReset={resetMagazzinoFilters}
            overflowOpen={toolbarOverflowOpen}
            onOverflowToggle={() => setToolbarOverflowOpen((o) => !o)}
            overflowActions={
              <>
                <button
                  type="button"
                  aria-pressed={soloSottoScorta}
                  onClick={() => setSoloSottoScorta((v) => !v)}
                  className={
                    soloSottoScorta
                      ? `${dsPageToolbarBtn} w-full justify-center sm:w-auto border-[color:color-mix(in_srgb,var(--cab-primary)_45%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))] text-[color:color-mix(in_srgb,var(--cab-primary)_88%,var(--cab-text))] ring-1 ring-[color:color-mix(in_srgb,var(--cab-primary)_28%,transparent)]`
                      : `${dsPageToolbarBtn} w-full justify-center sm:w-auto`
                  }
                >
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      soloSottoScorta
                        ? "bg-[color:var(--cab-primary)]"
                        : "bg-[color:color-mix(in_srgb,var(--cab-text-muted)_55%,transparent)]"
                    }`}
                    aria-hidden
                  />
                  Sotto scorta minima
                </button>
                <button
                  type="button"
                  aria-pressed={nascondiScortaZero}
                  onClick={() => setNascondiScortaZero((v) => !v)}
                  className={
                    nascondiScortaZero
                      ? `${dsPageToolbarBtn} w-full justify-center sm:w-auto border-[color:color-mix(in_srgb,var(--cab-primary)_45%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))] text-[color:color-mix(in_srgb,var(--cab-primary)_88%,var(--cab-text))] ring-1 ring-[color:color-mix(in_srgb,var(--cab-primary)_28%,transparent)]`
                      : `${dsPageToolbarBtn} w-full justify-center sm:w-auto`
                  }
                >
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      nascondiScortaZero
                        ? "bg-[color:var(--cab-primary)]"
                        : "bg-[color:color-mix(in_srgb,var(--cab-text-muted)_55%,transparent)]"
                    }`}
                    aria-hidden
                  />
                  Nascondi scorta 0
                </button>
              </>
            }
            meta={
              <PageToolbarResultCount
                count={filteredSorted.length}
                filtersActive={hasAdvancedPanelFilters || soloSottoScorta || nascondiScortaZero}
                searchActive={searchApplied.trim().length > 0 || searchInput.trim().length > 0}
                onSearchReset={resetMagazzinoRicerca}
                onFilterReset={resetMagazzinoFilters}
              />
            }
          />
        </section>

        {magazzinoInitialLoading ? (
          <LoadingMagazzinoListSkeleton withToolbar={false} />
        ) : (
        <>
        <GestionaleListTable
          visibilityClass="mt-4 hidden xl:block"
          colgroup={
            <>
              <col style={{ width: "7.75rem" }} />
              <col className="w-[7%]" />
              <col className="w-[20%]" />
              <col className="w-[7%]" />
              <col className="w-[6%]" />
              <col className="w-[7.5%]" />
              <col className="w-[10%]" />
              <col className="w-[8.5%]" />
              <col className="w-[9.5%]" />
              <col className="w-[12%]" />
            </>
          }
          headRow={
            <>
              <GlobalTableSortTh
                label="CODICE"
                columnKey="codiceFornitoreOriginale"
                sortColumn={sortColumn}
                sortPhase={sortPhase}
                onSort={onSort}
                thClassName="w-[7.75rem] min-w-[7.75rem] max-w-[7.75rem]"
              />
              <GlobalTableSortTh
                label="Marca"
                columnKey="marca"
                sortColumn={sortColumn}
                sortPhase={sortPhase}
                onSort={onSort}
              />
              <MagazzinoDescrizioneSortTh sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSort} />
              <GlobalTableSortTh
                label="Categoria"
                columnKey="categoria"
                sortColumn={sortColumn}
                sortPhase={sortPhase}
                onSort={onSort}
                thClassName="min-w-0"
              />
              <GlobalTableSortTh
                label="Scorta"
                columnKey="scorta"
                sortColumn={sortColumn}
                sortPhase={sortPhase}
                onSort={onSort}
                align="center"
              />
              <GlobalTableSortTh
                label="Scorta min."
                columnKey="scortaMinima"
                sortColumn={sortColumn}
                sortPhase={sortPhase}
                onSort={onSort}
                align="center"
                thClassName="min-w-0"
              />
              <GlobalTableSortTh
                label="Ultima modifica"
                columnKey="dataUltimaModifica"
                sortColumn={sortColumn}
                sortPhase={sortPhase}
                onSort={onSort}
                align="center"
                thClassName="min-w-0"
              />
              <GlobalTableSortTh
                label="P. vendita"
                columnKey="prezzoVendita"
                sortColumn={sortColumn}
                sortPhase={sortPhase}
                onSort={onSort}
                align="center"
              />
              <GlobalTableSortTh
                label="Consumo medio"
                columnKey="consumoMedioMensile"
                sortColumn={sortColumn}
                sortPhase={sortPhase}
                onSort={onSort}
                align="center"
                thClassName="whitespace-nowrap"
              />
              <GestionaleListTableActionsHead />
            </>
          }
          empty={filteredSorted.length === 0}
          emptyMessage="Nessun ricambio corrisponde ai filtri selezionati."
          colSpan={10}
        >
              {pagedMagazzino.map((p) => {
                const consumoRow = consumoMap.get(p.id);
                const avgM = consumoRow?.avgMonthly ?? null;
                const low = p.scorta < p.scortaMinima;
                const flash = flashRowId === p.id;
                return (
                  <tr
                    id={`magazzino-row-${p.id}`}
                    key={p.id}
                    data-gestionale-row-tone={gestionaleListTableRowTone({ flash, lowStock: low })}
                    className={[gestionaleListTableRowClass, rowStockBg(p)].filter(Boolean).join(" ")}
                  >
                    <td
                      className={`min-w-0 w-[7.75rem] max-w-[7.75rem] overflow-hidden ${gestionaleListTableTd} ${rowStockBorderFirstTd(p)}`}
                    >
                      <RicambioCodiceCell p={p} />
                    </td>
                    <td className={`${gestionaleListTableTd} font-medium`}>{p.marca}</td>
                    <td className={`min-w-0 ${gestionaleListTableTd}`}>
                      <div className="break-words font-medium leading-snug">{p.descrizione}</div>
                      <div className="mt-0.5 break-words text-xs leading-snug text-zinc-500 dark:text-zinc-400">
                        {compatDisplayFor(p)}
                      </div>
                    </td>
                    <td className={`min-w-0 ${gestionaleListTableTd} text-zinc-700 dark:text-zinc-300`}>
                      <MagazzinoOptionalTooltip content={p.categoria}>
                        <span className="block truncate text-[13px] leading-snug">{p.categoria}</span>
                      </MagazzinoOptionalTooltip>
                    </td>
                    <td className={gestionaleListTableTdCenter}>
                      <MagazzinoScortaBadge value={p.scorta} low={low} variant="table" />
                    </td>
                    <td className={`${gestionaleListTableTdCenter} !text-inherit`}>
                      <div className="flex justify-center">
                        <MagazzinoScortaBadge value={p.scortaMinima} kind="minima" variant="table" />
                      </div>
                    </td>
                    <td className={gestionaleListTableTdCenter}>
                      {(() => {
                        const stale = isModificaOlderThanMonths(p.dataUltimaModifica, MAGAZZINO_STALE_MODIFICA_MONTHS);
                        return (
                          <Tooltip
                            content={
                              stale
                                ? `${formatTimestampHover(p.dataUltimaModifica)} · ${MAGAZZINO_STALE_MODIFICA_HINT}`
                                : formatTimestampHover(p.dataUltimaModifica)
                            }
                            side="top"
                          >
                            <div
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
                          </Tooltip>
                        );
                      })()}
                    </td>
                    <td className={`${gestionaleListTableTdCenter} font-medium`}>{eur(p.prezzoVendita)}</td>
                    <td className={`${gestionaleListTableTdCenter} text-[13px] text-zinc-700 dark:text-zinc-300`}>
                      <MagazzinoOptionalTooltip content={magazzinoConsumoMedioTooltip(consumoRow, avgM)}>
                        <span className="inline-block max-w-full truncate">
                          {avgM != null ? formatAvgMonthlyMagazzinoIt(avgM) : "dati insufficienti"}
                        </span>
                      </MagazzinoOptionalTooltip>
                    </td>
                    <td className={gestionaleListTableTdAzioni}>
                      <div className={gestionaleListTableActionsGroupEnd}>
                        <IconActionButton label="Info" className={dsTableActionBtnInfo} onClick={() => openInfo(p)}>
                          <IconInfoMagazzino />
                        </IconActionButton>
                        <IconActionButton
                          label="Annulla"
                          tooltipContent={magCanCreateRicambio ? "Annulla" : "Sola lettura"}
                          className={dsTableActionBtnUndo}
                          disabled={!magCanCreateRicambio || !canUndoScortaById.get(p.id)}
                          onClick={() => void undoLastScorta(p.id)}
                        >
                          <IconUndoMagazzino />
                        </IconActionButton>
                        <IconActionButton
                          label="Diminuisci"
                          tooltipContent={magCanCreateRicambio ? "Diminuisci" : "Sola lettura"}
                          className={dsTableActionBtnSecondary}
                          disabled={!magCanCreateRicambio}
                          onClick={() => adjustScorta(p.id, -1)}
                        >
                          −
                        </IconActionButton>
                        <IconActionButton
                          label="Aumenta"
                          tooltipContent={magCanCreateRicambio ? "Aumenta" : "Sola lettura"}
                          className={dsTableActionBtnPrimary}
                          disabled={!magCanCreateRicambio}
                          onClick={() => adjustScorta(p.id, 1)}
                        >
                          +
                        </IconActionButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
        </GestionaleListTable>

        <div className="mt-4 space-y-3 xl:hidden">
          {pagedMagazzino.map((p) => {
            const consumoRow = consumoMap.get(p.id);
            const avgM = consumoRow?.avgMonthly ?? null;
            const low = p.scorta < p.scortaMinima;
            const flash = flashRowId === p.id;
            const staleModifica = isModificaOlderThanMonths(p.dataUltimaModifica, MAGAZZINO_STALE_MODIFICA_MONTHS);
            return (
              <CardMobile
                id={`magazzino-row-${p.id}`}
                key={p.id}
                className={[
                  rowStockBg(p),
                  flash
                    ? "shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--cab-primary)_45%,transparent)] ring-2 ring-[color:color-mix(in_srgb,var(--cab-primary)_35%,transparent)]"
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
                    {p.codiceFornitoreOriginaleSecondario.trim() ? (
                      <p className="break-all font-mono text-xs font-medium tabular-nums tracking-wide text-zinc-500 dark:text-zinc-400">
                        {p.codiceFornitoreOriginaleSecondario}
                      </p>
                    ) : null}
                    <p className="truncate text-[0.9375rem] font-medium leading-snug text-[color:var(--cab-text)]">
                      {p.marca.trim() || "—"}
                    </p>
                  </div>
                  <Tooltip content={low ? "Sotto scorta minima" : "Giacenza"} side="top">
                    <MagazzinoScortaBadge value={p.scorta} low={low} variant="mobile" />
                  </Tooltip>
                </div>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{compatDisplayFor(p)}</p>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div>
                    <dt className="text-zinc-500 dark:text-zinc-400">Categoria</dt>
                    <dd className="font-medium text-zinc-900 dark:text-zinc-100">{p.categoria}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500 dark:text-zinc-400">Scorta minima</dt>
                    <dd>
                      <MagazzinoScortaBadge value={p.scortaMinima} kind="minima" variant="table" />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500 dark:text-zinc-400">P. vendita</dt>
                    <dd className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">{eur(p.prezzoVendita)}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500 dark:text-zinc-400">Consumo medio</dt>
                    <dd className="font-medium tabular-nums text-zinc-700 dark:text-zinc-300">
                      <MagazzinoOptionalTooltip content={magazzinoConsumoMedioTooltip(consumoRow, avgM)}>
                        <span className="inline-block max-w-full truncate">
                          {avgM != null ? formatAvgMonthlyMagazzinoIt(avgM) : "dati insufficienti"}
                        </span>
                      </MagazzinoOptionalTooltip>
                    </dd>
                  </div>
                </dl>
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-zinc-200/90 pt-3 dark:border-zinc-700/80">
                  <Tooltip
                    content={
                      staleModifica
                        ? `${formatTimestampHover(p.dataUltimaModifica)} · ${MAGAZZINO_STALE_MODIFICA_HINT}`
                        : formatTimestampHover(p.dataUltimaModifica)
                    }
                    side="top"
                  >
                    <div
                      className={`min-w-0 flex-1 text-xs font-medium text-[color:var(--cab-text-muted)] ${
                        staleModifica
                          ? "rounded-md bg-amber-50/95 px-1.5 py-0.5 ring-1 ring-amber-200/80 dark:bg-amber-950/35 dark:ring-amber-800/55"
                          : ""
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-1">
                        {staleModifica ? (
                          <span
                            className="shrink-0 text-[11px] leading-none text-amber-700 dark:text-amber-300"
                            aria-hidden
                          >
                            ⚠
                          </span>
                        ) : null}
                        <p className="truncate tabular-nums leading-tight">
                          {formatMagazzinoUltimaModificaMobileDate(p.dataUltimaModifica)}
                        </p>
                      </div>
                      <p className="truncate leading-tight">
                        {formatMagazzinoUltimaModificaMobileAutore(p.autoreUltimaModifica)}
                      </p>
                    </div>
                  </Tooltip>
                  <div className={`${gestionaleListTableActionsGroupEnd} shrink-0`} role="group" aria-label="Azioni">
                  <IconActionButton label="Info" className={dsTableActionBtnInfo} onClick={() => openInfo(p)}>
                    <IconInfoMagazzino />
                  </IconActionButton>
                  <IconActionButton
                    label="Annulla"
                    tooltipContent={magCanCreateRicambio ? "Annulla" : "Sola lettura"}
                    className={dsTableActionBtnUndo}
                    disabled={!magCanCreateRicambio || !canUndoScortaById.get(p.id)}
                    onClick={() => void undoLastScorta(p.id)}
                  >
                    <IconUndoMagazzino />
                  </IconActionButton>
                  <IconActionButton
                    label="Diminuisci"
                    tooltipContent={magCanCreateRicambio ? "Diminuisci" : "Sola lettura"}
                    className={dsTableActionBtnSecondary}
                    disabled={!magCanCreateRicambio}
                    onClick={() => adjustScorta(p.id, -1)}
                  >
                    −
                  </IconActionButton>
                  <IconActionButton
                    label="Aumenta"
                    tooltipContent={magCanCreateRicambio ? "Aumenta" : "Sola lettura"}
                    className={dsTableActionBtnPrimary}
                    disabled={!magCanCreateRicambio}
                    onClick={() => adjustScorta(p.id, 1)}
                  >
                    +
                  </IconActionButton>
                  </div>
                </div>
              </CardMobile>
            );
          })}
        </div>
        {showPager ? (
          <TablePagination page={page} pageCount={pageCount} onPageChange={setPage} label={label} />
        ) : null}
        </>
        )}
      </ShellCard>
      </div>

      {newOpen ? (
        <GestionaleModalShell
          onRequestClose={closeNewRicambioModal}
          title="Nuovo ricambio"
          titleId="new-ricambio-title"
        >
            <form {...gestionaleFormFocusScopeProps()} onSubmit={submitNew} className={`${gestionaleModalBodyFlexClass} overflow-hidden`}>
              <GestionaleModalScrollBody className="space-y-4">
                <RicambioFormFields
                  form={newForm}
                  setForm={setNewForm}
                  formResetKey={newRicambioDraftId ?? "new"}
                  relaxHtmlValidation
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
                    canEdit={magCanCreateRicambio}
                    auditLog={false}
                    hubCardLayout
                  />
                ) : null}
              </GestionaleModalScrollBody>
              <footer className={`${dsModalFormFooter} flex-col items-stretch`}>
                <LoadingButton
                  type="submit"
                  loading={saveBusy}
                  preset="salva"
                  loadingLabel="Salvataggio…"
                  className={`${erpBtnAccent} min-h-11 w-full justify-center disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 disabled:grayscale`}
                >
                  Salva in magazzino
                </LoadingButton>
              </footer>
            </form>
        </GestionaleModalShell>
      ) : null}

      {detail && detailRicambio && detail.mode === "info" ? (
        <GestionaleModalShell
          onRequestClose={closeDetail}
          title="Scheda ricambio"
          titleId="detail-ricambio-title"
          maxWidthClass="max-w-lg"
        >
          <div className={`${gestionaleModalBodyFlexClass} overflow-hidden`}>
            <GestionaleModalScrollBody>
              <RicambioInfoPanel
                ricambio={detailRicambio}
                compatDisplay={compatDisplayFor(detailRicambio)}
                consumo={consumoMap.get(detailRicambio.id)}
                formatEur={eur}
                canEditPhotos={magCanCreateRicambio}
                onImageEvent={(ev) => logImageEvent(ev, detailRicambio)}
                logTimeline={infoTimeline}
                logLoading={magLogFeedLoading}
                onDismissLogEntry={removeMagazzinoLogEntry}
              />
            </GestionaleModalScrollBody>
            <footer className={`${dsModalFormFooter} flex-col items-stretch`}>
              <MagazzinoDisabledButtonTooltip
                content={magCanCreateRicambio ? "Modifica" : READONLY_PERMISSION_HINT}
                disabled={!magCanCreateRicambio}
              >
                <button
                  type="button"
                  onClick={startEditFromInfo}
                  className={`${erpBtnAccent} min-h-11 w-full justify-center disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45`}
                  disabled={!magCanCreateRicambio}
                >
                  Modifica
                </button>
              </MagazzinoDisabledButtonTooltip>
            </footer>
          </div>
        </GestionaleModalShell>
      ) : null}

      {detail && detailRicambio && detail.mode === "edit" ? (
        <RicambioEditModal
          ricambioId={detail.id}
          ricambio={detailRicambio}
          mezziListePrefs={mezziListePrefs}
          marche={marche}
          categorie={categorie}
          authorName={authorName}
          consumo={consumoMap.get(detailRicambio.id)}
          magCanCreateRicambio={magCanCreateRicambio}
          magCanDeleteRicambio={magCanDeleteRicambio}
          onClose={closeDetail}
          onCancel={cancelEditBackToInfo}
          onRequestDelete={requestEliminaRicambio}
          onSaveError={(message) => toastError(message)}
          onSaved={(ui, message) => {
            patchProdotti((prev) => prev.map((p) => (p.id === ui.id ? touch(ui) : p)));
            completeMagazzinoSave(ui.id, message);
          }}
        />
      ) : null}

      <Drawer
        open={logOpen}
        onClose={() => setLogOpen(false)}
        title="Log modifiche magazzino"
        ariaLabel="Log modifiche magazzino"
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden p-3">
          <div className={`${gestionaleLogScrollEmbeddedClass} min-h-0 min-w-0 flex-1`}>
              {magLogFeedLoading && magLogFeed.length === 0 ? (
                <LoadingFormSkeleton fields={2} className="px-1 py-2" />
              ) : magLogFeed.length === 0 ? (
                <GestionaleLogEmpty message="Nessuna modifica registrata." />
              ) : (
                <GestionaleLogList>
                  {pagedMagLogFeed.map((item) => (
                    <li key={item.id} className="list-none">
                      <GestionaleLogEntryFourLines
                        vm={item.vm}
                        onClick={() => focusRicambioInTable(item.ricambioId)}
                        title="Mostra ricambio in tabella"
                        trailing={
                          item.source === "local" ? (
                            <GestionaleLogEntryDismissButton
                              onDismiss={() => removeMagazzinoLogEntry(item.id)}
                            />
                          ) : undefined
                        }
                      />
                    </li>
                  ))}
                </GestionaleLogList>
            )}
          </div>
          {showMagLogDrawerPager ? (
            <TablePagination
              page={magLogDrawerPage}
              pageCount={magLogDrawerPageCount}
              onPageChange={setMagLogDrawerPage}
              label={magLogDrawerPagerLabel}
            />
          ) : null}
        </div>
      </Drawer>

      {dupCheckModalOpen ? (
        <GestionaleModalShell
          onRequestClose={() => setDupCheckModalOpen(false)}
          title="Codici duplicati in archivio"
          titleId="dup-magazzino-title"
          maxWidthClass="max-w-lg"
        >
            <GestionaleModalScrollBody className="space-y-3">
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
            </GestionaleModalScrollBody>
        </GestionaleModalShell>
      ) : null}
      <SettingsEliminaConfirmDialog
        open={eliminaRicambioTarget != null}
        itemLabel={eliminaRicambioTarget?.descrizione}
        detail="Il ricambio verrà rimosso dal magazzino."
        onCancel={() => setEliminaRicambioTarget(null)}
        onConfirm={() => void executeEliminaRicambio()}
      />
      {confirmDialog}
    </div>
    </GestionaleSectionGate>
  );
}
