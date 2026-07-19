"use client";

import "./magazzino-scroll.css";

import type { ReactElement, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGestionaleSyncScope } from "@/src/hooks/gestionale/use-gestionale-sync-scope";
import { useUIAutonomyFixEngine } from "@/lib/ui-autonomy-fix/use-ui-autonomy-fix-engine";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CardMobile,
  CloseButton,
  GestionaleAiActionButton,
  IconActionButton,
  LoadingButton,
  LoadingFormSkeleton,
  PageLayout,
  SkeletonBoundary,
} from "@/components/design-system";
import { OptionalTooltip, Tooltip } from "@/components/ui";
import { MagazzinoBulkLabelToolbar } from "@/components/gestionale/magazzino/magazzino-bulk-label-toolbar";
import { MagazzinoScortaAdjustActions } from "@/components/gestionale/magazzino/magazzino-scorta-adjust-actions";
import { MagazzinoScortaBadge } from "@/components/gestionale/magazzino/magazzino-scorta-badge";
import { MagazzinoListinoAiBadge } from "@/components/gestionale/magazzino/magazzino-listino-ai-badge";
import { MagazzinoMarcaMobileBadge } from "@/components/gestionale/magazzino/magazzino-marca-mobile-badge";
import dynamic from "next/dynamic";
import { GestionaleModalGate } from "@/components/gestionale/gestionale-modal-gate";

const RicambioNewModal = dynamic(
  () => import("@/components/gestionale/magazzino/ricambio-new-modal").then((m) => m.RicambioNewModal),
  { ssr: false },
);
const RicambioEditModal = dynamic(
  () => import("@/components/gestionale/magazzino/ricambio-edit-modal").then((m) => m.RicambioEditModal),
  { ssr: false },
);
const MagazzinoRicambioInfoModal = dynamic(
  () => import("@/components/gestionale/magazzino/magazzino-modals").then((m) => m.MagazzinoRicambioInfoModal),
  { ssr: false },
);
const MagazzinoDupCodesModal = dynamic(
  () => import("@/components/gestionale/magazzino/magazzino-modals").then((m) => m.MagazzinoDupCodesModal),
  { ssr: false },
);
const MagazzinoAdvancedFilterPanel = dynamic(
  () =>
    import("@/components/gestionale/magazzino/magazzino-advanced-filter-panel").then(
      (m) => m.MagazzinoAdvancedFilterPanel,
    ),
  { ssr: false, loading: () => <LoadingFormSkeleton fields={3} className="px-1 py-2" /> },
);
const MagazzinoLogDrawer = dynamic(
  () => import("@/components/gestionale/magazzino/magazzino-log-drawer").then((m) => m.MagazzinoLogDrawer),
  { ssr: false },
);
import { ricambioUiToMagazzinoUpdate } from "@/lib/magazzino/magazzino-db-ui-adapter";
import { magazzinoEntry } from "@/lib/domain/magazzino-entry";
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
  saveMagazzinoChangeLog,
  type MagazzinoChangeLogEntry,
} from "@/lib/magazzino/magazzino-change-log-storage";
import {
  formatMarkupDisplay,
  type RicambioFormState,
} from "@/lib/magazzino/form";
import { readCompatDisplayForUi, readCompatLabelsForUi, readCompatModelsDisplayForUi } from "@/lib/magazzino/compat/compat-read-guard";
import { ricambioHasFornitoreAlternativo } from "@/lib/magazzino/ricambio-fornitori-alternativi";
import {
  compareByColumn,
  compareMagazzinoDefaultOrder,
  compareNaturalOrder,
  type SortPhaseMagazzino,
} from "@/lib/magazzino/sort-order";
import {
  buildConsumoMapMagazzinoRolling36ForProducts,
  formatAvgMonthlyMagazzinoIt,
  type RicambioConsumoDaLog,
} from "@/lib/magazzino/ricambio-consumo-from-log";
import type { MagazzinoMasterPrefs } from "@/lib/magazzino/magazzino-master-prefs-storage";
import type { RicambioMagazzino, SortKeyMagazzino } from "@/lib/magazzino/types";
import { formatRicambioUnitaMisuraLabel } from "@/lib/magazzino/ricambio-unita-misura";
import {
  dsPageToolbarCtaCompact,
  GESTIONALE_SEARCH_PLACEHOLDER,
  dsBtnNeutral,
  dsBtnDanger,
  dsBtnPrimary,
  dsBtnSoftOrange,
  dsFocus,
  dsTableActionBtnInfo,
  dsTableActionGlyph,
} from "@/lib/ui/design-system";
import {
  GestionaleListTable,
  GestionaleListTableActionsHead,
  GlobalTableSortTh,
} from "@/components/gestionale/global-table";
import {
  gestionaleListTableIsLastRow,
  gestionaleListTableLastRowAttr,
  gestionaleListTableRowClass,
  gestionaleListTableRowSurfaceClass,
  gestionaleListTableRowTone,
  gestionaleListTableRowToneFlash,
  gestionaleListTableRowToneLowStock,
  gestionaleListTableTd,
  gestionaleListTableTdAzioni,
  gestionaleListTableTdCenter,
  gestionaleListTableActionsGroupEnd,
} from "@/lib/ui/gestionale-list-table";
import { MagazzinoDescrizioneSortTh } from "@/components/gestionale/magazzino/magazzino-descrizione-sort-th";
import { MagazzinoTableSection } from "@/components/gestionale/magazzino/magazzino-page-structure";
import {
  PageActionMenu,
  pageActionLogItem,
  type PageActionItem,
} from "@/components/ui";
import {
  PageActionIconDelete,
} from "@/components/ui/page-action-menu/page-action-menu-icons";
import { ShellCard } from "@/components/gestionale/shell-card";
import { TablePagination } from "@/components/gestionale/table-pagination";
import {
  PageToolbar,
  PageToolbarCtaLabel,
  PageToolbarResultCount,
  PageToolbarMetaToggle,
} from "@/components/design-system";
import { GestionaleListSearchField } from "@/components/gestionale/gestionale-list-search-field";
import { MagazzinoGiacenzaBell } from "@/components/gestionale/magazzino/magazzino-giacenza-bell";
import { useDataImportExportPageActions } from "@/components/data-import/data-import-export-toolbar";
import type { RecordImageLogEvent } from "@/components/gestionale/media/record-image-manager";
import {
  buildMagazzinoFilterCatalog,
  loadMagazzinoAdvancedFiltersPersisted,
  MAGAZZINO_ADVANCED_FILTERS_EMPTY,
  magazzinoAdvancedFiltersActive,
  saveMagazzinoAdvancedFiltersPersisted,
  type MagazzinoAdvancedFilters,
} from "@/lib/magazzino/magazzino-advanced-filters";
import {
  buildMagazzinoHaystackIndex,
  magazzinoRowMatchesPageFiltersIndexed,
} from "@/lib/magazzino/magazzino-filter-search-index";
import {
  buildMagazzinoSearchSuggestions,
  type MagazzinoPageFilters,
} from "@/lib/magazzino/magazzino-list-ui-filters";
import {
  buildMagazzinoLocalLogEntry,
  buildMagazzinoScortaPersistedLogEntry,
} from "@/lib/magazzino/magazzino-log-events";
import {
  applyScortaOptimisticDelta,
  enqueueScortaSync,
} from "@/lib/magazzino/scorta-adjust-sync";
import {
  readMagazzinoModalitaModifica,
  writeMagazzinoModalitaModifica,
} from "@/lib/magazzino/magazzino-modalita-modifica-storage";
import { applyScortaDeltaViaMovimento } from "@/lib/magazzino/scorta-movement";
import { revealRicambioInTableAfterSave } from "@/lib/magazzino/magazzino-table-focus";
import { GestionaleSectionGate } from "@/components/gestionale/gestionale-section-gate";
import { MagazzinoCarichiCaptureLauncher } from "@/components/gestionale/magazzino/carichi/magazzino-carichi-capture-launcher";
import { layoutPageRoot } from "@/lib/ui/responsive-layout-core";
import type { TooltipSide } from "@/lib/ui/tooltip-portal";
import { SettingsEliminaConfirmDialog } from "@/components/dashboard/settings-elimina-confirm-dialog";
import { useGestionaleConfirm } from "@/src/hooks/use-gestionale-confirm";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { useMagazzinoLogFeed } from "@/lib/magazzino/use-magazzino-log-feed";
import { useMagazzinoListDerived } from "@/lib/magazzino/use-magazzino-list-derived";
import { formatCompatMezziArrayForLog } from "@/lib/gestionale-log/log-summary";
import { useAuth } from "@/context/auth-context";
import {
  collapsibleExpandedBoolPref,
  useCollapsiblePreference,
} from "@/lib/ui/collapsible-prefs";
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import {
  GESTIONALE_LIST_DESKTOP_ONLY_CLASS,
  GESTIONALE_LIST_MOBILE_ONLY_CLASS,
  useGestionaleListLayout,
} from "@/lib/ui/use-gestionale-list-layout";
import { useResponsiveListPageSize } from "@/lib/ui/use-responsive-list-page-size";
import { CAB_SETTINGS_KEY, CAB_SETTINGS_MODULE } from "@/src/lib/app-settings/keys";
import { useCabAppSettingsPayloadQuery, useSettingsUpsertMutation } from "@/src/hooks/gestionale/use-settings-queries";
import { usePermissionsSnapshot } from "@/src/hooks/use-permissions";
import { READONLY_PERMISSION_HINT } from "@/src/lib/auth/permissions";
import { Q_FOCUS_RICAMBIO, Q_OPEN_RICAMBIO } from "@/lib/navigation/dashboard-log-links";
import { useAdminNotificationStore } from "@/src/hooks/gestionale/use-admin-notification-store";
import { deleteGeneratedListinoRicambiRequest } from "@/lib/magazzino/listino-import/listino-import-client";

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

/** Card mobile magazzino: data + ora e autore su due righe. */
function formatMagazzinoUltimaModificaMobileDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMagazzinoUltimaModificaMobileAutore(autore: string): string {
  return autore.trim() || "—";
}

function isMagazzinoMobilePlaceholderValue(value: string): boolean {
  const t = value.trim();
  return !t || t === "—" || t === "-";
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
  unitaMisura: "Unità di misura",
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
  "unitaMisura",
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

type CampoChange = { campo: string; prima: string; dopo: string };

function fmtForDiff(k: keyof RicambioMagazzino, r: RicambioMagazzino): string {
  if (k === "fornitoriAlternativi") return fmtFornitoriAlternativiDiff(r.fornitoriAlternativi);
  const v = r[k];
  if (k === "usatoInTagliandi") return r.usatoInTagliandi ? "Sì" : "No";
  if (k === "unitaMisura") return formatRicambioUnitaMisuraLabel(r.unitaMisura);
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

const SEARCH_DEBOUNCE_MS = 320;

function magazzinoConsumoMedioTooltip(
  consumoRow: { insufficientReason?: string | null } | undefined,
  avgM: number | null,
): string | undefined {
  return consumoRow?.insufficientReason ?? (avgM != null ? "Da log magazzino (uscite Δ scorta)" : undefined);
}

function RicambioCodiceCell({ p }: { p: RicambioMagazzino }) {
  const secondary = p.codiceFornitoreOriginaleSecondario.trim();
  return (
    <div className="flex items-start gap-1">
      <div className="min-w-0 flex-1 space-y-0.5">
        <span className="inline-block max-w-full break-all rounded-md bg-zinc-100 px-2 py-1 font-mono text-xs font-semibold leading-snug tracking-wide dark:bg-zinc-800">
          {p.codiceFornitoreOriginale}
        </span>
        {secondary ? (
          <div className="break-all pl-0.5 font-mono text-[11px] font-medium leading-snug tracking-wide text-zinc-500 dark:text-zinc-400">
            {secondary}
          </div>
        ) : null}
      </div>
      <MagazzinoListinoAiBadge listinoImport={p.listinoImport} />
    </div>
  );
}

export function MagazzinoView() {
  useGestionaleSyncScope({
    scopeId: "magazzino-view",
    domain: "magazzino",
    tables: ["magazzino_ricambi", "movimenti_ricambi", "log_modifiche", "ordini_fornitori"],
  });

  const {
    containerRef: listLayoutRef,
    layout: listLayout,
    layoutClassName: listLayoutClassName,
  } = useGestionaleListLayout({ tier: "xl" });
  const { authorName, user } = useAuth();

  function magazzinoLogScopeFields(): Pick<MagazzinoLogEntry, "autoreUserId"> {
    return { autoreUserId: user?.id };
  }
  const settingsPayload = useCabAppSettingsPayloadQuery({ tier: "static" });
  const appSettings = settingsPayload.data?.resolved;
  const settingsRows = settingsPayload.data?.rows ?? [];
  const { global: globalPerm, modules: permModules } = usePermissionsSnapshot();
  const magPerm = permModules.magazzino;
  const { clearMagazzinoNotifications } = useAdminNotificationStore();
  /** Creazione ricambio: `can_write` o `can_admin` sul modulo (viewer resta escluso). */
  const magCanCreateRicambio = magPerm.canWrite || globalPerm.isAdmin;
  const magCanDeleteRicambio = magPerm.canWrite;
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
  const [deleteGeneratedOpen, setDeleteGeneratedOpen] = useState(false);
  const [deleteGeneratedLoading, setDeleteGeneratedLoading] = useState(false);
  const magazzinoInitialLoading = magazzinoListQ.isLoading && magazzinoListQ.data === undefined;
  const [searchInput, setSearchInput] = useState("");
  const [searchApplied, setSearchApplied] = useState("");
  const [searchSuggestionsApplied, setSearchSuggestionsApplied] = useState("");
  const [searchFieldFocused, setSearchFieldFocused] = useState(false);
  const searchInputRef = useRef(searchInput);
  searchInputRef.current = searchInput;
  const [sortColumn, setSortColumn] = useState<SortKeyMagazzino | null>(null);
  const [sortPhase, setSortPhase] = useState<SortPhaseMagazzino>("natural");
  const [advancedFilters, setAdvancedFilters] = useState<MagazzinoAdvancedFilters>(
    () => loadMagazzinoAdvancedFiltersPersisted() ?? MAGAZZINO_ADVANCED_FILTERS_EMPTY,
  );
  const [soloSottoScorta, setSoloSottoScorta] = useState(false);
  const [nascondiScortaZero, setNascondiScortaZero] = useState(false);
  const [filtriEspansi, setFiltriEspansi] = useCollapsiblePreference(
    collapsibleExpandedBoolPref(false, { scope: "magazzino", key: "filters", userId: user?.id ?? null }),
  );
  const importExportActions = useDataImportExportPageActions({
    entity: "magazzino_ricambi",
    module: "magazzino",
    extraImportEntities: ["listino_ricambi"],
    disabled: !magCanCreateRicambio,
    onImportCompleted: () => void magazzinoListQ.refetch(),
  });

  const patchAdvancedFilters = useCallback((patch: Partial<MagazzinoAdvancedFilters>) => {
    setAdvancedFilters((prev) => {
      const next = { ...prev, ...patch };
      saveMagazzinoAdvancedFiltersPersisted(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const trimmed = searchInput.trim();
    const t = window.setTimeout(() => {
      setSearchApplied(trimmed);
      setSearchSuggestionsApplied(trimmed);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const flushPageSearch = useCallback(() => {
    const trimmed = searchInputRef.current.trim();
    setSearchApplied(trimmed);
    setSearchSuggestionsApplied(trimmed);
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
  const listDerived = useMagazzinoListDerived(prodotti, mezziListePrefs);
  const {
    sottoScortaList,
    sottoScortaTotale,
    generatedListinoCount,
    marcheFromRows,
    categorieFromRows,
    fornitoriFromRows,
    mezziFromRows,
    archivioDupCodeGroups,
    archivioDupCodeCount,
  } = listDerived;

  const [newOpen, setNewOpen] = useState(false);
  const { success: toastSuccess, error: toastError, validation: toastValidation, successDeleted, errorOnce } =
    useGestionaleToast();
  const { confirm, confirmDialog } = useGestionaleConfirm();
  const [eliminaRicambioTarget, setEliminaRicambioTarget] = useState<RicambioMagazzino | null>(null);
  const [dupCheckModalOpen, setDupCheckModalOpen] = useState(false);

  const [detail, setDetail] = useState<{ id: string; mode: "info" | "edit" } | null>(null);
  const [selectedRicambioIds, setSelectedRicambioIds] = useState<Set<string>>(() => new Set());
  const [labelMode, setLabelMode] = useState(false);
  const [modalitaModifica, setModalitaModifica] = useState(false);
  useEffect(() => {
    setModalitaModifica(readMagazzinoModalitaModifica());
  }, []);
  useUIAutonomyFixEngine("/magazzino", [newOpen, detail, dupCheckModalOpen]);

  const [flashRowId, setFlashRowId] = useState<string | null>(null);
  const flashRowRef = useRef<string | null>(null);
  const flashClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prodottiByIdRef = useRef<Map<string, RicambioMagazzino>>(new Map());
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

  const listPageSize = useResponsiveListPageSize();
  listPageSizeRef.current = listPageSize;

  const logFeedEnabled = logOpen || detail?.mode === "info";

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
    enabled: logFeedEnabled,
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

  const restoreMagazzinoDesktopRowTone = useCallback((id: string) => {
    const el = document.getElementById(`magazzino-row-${id}`);
    if (!el || el.tagName !== "TR") return;
    const p = prodottiByIdRef.current.get(id);
    const low = p ? p.scorta < p.scortaMinima : false;
    if (low) {
      el.setAttribute("data-gestionale-row-tone", gestionaleListTableRowToneLowStock);
    } else {
      el.removeAttribute("data-gestionale-row-tone");
    }
  }, []);

  const applyMagazzinoDesktopRowFlash = useCallback((id: string) => {
    requestAnimationFrame(() => {
      const el = document.getElementById(`magazzino-row-${id}`);
      if (!el || el.tagName !== "TR") return;
      const p = prodottiByIdRef.current.get(id);
      if (p && p.scorta < p.scortaMinima) return;
      el.setAttribute("data-gestionale-row-tone", gestionaleListTableRowToneFlash);
    });
  }, []);

  const flashRow = useCallback(
    (id: string, opts?: { durationMs?: number }) => {
      const prev = flashRowRef.current;
      if (prev && prev !== id) restoreMagazzinoDesktopRowTone(prev);
      if (flashClearRef.current) clearTimeout(flashClearRef.current);
      flashRowRef.current = id;
      setFlashRowId(id);
      applyMagazzinoDesktopRowFlash(id);
      const ms = opts?.durationMs ?? 820;
      flashClearRef.current = setTimeout(() => {
        flashRowRef.current = null;
        setFlashRowId(null);
        restoreMagazzinoDesktopRowTone(id);
        flashClearRef.current = null;
      }, ms);
    },
    [applyMagazzinoDesktopRowFlash, restoreMagazzinoDesktopRowTone],
  );

  const focusRicambioInTable = useCallback(
    (ricambioId: string, opts?: { applySottoScorta?: boolean; flashMs?: number }) => {
      flushPendingLog();
      setDupCheckModalOpen(false);
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
    const id = searchParams.get(Q_OPEN_RICAMBIO);
    if (!id || magazzinoInitialLoading) return;
    const t = window.setTimeout(() => {
      const ricambio = prodotti.find((p) => p.id === id);
      if (ricambio) {
        setDetail({ id: ricambio.id, mode: "info" });
      }
      router.replace(pathname, { scroll: false });
    }, 150);
    return () => window.clearTimeout(t);
  }, [searchParams, pathname, router, prodotti, magazzinoInitialLoading]);

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
        })
        .then(() => {
          lastSyncedMagMasterSigRef.current = sig;
        })
        .catch(() => {
          /* toast OCC già in useSettingsUpsertMutation */
        });
    }, 900);
    return () => {
      if (magMasterSaveTimer.current) clearTimeout(magMasterSaveTimer.current);
    };
  }, [masterPrefsHydrated, magPerm.canWrite, magMasterPayloadSig, masterMarche, masterCategorie, masterMezzi, masterFornitori, upsertMagazzinoMaster]);

  const lastPersistedLogRef = useRef<MagazzinoLogEntry[] | null>(null);

  useEffect(() => {
    setLogEntries(loadMagazzinoChangeLog());
    setLogPersistReady(true);
  }, []);

  useEffect(() => {
    if (!logPersistReady) return;
    if (logEntries === lastPersistedLogRef.current) return;
    lastPersistedLogRef.current = logEntries;
    saveMagazzinoChangeLog(logEntries);
  }, [logEntries, logPersistReady]);

  const marche = useMemo(
    () => mergeMasterWithRows(masterMarche, marcheFromRows),
    [masterMarche, marcheFromRows],
  );

  const categorie = useMemo(
    () => mergeMasterWithRows(masterCategorie, categorieFromRows),
    [masterCategorie, categorieFromRows],
  );

  /** Elenchi globali puri (`Impostazioni → Magazzino`) — SSOT per selettori e validazione form. */
  const fornitoriGlobal = useMemo(
    () => appSettings?.magazzinoMaster?.fornitori ?? [],
    [appSettings?.magazzinoMaster?.fornitori],
  );
  const produttoriGlobal = useMemo(
    () => appSettings?.magazzinoMaster?.produttori ?? [],
    [appSettings?.magazzinoMaster?.produttori],
  );

  const fornitori = useMemo(
    () => mergeMasterWithRows(masterFornitori, fornitoriFromRows),
    [masterFornitori, fornitoriFromRows],
  );

  const mezzi = useMemo(
    () => mergeMasterWithRows(masterMezzi, mezziFromRows),
    [masterMezzi, mezziFromRows],
  );

  const needConsumoMap =
    !magazzinoInitialLoading &&
    (listLayout === "desktop" ||
      listLayout === "mobile" ||
      detail != null ||
      sortColumn === "consumoMedioMensile");

  const consumoMap = useMemo((): Map<string, RicambioConsumoDaLog> => {
    if (!needConsumoMap) return new Map();
    return buildConsumoMapMagazzinoRolling36ForProducts(logEntries, prodotti, new Date());
  }, [needConsumoMap, logEntries, prodotti]);

  const consumoAvgById = useMemo(() => {
    const m = new Map<string, number | null>();
    for (const p of prodotti) {
      const c = consumoMap.get(p.id);
      m.set(p.id, c?.avgMonthly ?? null);
    }
    return m;
  }, [prodotti, consumoMap]);

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

  const compatModelsDisplayFor = useCallback(
    (row: RicambioMagazzino) =>
      readCompatModelsDisplayForUi(row, mezziListePrefs, "magazzino-view.compatModelsDisplayFor"),
    [mezziListePrefs],
  );

  useEffect(() => {
    prodottiByIdRef.current = new Map(prodotti.map((p) => [p.id, p]));
  }, [prodotti]);

  const searchSuggestionPool = useMemo(() => {
    if (!searchFieldFocused) return [];
    if (!searchSuggestionsApplied.trim()) return [];
    return buildMagazzinoSearchSuggestions(prodotti, searchSuggestionsApplied, 8, mezziListePrefs);
  }, [searchFieldFocused, searchSuggestionsApplied, prodotti, mezziListePrefs]);

  const haystackIndex = useMemo(
    () => buildMagazzinoHaystackIndex(prodotti, mezziListePrefs),
    [prodotti, mezziListePrefs],
  );

  const filteredSorted = useMemo(() => {
    const orderMap = orderMapRef.current!;
    let rows = prodotti.filter((p) =>
      magazzinoRowMatchesPageFiltersIndexed(p, pageFilters, haystackIndex, mezziListePrefs),
    );

    rows = [...rows].sort((a, b) => {
      if (sortPhase === "natural" || sortColumn === null) {
        return compareMagazzinoDefaultOrder(a, b, orderMap, mezziListePrefs);
      }
      const primary = compareByColumn(a, b, sortColumn, sortPhase, consumoAvgById, mezziListePrefs);
      if (primary !== 0) return primary;
      return compareNaturalOrder(a, b, orderMap);
    });

    return rows;
  }, [prodotti, pageFilters, sortColumn, sortPhase, consumoAvgById, mezziListePrefs, haystackIndex]);

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
    const contaStatistiche = modalitaModifica;
    const applied = applyScortaOptimisticDelta(
      queryClient,
      id,
      delta,
      authorName,
      touch,
      mezziListePrefs,
      contaStatistiche,
    );
    if (!applied.found) return;
    flashRow(id);
    enqueueScortaSync(
      queryClient,
      id,
      authorName,
      {
        onPersisted: ({ ricambioId, label, prima, dopo, contaStatistiche: conta }) => {
          const entry = buildMagazzinoScortaPersistedLogEntry({
            id: `log-${Date.now()}-${++logSeqRef.current}`,
            ricambioId,
            ricambioLabel: label,
            autore: authorName,
            prima,
            dopo,
            contaStatistiche: conta,
            ...magazzinoLogScopeFields(),
          });
          applyLogEntry(entry);
        },
        onError: ({ error }) => {
          toastError(error);
        },
        invalidate: () => {
          void invalidateAfterMagazzinoOrMovimenti(queryClient, [
            cabSyncEventForEntity("movimenti_ricambi", id, "entity_created", "movimenti_ricambi"),
            cabSyncEventForEntity("magazzino_ricambi", id, "entity_updated", "magazzino_ricambi"),
          ]);
        },
      },
      mezziListePrefs,
      contaStatistiche,
    );
  }

  function openNewModal() {
    if (!magCanCreateRicambio) return;
    flushPendingLog();
    setDupCheckModalOpen(false);
    setNewOpen(true);
  }

  function closeNewRicambioModal() {
    setNewOpen(false);
    setLogEntries(loadMagazzinoChangeLog());
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

  const detailRicambio = detail ? prodotti.find((p) => p.id === detail.id) : undefined;

  function openInfo(p: RicambioMagazzino) {
    setDetail({ id: p.id, mode: "info" });
  }

  function toggleRicambioSelected(id: string) {
    if (!labelMode) return;
    setSelectedRicambioIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllVisible() {
    if (!labelMode) return;
    const visibleIds = pagedMagazzino.map((p) => p.id);
    setSelectedRicambioIds((prev) => {
      const allSelected = visibleIds.length > 0 && visibleIds.every((id) => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        for (const id of visibleIds) next.delete(id);
        return next;
      }
      return new Set([...prev, ...visibleIds]);
    });
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
    const removed = await magazzinoEntry.remove(id);
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

  async function executeDeleteGeneratedListinoRicambi() {
    if (deleteGeneratedLoading) return;
    setDeleteGeneratedLoading(true);
    try {
      const result = await deleteGeneratedListinoRicambiRequest();
      const blockedIds = new Set(result.blocked.map((b) => b.id));
      patchProdotti((prev) =>
        prev.filter((p) => !p.listinoImport?.generatoAutomaticamente || blockedIds.has(p.id)),
      );
      setDeleteGeneratedOpen(false);
      if (result.deleted > 0) {
        successDeleted();
        void invalidateAfterMagazzinoOrMovimenti(queryClient, [
          cabSyncEventForEntity("magazzino_ricambi", "listino-import-bulk", "entity_deleted", "magazzino_ricambi"),
        ]);
      } else if (result.blocked.length > 0) {
        toastError(
          `Nessun ricambio eliminato: ${result.blocked.length} hanno movimenti collegati.`,
          { module: "magazzino", action: "delete" },
        );
      } else {
        toastValidation("Nessun ricambio da listino da eliminare.");
      }
      if (result.deleted > 0 && result.blocked.length) {
        toastError(
          `${result.deleted} eliminati. ${result.blocked.length} non eliminabili (movimenti collegati).`,
          { module: "magazzino", action: "delete" },
        );
      }
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Eliminazione non riuscita.", {
        module: "magazzino",
        action: "delete",
      });
    } finally {
      setDeleteGeneratedLoading(false);
    }
  }

  function closeDetail() {
    setDetail(null);
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

  const renderMagazzinoDesktopRow = useCallback(
    (index: number) => {
      const p = pagedMagazzino[index];
      if (!p) return null;
      const consumoRow = consumoMap.get(p.id);
      const avgM = consumoRow?.avgMonthly ?? null;
      const low = p.scorta < p.scortaMinima;
      const stale = isModificaOlderThanMonths(p.dataUltimaModifica, MAGAZZINO_STALE_MODIFICA_MONTHS);
      const selected = selectedRicambioIds.has(p.id);
      return (
        <tr
          id={`magazzino-row-${p.id}`}
          key={p.id}
          data-gestionale-row-tone={gestionaleListTableRowTone({ lowStock: low })}
          data-selected={selected ? "true" : undefined}
          {...(gestionaleListTableIsLastRow(index, pagedMagazzino.length)
            ? { [gestionaleListTableLastRowAttr]: "true" }
            : {})}
          className={gestionaleListTableRowClass}
        >
          {labelMode ? (
            <td className={`${gestionaleListTableTdCenter} w-10`}>
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-zinc-300"
                checked={selected}
                onChange={() => toggleRicambioSelected(p.id)}
                aria-label={`Seleziona ${p.codiceFornitoreOriginale}`}
              />
            </td>
          ) : null}
          <td className={`min-w-0 w-[7.75rem] max-w-[7.75rem] overflow-hidden ${gestionaleListTableTd}`}>
            <RicambioCodiceCell p={p} />
          </td>
          <td className={`${gestionaleListTableTd} font-medium`}>{p.marca}</td>
          <td className={`min-w-0 ${gestionaleListTableTd}`}>
            <div className="break-words font-medium leading-snug">{p.descrizione}</div>
            <div className="mt-0.5 break-words text-xs leading-snug text-zinc-500 dark:text-zinc-400">
              {compatModelsDisplayFor(p)}
            </div>
          </td>
          <td className={`min-w-0 ${gestionaleListTableTd} text-zinc-700 dark:text-zinc-300`}>
            <span className="block truncate text-[13px] leading-snug">{p.categoria}</span>
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
          </td>
          <td className={`${gestionaleListTableTdCenter} font-medium`}>{eur(p.prezzoVendita)}</td>
          <td className={`${gestionaleListTableTdCenter} text-[13px] text-zinc-700 dark:text-zinc-300`}>
            <OptionalTooltip content={magazzinoConsumoMedioTooltip(consumoRow, avgM)}>
              <span className="inline-block max-w-full truncate">
                {avgM != null ? formatAvgMonthlyMagazzinoIt(avgM) : "—"}
              </span>
            </OptionalTooltip>
          </td>
          <td className={gestionaleListTableTdAzioni}>
            <div className={gestionaleListTableActionsGroupEnd}>
              <IconActionButton label="Info" className={dsTableActionBtnInfo} onClick={() => openInfo(p)}>
                <IconInfoMagazzino />
              </IconActionButton>
              <MagazzinoScortaAdjustActions
                canAdjust={magCanCreateRicambio}
                modalitaModifica={modalitaModifica}
                onDecrease={() => adjustScorta(p.id, -1)}
                onIncrease={() => adjustScorta(p.id, 1)}
              />
            </div>
          </td>
        </tr>
      );
    },
    [
      pagedMagazzino,
      consumoMap,
      compatModelsDisplayFor,
      magCanCreateRicambio,
      modalitaModifica,
      selectedRicambioIds,
      labelMode,
    ],
  );

  const magazzinoMenuItems = useMemo((): PageActionItem[] => {
    const items: PageActionItem[] = [
      ...importExportActions.items,
      ...(importExportActions.items.length > 0 ? [{ id: "__divider__", label: "" }] : []),
      pageActionLogItem(() => setLogOpen(true), "Log attività"),
    ];
    if (magCanDeleteRicambio && generatedListinoCount > 0) {
      items.push({
        id: "delete-listino",
        label: "Elimina ricambi da listino",
        description: `${generatedListinoCount} ricambi generati dal listino`,
        icon: <PageActionIconDelete />,
        onSelect: () => setDeleteGeneratedOpen(true),
        danger: true,
      });
    }
    return items;
  }, [
    importExportActions.items,
    magCanDeleteRicambio,
    generatedListinoCount,
  ]);

  const magazzinoMenuHeaderActions = useMemo(
    () => (
      <MagazzinoGiacenzaBell
        count={sottoScortaTotale}
        items={sottoScortaList}
        onSelectRicambio={(id) => focusRicambioInTable(id, { applySottoScorta: true })}
        triggerVariant="ghost"
      />
    ),
    [sottoScortaTotale, sottoScortaList, focusRicambioInTable],
  );

  return (
    <GestionaleSectionGate module="magazzino">
    {importExportActions.modal}
    <div
      ref={listLayoutRef}
      className={`magazzino-scroll-scope ${layoutPageRoot} ${listLayoutClassName}`.trim()}
    >
      <PageLayout
        title="Magazzino ricambi"
        actions={
          <PageActionMenu
            items={magazzinoMenuItems}
            headerActions={magazzinoMenuHeaderActions}
            onRefresh={() => void magazzinoListQ.refetch()}
            refreshBusy={magazzinoListQ.isFetching}
          />
        }
      >
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
            testId="page-ready-toolbar"
            primaryAction={
              <div className="flex shrink-0 flex-nowrap items-center gap-2">
                <button
                  type="button"
                  onClick={openNewModal}
                  disabled={!magCanCreateRicambio}
                  className={`${dsPageToolbarCtaCompact} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <PageToolbarCtaLabel short="+ Nuovo" full="+ Nuovo ricambio" />
                </button>
                <MagazzinoCarichiCaptureLauncher size="md" className="h-11 shrink-0" />
              </div>
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
                onFocusChange={setSearchFieldFocused}
                suggestionPool={searchSuggestionPool}
                aria-label="Cerca in magazzino"
                wrapperClassName="min-w-0 flex-1 sm:min-w-[12rem]"
              />
            }
            filtersExpanded={filtriEspansi}
            onFiltersToggle={() => setFiltriEspansi((o) => !o)}
            filtersActive={hasAdvancedPanelFilters || soloSottoScorta || nascondiScortaZero}
            filtersPanel={
              <GestionaleModalGate open={filtriEspansi}>
                <MagazzinoAdvancedFilterPanel
                  filters={advancedFilters}
                  onChange={patchAdvancedFilters}
                  catalog={filterCatalog}
                  soloSottoScorta={soloSottoScorta}
                  nascondiScortaZero={nascondiScortaZero}
                  onSoloSottoScortaChange={setSoloSottoScorta}
                  onNascondiScortaZeroChange={setNascondiScortaZero}
                />
              </GestionaleModalGate>
            }
            onFilterReset={resetMagazzinoFilters}
            meta={
              <div className="flex min-w-0 w-full max-w-full flex-nowrap items-center gap-1.5 sm:flex-1 sm:gap-2">
                <PageToolbarResultCount
                  className="max-sm:shrink-0 max-sm:flex-none"
                  count={filteredSorted.length}
                  filtersActive={hasAdvancedPanelFilters || soloSottoScorta || nascondiScortaZero}
                  searchActive={searchApplied.trim().length > 0 || searchInput.trim().length > 0}
                  onSearchReset={resetMagazzinoRicerca}
                  onFilterReset={resetMagazzinoFilters}
                />
                {magCanCreateRicambio ? (
                  <PageToolbarMetaToggle
                    className="min-w-0 max-sm:min-h-11 max-sm:flex-1 max-sm:justify-center max-sm:px-3 sm:shrink-0 max-sm:[&_span[aria-hidden]]:hidden"
                    label="Modalità modifica"
                    shortLabel="Modifica"
                    checked={modalitaModifica}
                    onChange={(next) => {
                      setModalitaModifica(next);
                      writeMagazzinoModalitaModifica(next);
                    }}
                    title={
                      modalitaModifica
                        ? "Attiva: le variazioni scorta contano nelle statistiche"
                        : "Disattiva: rettifica inventario senza impatto su statistiche e report"
                    }
                  />
                ) : null}
                {magPerm.canRead ? (
                  <PageToolbarMetaToggle
                    className="min-w-0 max-sm:min-h-11 max-sm:flex-1 max-sm:justify-center max-sm:px-3 sm:shrink-0 max-sm:[&_span[aria-hidden]]:hidden"
                    label="Etichette"
                    checked={labelMode}
                    onChange={(checked) => {
                      setLabelMode(checked);
                      if (!checked) setSelectedRicambioIds(new Set());
                    }}
                    title={
                      labelMode
                        ? "Modalità selezione attiva per stampa etichette"
                        : "Seleziona ricambi per stampare etichette"
                    }
                  />
                ) : null}
              </div>
            }
          />
        </section>

        {labelMode ? (
          <MagazzinoBulkLabelToolbar
            selectedIds={selectedRicambioIds}
            onClearSelection={() => setSelectedRicambioIds(new Set())}
          />
        ) : null}

        <SkeletonBoundary loading={magazzinoInitialLoading}>
        <MagazzinoTableSection mode="content">
        {listLayout === "desktop" ? (
        <GestionaleListTable
          visibilityClass={`mt-4 ${GESTIONALE_LIST_DESKTOP_ONLY_CLASS}`}
          colgroup={
            <>
              {labelMode ? <col className="w-10" /> : null}
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
              {labelMode ? (
                <th className="w-10 px-2 text-center" scope="col">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-zinc-300"
                    checked={
                      pagedMagazzino.length > 0 && pagedMagazzino.every((p) => selectedRicambioIds.has(p.id))
                    }
                    onChange={toggleSelectAllVisible}
                    aria-label="Seleziona tutti in pagina"
                  />
                </th>
              ) : null}
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
          colSpan={labelMode ? 11 : 10}
          virtualRows={{
            rowCount: pagedMagazzino.length,
            renderRow: renderMagazzinoDesktopRow,
            estimateRowHeight: 72,
          }}
        >
          {null}
        </GestionaleListTable>
        ) : null}

        {listLayout === "mobile" ? (
        <div className={`mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 ${GESTIONALE_LIST_MOBILE_ONLY_CLASS}`}>
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
                className={
                  flash
                    ? "min-w-0 h-full !p-3 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--cab-primary)_45%,transparent)] ring-2 ring-[color:color-mix(in_srgb,var(--cab-primary)_35%,transparent)]"
                    : "min-w-0 h-full !p-3"
                }
              >
                {labelMode ? (
                  <div className="mb-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 shrink-0 rounded border-zinc-300"
                      checked={selectedRicambioIds.has(p.id)}
                      onChange={() => toggleRicambioSelected(p.id)}
                      aria-label={`Seleziona ${p.codiceFornitoreOriginale}`}
                    />
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
                      Etichetta
                    </span>
                  </div>
                ) : null}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    {!isMagazzinoMobilePlaceholderValue(p.marca) ? (
                      <MagazzinoMarcaMobileBadge marca={p.marca} magazzinoMaster={appSettings?.magazzinoMaster} />
                    ) : null}
                    <p className="line-clamp-2 text-base font-semibold leading-snug tracking-tight text-[color:var(--cab-text)]">
                      {p.descrizione.trim() || "—"}
                    </p>
                    {!isMagazzinoMobilePlaceholderValue(p.codiceFornitoreOriginale) ? (
                      <div className="flex items-start gap-1.5">
                        <p className="min-w-0 flex-1 break-all font-mono text-sm font-medium tabular-nums tracking-wide text-[color:var(--cab-text)]">
                          {p.codiceFornitoreOriginale.trim()}
                        </p>
                        <MagazzinoListinoAiBadge listinoImport={p.listinoImport} variant="mobile" />
                      </div>
                    ) : (
                      <MagazzinoListinoAiBadge listinoImport={p.listinoImport} variant="mobile" />
                    )}
                    {p.codiceFornitoreOriginaleSecondario.trim() ? (
                      <p className="break-all font-mono text-xs font-medium tabular-nums tracking-wide text-zinc-500 dark:text-zinc-400">
                        {p.codiceFornitoreOriginaleSecondario}
                      </p>
                    ) : null}
                  </div>
                  <Tooltip content={low ? "Sotto scorta minima" : "Giacenza"} side="top">
                    <MagazzinoScortaBadge value={p.scorta} low={low} variant="mobile" />
                  </Tooltip>
                </div>
                <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
                  {compatModelsDisplayFor(p)}
                </p>
                <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px]">
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
                      <OptionalTooltip content={magazzinoConsumoMedioTooltip(consumoRow, avgM)}>
                        <span className="inline-block max-w-full truncate">
                          {avgM != null ? formatAvgMonthlyMagazzinoIt(avgM) : "—"}
                        </span>
                      </OptionalTooltip>
                    </dd>
                  </div>
                </dl>
                <div className="mt-auto flex w-full min-w-0 shrink-0 items-end justify-between gap-2 border-t border-zinc-200/90 pt-2.5 dark:border-zinc-700/80">
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
                  <div
                    className={`${gestionaleListTableActionsGroupEnd} shrink-0 flex-nowrap`}
                    role="group"
                    aria-label="Azioni"
                  >
                  <IconActionButton label="Info" className={dsTableActionBtnInfo} onClick={() => openInfo(p)}>
                    <IconInfoMagazzino />
                  </IconActionButton>
                  <MagazzinoScortaAdjustActions
                    canAdjust={magCanCreateRicambio}
                    modalitaModifica={modalitaModifica}
                    onDecrease={() => adjustScorta(p.id, -1)}
                    onIncrease={() => adjustScorta(p.id, 1)}
                  />
                  </div>
                </div>
              </CardMobile>
            );
          })}
        </div>
        ) : null}
        {showPager ? (
          <TablePagination page={page} pageCount={pageCount} onPageChange={setPage} label={label} />
        ) : null}
        </MagazzinoTableSection>
        </SkeletonBoundary>
      </ShellCard>
      </PageLayout>

      {newOpen ? (
        <RicambioNewModal
          marche={marche}
          categorie={categorie}
          fornitori={fornitoriGlobal}
          produttori={produttoriGlobal}
          mezziListePrefs={mezziListePrefs}
          authorName={authorName}
          prodotti={prodotti}
          magCanCreateRicambio={magCanCreateRicambio}
          onClose={closeNewRicambioModal}
          onSaveError={(message) => toastError(message)}
          onVaiAlRicambioDuplicato={(id) => focusRicambioInTable(id)}
          onSaved={(ui) => {
            registerOrderIndex(ui.id);
            patchProdotti((prev) => [ui, ...prev]);
            completeMagazzinoSave(ui.id, "Ricambio creato in magazzino.", "entity_created");
          }}
        />
      ) : null}

      {detail && detailRicambio && detail.mode === "info" ? (
        <MagazzinoRicambioInfoModal
          ricambio={detailRicambio}
          compatDisplay={compatDisplayFor(detailRicambio)}
          consumo={consumoMap.get(detailRicambio.id)}
          formatEur={eur}
          magCanCreateRicambio={magCanCreateRicambio}
          magCanReadRicambio={magPerm.canRead}
          logTimeline={infoTimeline}
          logLoading={magLogFeedLoading}
          onClose={closeDetail}
          onEdit={startEditFromInfo}
          onImageEvent={(ev) => logImageEvent(ev, detailRicambio)}
          onDismissLogEntry={removeMagazzinoLogEntry}
          canAdjustScorta={magCanCreateRicambio}
          modalitaModifica={modalitaModifica}
          onAdjustScorta={(delta) => adjustScorta(detailRicambio.id, delta)}
        />
      ) : null}

      {detail && detailRicambio && detail.mode === "edit" ? (
        <RicambioEditModal
          ricambioId={detail.id}
          ricambio={detailRicambio}
          mezziListePrefs={mezziListePrefs}
          marche={marche}
          categorie={categorie}
          fornitori={fornitoriGlobal}
          produttori={produttoriGlobal}
          authorName={authorName}
          magCanCreateRicambio={magCanCreateRicambio}
          magCanDeleteRicambio={magCanDeleteRicambio}
          onClose={closeDetail}
          onCancel={cancelEditBackToInfo}
          onRequestDelete={requestEliminaRicambio}
          onSaveError={(message) => toastError(message)}
          modalitaModifica={modalitaModifica}
          onSaved={(ui, message) => {
            patchProdotti((prev) => prev.map((p) => (p.id === ui.id ? touch(ui) : p)));
            completeMagazzinoSave(ui.id, message);
          }}
          onImageEvent={(ev) => logImageEvent(ev, detailRicambio)}
        />
      ) : null}

      <GestionaleModalGate open={logOpen}>
        <MagazzinoLogDrawer
          open={logOpen}
          onClose={() => setLogOpen(false)}
          feed={magLogFeed}
          loading={magLogFeedLoading}
          pagedFeed={pagedMagLogFeed}
          showPager={showMagLogDrawerPager}
          page={magLogDrawerPage}
          pageCount={magLogDrawerPageCount}
          pagerLabel={magLogDrawerPagerLabel}
          onPageChange={setMagLogDrawerPage}
          onFocusRicambio={focusRicambioInTable}
          onDismissLocal={removeMagazzinoLogEntry}
        />
      </GestionaleModalGate>

      {dupCheckModalOpen ? (
        <MagazzinoDupCodesModal
          groups={archivioDupCodeGroups}
          onClose={() => setDupCheckModalOpen(false)}
          onOpenRicambio={(id) => focusRicambioInTable(id)}
        />
      ) : null}
      <SettingsEliminaConfirmDialog
        open={deleteGeneratedOpen}
        pending={deleteGeneratedLoading}
        itemLabel={`${generatedListinoCount} ricambi generati da listino`}
        detail="Verranno eliminati solo i ricambi creati automaticamente da import listino, esclusi quelli con movimenti collegati."
        onCancel={() => setDeleteGeneratedOpen(false)}
        onConfirm={() => void executeDeleteGeneratedListinoRicambi()}
      />
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
