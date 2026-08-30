"use client";

import "@/components/gestionale/lavorazioni/lavorazioni-scroll.css";
import "./magazzino-scroll.css";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGestionaleSyncScope } from "@/src/hooks/gestionale/use-gestionale-sync-scope";
import { useUIAutonomyFixEngine } from "@/lib/ui-autonomy-fix/use-ui-autonomy-fix-engine";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { deferredRouterReplace } from "@/lib/navigation/deferred-app-router";
import {
  CardMobile,
  IconActionButton,
  LoadingFormSkeleton,
  SkeletonBoundary,
} from "@/components/design-system";
import { PageHeaderPageActionMenu } from "@/components/gestionale/page-header-actions-portal";
import { Tooltip } from "@/components/ui";
import { MagazzinoBulkLabelToolbar } from "@/components/gestionale/magazzino/magazzino-bulk-label-toolbar";
import { MagazzinoLabelQtyStepper } from "@/components/gestionale/magazzino/magazzino-label-qty-stepper";
import { useLabelSelection } from "@/lib/inventory-labels/client/label-selection";
import { MagazzinoScortaDisplayBadge } from "@/components/gestionale/magazzino/magazzino-scorta-display-cell";
import { MagazzinoScortaAdjustActionsCell } from "@/components/gestionale/magazzino/magazzino-scorta-adjust-actions-cell";
import { MagazzinoDebouncedScortaProvider } from "@/components/gestionale/magazzino/magazzino-debounced-scorta-context";
import { MagazzinoScortaBadge } from "@/components/gestionale/magazzino/magazzino-scorta-badge";
import { MagazzinoListinoAiBadge } from "@/components/gestionale/magazzino/magazzino-listino-ai-badge";
import { MagazzinoMarcaMobileBadge } from "@/components/gestionale/magazzino/magazzino-marca-mobile-badge";
import dynamic from "next/dynamic";
import { GestionaleModalGate } from "@/components/gestionale/gestionale-modal-gate";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";

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
const MagazzinoManualLabelModal = dynamic(
  () =>
    import("@/components/gestionale/magazzino/magazzino-manual-label-modal").then(
      (m) => m.MagazzinoManualLabelModal,
    ),
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
  { ssr: false },
);
const MagazzinoLogDrawer = dynamic(
  () => import("@/components/gestionale/magazzino/magazzino-log-drawer").then((m) => m.MagazzinoLogDrawer),
  { ssr: false },
);
import { magazzinoEntry } from "@/lib/domain/magazzino-entry";
import { useMagazzinoListQuery, useMagazzinoRicambiUIQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { GestionaleListSearchController } from "@/components/gestionale/gestionale-list-search-controller";
import { useGestionaleDirtySearchHint } from "@/src/hooks/gestionale/use-gestionale-dirty-search-hint";
import { usesServerSearch } from "@/lib/search/registry";
import type { MagazzinoFilters } from "@/src/services/magazzino.service";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateAfterMagazzinoOrMovimenti } from "@/src/lib/react-query/invalidate-related";
import { cabSyncEventForEntity } from "@/lib/sync/gestionale-sync-dispatch";
import { patchMagazzinoListCache, magazzinoListQueryKey } from "@/lib/magazzino/magazzino-list-cache";
import { suppressSettingsRemoteNotify } from "@/lib/sistema/settings-remote-notify-guard";
import { flattenCompatDaAttrezzature, migrateMezziListePrefs } from "@/lib/mezzi/attrezzature-prefs";
import { createMezziListePrefsDefault } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import { readCompatDisplayForUi, readCompatLabelsForUi, readCompatModelsDisplayForUi } from "@/lib/magazzino/compat/compat-read-guard";
import {
  compareByColumn,
  compareMagazzinoDefaultOrder,
  compareMagazzinoMobileDefaultOrder,
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
import { displayRicambioCodice, ricambioCodiceForUi } from "@/lib/magazzino/ricambio-codice";
import {
  dsPageToolbarCtaCompact,
  GESTIONALE_SEARCH_PLACEHOLDER,
  dsBtnSoftOrange,
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
  gestionaleListTableRowTone,
  gestionaleListTableRowToneFlash,
  gestionaleListTableRowToneLowStock,
  gestionaleListTableTd,
  gestionaleListTableTdAzioni,
  gestionaleListTableTdCenter,
  gestionaleListTableActionsGroupEnd,
  gestionaleMagazzinoDenseTableClass,
} from "@/lib/ui/gestionale-list-table";
import {
  magazzinoTableColAzioniClass,
  magazzinoTableColCategoriaClass,
  magazzinoTableColCodiceClass,
  magazzinoTableColCodiceTdClass,
  magazzinoTableColCodiceThClass,
  magazzinoTableColConsumoClass,
  magazzinoTableColDescrizioneClass,
  magazzinoTableColLabelQtyClass,
  magazzinoTableColMarcaClass,
  magazzinoTableColPrezzoClass,
  magazzinoTableColScortaClass,
  magazzinoTableColScortaMinClass,
  magazzinoTableColUltimaModClass,
} from "@/lib/magazzino/magazzino-table-columns";
import { MagazzinoDescrizioneSortTh } from "@/components/gestionale/magazzino/magazzino-descrizione-sort-th";
import { MagazzinoTableSection } from "@/components/gestionale/magazzino/magazzino-page-structure";
import {
  pageActionLogItem,
  type PageActionItem,
} from "@/components/ui";
import {
  PageActionIconDelete,
  PageActionIconLabels,
} from "@/components/ui/page-action-menu/page-action-menu-icons";
import { ShellCard } from "@/components/gestionale/shell-card";
import { TablePagination } from "@/components/gestionale/table-pagination";
import {
  PageToolbar,
  PageToolbarCtaLabel,
  PageToolbarResultCount,
  PageToolbarMetaToggle,
} from "@/components/design-system";
import { MagazzinoGiacenzaBell } from "@/components/gestionale/magazzino/magazzino-giacenza-bell";
import { useRbac } from "@/src/hooks/use-rbac";
import { IconNavIdentificaRicambio } from "@/src/lib/permissions/gestionale-page-icons";
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
import { matchSearchStringPreparedFromRaw } from "@/lib/search/match";
import { scoreSearchDocumentWithPrepared } from "@/lib/search/rank";
import {
  isSearchRelevanceSortActive,
  compareSearchRelevanceWithScoreMap,
  buildSearchRelevanceScoreMap,
} from "@/lib/search/sort-by-relevance";
import {
  buildMagazzinoHaystackIndex,
  magazzinoRowMatchesPageFiltersIndexed,
  magazzinoRowSearchHaystack,
} from "@/lib/magazzino/magazzino-filter-search-index";
import {
  buildMagazzinoSearchSuggestions,
  magazzinoSearchQueryFromSuggestion,
  type MagazzinoPageFilters,
} from "@/lib/magazzino/magazzino-list-ui-filters";
import {
  buildMagazzinoLocalLogEntry,
  buildMagazzinoScortaPersistedLogEntry,
} from "@/lib/magazzino/magazzino-log-events";
import { seedStockEntitiesFromRows } from "@/lib/magazzino/stock-entity-cache";
import { hydrateJournalFromSession } from "@/lib/magazzino/stock-client-store";
import { mergeStockEntity } from "@/lib/magazzino/stock-entity-cache";
import { stockVoidMovementFetch } from "@/lib/magazzino/stock-void-movement-client";
import {
  migrateMagazzinoModalitaModificaPreferenceV2,
  readMagazzinoModalitaModifica,
  writeMagazzinoModalitaModifica,
} from "@/lib/magazzino/magazzino-modalita-modifica-storage";
import { revealRicambioInTableAfterSave } from "@/lib/magazzino/magazzino-table-focus";
import { GestionaleSectionGate } from "@/components/gestionale/gestionale-section-gate";
import { MagazzinoCarichiCaptureLauncher } from "@/components/gestionale/magazzino/carichi/magazzino-carichi-capture-launcher";
import { layoutPageRoot } from "@/lib/ui/responsive-layout-core";
import { SettingsEliminaConfirmDialog } from "@/components/dashboard/settings-elimina-confirm-dialog";
import { useGestionaleConfirm } from "@/src/hooks/use-gestionale-confirm";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { useMagazzinoLogFeed } from "@/lib/magazzino/use-magazzino-log-feed";
import { enrichRicambiMagazzinoUltimaModifica } from "@/lib/magazzino/magazzino-ultima-modifica";
import { useMagazzinoListDerived } from "@/lib/magazzino/use-magazzino-list-derived";
import { useMagazzinoSecondaryQueryGate } from "@/lib/magazzino/use-magazzino-secondary-query-gate";
import { useAuth } from "@/context/auth-context";
import {
  collapsibleExpandedBoolPref,
  useCollapsiblePreference,
} from "@/lib/ui/collapsible-prefs";
import { clientPaginationPageForIndex, useClientPagination } from "@/lib/ui/use-client-pagination";
import { gestionaleListTierClass } from "@/lib/ui/gestionale-list-responsive";
import type { GestionaleListPageProps } from "@/lib/ui/gestionale-list-page-props";
import { useListSurface } from "@/lib/ui/use-list-surface";
import { useResponsiveListPageSize } from "@/lib/ui/use-responsive-list-page-size";
import { CAB_SETTINGS_KEY, CAB_SETTINGS_MODULE } from "@/src/lib/app-settings/keys";
import { useCompatMezziListe } from "@/src/hooks/use-compat-mezzi-liste";
import { useCabAppSettingsPayloadQuery, useMagazzinoSettingsUpsertMutation } from "@/src/hooks/gestionale/use-settings-queries";
import { usePermissionsSnapshot } from "@/src/hooks/use-permissions";
import { Q_FOCUS_RICAMBIO, Q_OPEN_RICAMBIO } from "@/lib/navigation/dashboard-log-links";
import { useAdminNotificationStore } from "@/src/hooks/gestionale/use-admin-notification-store";
import { deleteGeneratedListinoRicambiRequest } from "@/lib/magazzino/listino-import/listino-import-client";

function eur(n: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
}

function initialMasterFromProducts(
  rows: RicambioMagazzino[],
  mezziListe?: import("@/lib/mezzi/mezzi-liste-prefs-storage").MezziListePrefs,
  compatReadOpts?: import("@/lib/magazzino/compat/compat-read-guard").CompatReadOpts,
) {
  const marche = new Set<string>();
  const categorie = new Set<string>();
  const mezzi = new Set<string>();
  for (const r of rows) {
    marche.add(r.marca);
    categorie.add(r.categoria);
    readCompatLabelsForUi(r, mezziListe, "magazzino-view.initialMasterFromProducts", compatReadOpts).forEach((m) => mezzi.add(m));
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

function mergeMasterWithRows(master: string[], rowValues: string[]) {
  const s = new Set([...master, ...rowValues]);
  return [...s].sort((a, b) => a.localeCompare(b, "it"));
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

type CampoChange = { campo: string; prima: string; dopo: string };

type MagazzinoLogTipo = "aggiunta" | "update" | "rimozione";

type MagazzinoLogEntry = MagazzinoChangeLogEntry;

/** Stile interazioni ERP uniforme (hover / active / ring) */
const erpBtnSoftOrange = dsBtnSoftOrange;
function IconInfoMagazzino({ className = dsTableActionGlyph }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" d="M12 10.5V16M12 8.2v-.1" />
    </svg>
  );
}

const RICAMBIO_CODICE_BADGE_CLASS =
  "inline-flex max-w-full flex-col break-all rounded-md bg-zinc-100 px-2 py-1 font-mono text-xs font-semibold leading-snug tracking-wide dark:bg-zinc-800";

function RicambioCodiceCell({ p }: { p: RicambioMagazzino }) {
  const primary = displayRicambioCodice(p.codiceFornitoreOriginale);
  const secondary = p.codiceFornitoreOriginaleSecondario.trim();
  return (
    <div className="flex items-start gap-1">
      <div className="min-w-0 flex-1">
        <span className={RICAMBIO_CODICE_BADGE_CLASS}>
          <span>{primary}</span>
          {secondary ? <span>{secondary}</span> : null}
        </span>
      </div>
      <MagazzinoListinoAiBadge listinoImport={p.listinoImport} />
    </div>
  );
}

export function MagazzinoView({ listSurface: serverListSurface, listTier = "xl" }: GestionaleListPageProps) {
  const listSurface = useListSurface(serverListSurface);
  useGestionaleSyncScope({
    scopeId: "magazzino-view",
    domain: "magazzino",
    route: "/magazzino",
    tables: ["magazzino_ricambi", "movimenti_ricambi", "log_modifiche", "ordini_fornitori"],
  });

  const { authorName, user } = useAuth();

  function magazzinoLogScopeFields(): Pick<MagazzinoLogEntry, "autoreUserId"> {
    return { autoreUserId: user?.id };
  }
  const settingsPayload = useCabAppSettingsPayloadQuery({ tier: "static" });
  const appSettings = settingsPayload.data?.resolved;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- lint phase2: stable hook contract
  const settingsRows = settingsPayload.data?.rows ?? [];
  const stockPolicyRaw = useMemo(
    () => settingsRows.find((r) => r.module === "magazzino" && r.key === "stock_policy")?.value,
    [settingsRows],
  );
  const { canAccessPage } = useRbac();
  const { global: globalPerm, modules: permModules } = usePermissionsSnapshot();
  const magPerm = permModules.magazzino;
  const { clearMagazzinoNotifications } = useAdminNotificationStore();
  /** Creazione ricambio: `can_write` o `can_admin` sul modulo (viewer resta escluso). */
  const magCanCreateRicambio = magPerm.canWrite || globalPerm.isAdmin;
  const magCanDeleteRicambio = magPerm.canWrite;
  const upsertMagazzinoMaster = useMagazzinoSettingsUpsertMutation();
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
  const [undoStockPending, setUndoStockPending] = useState(false);
  const [searchApplied, setSearchApplied] = useState("");
  const [searchClearSignal, setSearchClearSignal] = useState(0);
  const [suggestionQuery, setSuggestionQuery] = useState("");
  const onSearchAppliedChange = useCallback((q: string) => setSearchApplied(q), []);
  const onDebouncedInputChange = useCallback((q: string) => setSuggestionQuery(q), []);
  const { hint: dirtySearchHint } = useGestionaleDirtySearchHint();
  const magazzinoFetchFilters = useMemo((): MagazzinoFilters | undefined => {
    if (!usesServerSearch("magazzino") || !searchApplied.trim()) return undefined;
    return { search: searchApplied.trim() };
  }, [searchApplied]);
  const rawMagazzinoListQ = useMagazzinoListQuery(magazzinoFetchFilters);
  const magazzinoListQ = useMagazzinoRicambiUIQuery(magazzinoFetchFilters);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- lint phase2: stable hook contract
  const prodotti = magazzinoListQ.data ?? [];

  useEffect(() => {
    hydrateJournalFromSession();
    const rows = queryClient.getQueryData<import("@/src/types/supabase-tables").MagazzinoRicambioRow[]>(
      magazzinoListQueryKey(),
    );
    if (rows?.length) seedStockEntitiesFromRows(queryClient, rows);
  }, [prodotti, queryClient]);
  const [deleteGeneratedOpen, setDeleteGeneratedOpen] = useState(false);
  const [deleteGeneratedLoading, setDeleteGeneratedLoading] = useState(false);
  const magazzinoInitialLoading = rawMagazzinoListQ.isLoading && rawMagazzinoListQ.data === undefined;
  const [searchFieldFocused, setSearchFieldFocused] = useState(false);
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
    onImportCompleted: () => {
      void invalidateAfterMagazzinoOrMovimenti(queryClient);
      void magazzinoListQ.refetch();
    },
  });

  const patchAdvancedFilters = useCallback((patch: Partial<MagazzinoAdvancedFilters>) => {
    setAdvancedFilters((prev) => {
      const next = { ...prev, ...patch };
      saveMagazzinoAdvancedFiltersPersisted(next);
      return next;
    });
  }, []);

  const [masterMarche, setMasterMarche] = useState<string[]>([]);
  const [masterCategorie, setMasterCategorie] = useState<string[]>([]);
  const [masterMezzi, setMasterMezzi] = useState<string[]>([]);
  const [masterFornitori, setMasterFornitori] = useState<string[]>([]);
  const [masterPrefsHydrated, setMasterPrefsHydrated] = useState(false);
  const lastMergedSigRef = useRef<string>("");
  const { mezziListe, mezziListePrefs } = useCompatMezziListe("MagazzinoView");
  const compatReadOpts = useMemo(() => ({ prefsListe: mezziListePrefs }), [mezziListePrefs]);
  const listDerived = useMagazzinoListDerived(prodotti, mezziListe);
  const {
    sottoScortaList,
    sottoScortaTotale,
    generatedListinoCount,
    marcheFromRows,
    categorieFromRows,
    archivioDupCodeGroups,
    archivioDupCodeCount,
  } = listDerived;

  const [newOpen, setNewOpen] = useState(false);
  const [modalChunkMountedKey, setModalChunkMountedKey] = useState<string | null>(null);
  const { success: toastSuccess, error: toastError, validation: toastValidation, successDeleted } =
    useGestionaleToast();
  const { confirmDialog } = useGestionaleConfirm();
  const [eliminaRicambioTarget, setEliminaRicambioTarget] = useState<RicambioMagazzino | null>(null);
  const [dupCheckModalOpen, setDupCheckModalOpen] = useState(false);

  const [detail, setDetail] = useState<{ id: string; mode: "info" | "edit" } | null>(null);
  const { selection: labelSelection, setQuantity: setLabelQuantity, clearAll: clearLabelQuantities } =
    useLabelSelection();
  const [labelMode, setLabelMode] = useState(false);
  const [manualLabelOpen, setManualLabelOpen] = useState(false);
  const [modalitaModifica, setModalitaModifica] = useState(true);
  useEffect(() => {
    migrateMagazzinoModalitaModificaPreferenceV2();
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
  const pendingLogRef = useRef<{
    ricambioId: string;
    ricambioLabel: string;
    autore: string;
    changes: Map<string, { prima: string; dopo: string }>;
    timer: ReturnType<typeof setTimeout> | null;
  } | null>(null);

  const [logEntries, setLogEntries] = useState<MagazzinoLogEntry[]>([]);
  const [, setLogPersistReady] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  const listPageSize = useResponsiveListPageSize();
  listPageSizeRef.current = listPageSize;

  const secondaryEnabled = useMagazzinoSecondaryQueryGate({
    force: logOpen || detail?.mode === "info",
  });

  const {
    feed: magLogFeed,
    timelineByRicambio: magLogTimelineByRicambio,
    ultimaModificaByRicambioId,
    isLoading: magLogFeedLoading,
    isLocalId: isMagLogLocalId,
  } = useMagazzinoLogFeed({
    localEntries: logEntries,
    prodotti,
    authorName,
    userId: user?.id ?? null,
    enabled: secondaryEnabled,
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- lint phase2: stable hook contract
    [magLogFeed, sliceMagLogFeed, magLogDrawerPage],
  );

  useEffect(() => {
    const mapped = magazzinoListQ.data ?? [];
    const order = new Map<string, number>();
    mapped.forEach((r, i) => order.set(r.id, i));
    orderMapRef.current = order;
    nextOrderRef.current = mapped.length;
  }, [magazzinoListQ.data]);

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
      setSearchClearSignal((n) => n + 1);
      setSuggestionQuery("");
      setLogOpen(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.setTimeout(() => {
            const rows = filteredSortedRef.current;
            const ps = Math.max(1, listPageSizeRef.current);
            const idx = rows.findIndex((p) => p.id === ricambioId);
            if (idx >= 0) {
              setMagazzinoPageRef.current(clientPaginationPageForIndex(idx, ps));
            } else {
              setMagazzinoPageRef.current(1);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- lint phase2: stable hook contract
    [flashRow],
  );

  useEffect(() => {
    const id = searchParams.get(Q_FOCUS_RICAMBIO);
    if (!id) return;
    const t = window.setTimeout(() => {
      focusRicambioInTable(id);
      deferredRouterReplace(router, pathname, { scroll: false });
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
      deferredRouterReplace(router, pathname, { scroll: false });
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
      patchMagazzinoListCache(queryClient, updater, mezziListe);
    },
    [queryClient, mezziListe],
  );

  const prodottiPerTabella = useMemo(
    () => enrichRicambiMagazzinoUltimaModifica(prodotti, ultimaModificaByRicambioId),
    [prodotti, ultimaModificaByRicambioId],
  );

  useEffect(() => {
    const raw = { mag: appSettings?.magazzinoMaster, liste: appSettings?.mezziListe };
    const sig = JSON.stringify(raw);
    if (sig === lastMergedSigRef.current) return;
    lastMergedSigRef.current = sig;

    const src = prodotti;
    const fromP = initialMasterFromProducts(src, mezziListe, compatReadOpts);
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
  }, [appSettings, prodotti, mezziListe, compatReadOpts]);

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
      const mergedMarche = mergeMasterWithRows(serverVal.marche ?? [], masterMarche);
      const mergedCategorie = mergeMasterWithRows(serverVal.categorie ?? [], masterCategorie);
      const mergedMezzi = mergeMasterWithRows(serverVal.mezziCompatibili ?? [], masterMezzi);
      const mergedFornitori = mergeMasterWithRows(serverVal.fornitori ?? [], masterFornitori);
      const serverSig = JSON.stringify({
        marche: serverVal.marche ?? [],
        categorie: serverVal.categorie ?? [],
        mezziCompatibili: serverVal.mezziCompatibili ?? [],
        fornitori: serverVal.fornitori ?? [],
      });
      const mergedSig = JSON.stringify({
        marche: mergedMarche,
        categorie: mergedCategorie,
        mezziCompatibili: mergedMezzi,
        fornitori: mergedFornitori,
      });
      if (mergedSig === serverSig) {
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
            marche: mergedMarche,
            categorie: mergedCategorie,
            mezziCompatibili: mergedMezzi,
            fornitori: mergedFornitori,
          },
        })
        .then(() => {
          lastSyncedMagMasterSigRef.current = mergedSig;
        })
        .catch(() => {
          /* toast OCC già in useSettingsUpsertMutation */
        });
    }, 900);
    return () => {
      if (magMasterSaveTimer.current) clearTimeout(magMasterSaveTimer.current);
    };
  }, [masterPrefsHydrated, magPerm.canWrite, magMasterPayloadSig, masterMarche, masterCategorie, masterMezzi, masterFornitori, upsertMagazzinoMaster]);


  useEffect(() => {
    setLogPersistReady(true);
  }, []);

  /** Elenchi globali puri (`Impostazioni ÔåÆ Magazzino`) — SSOT per selettori e validazione form. */
  const marcheGlobal = useMemo(
    () => appSettings?.magazzinoMaster?.marche ?? [],
    [appSettings?.magazzinoMaster?.marche],
  );
  const categorieGlobal = useMemo(
    () => appSettings?.magazzinoMaster?.categorie ?? [],
    [appSettings?.magazzinoMaster?.categorie],
  );
  const fornitoriGlobal = useMemo(
    () => appSettings?.magazzinoMaster?.fornitori ?? [],
    [appSettings?.magazzinoMaster?.fornitori],
  );
  const produttoriGlobal = useMemo(
    () => appSettings?.magazzinoMaster?.produttori ?? [],
    [appSettings?.magazzinoMaster?.produttori],
  );

  const marche = useMemo(
    () => mergeMasterWithRows(mergeMasterWithRows(marcheGlobal, masterMarche), marcheFromRows),
    [marcheGlobal, masterMarche, marcheFromRows],
  );

  const categorie = useMemo(
    () => mergeMasterWithRows(mergeMasterWithRows(categorieGlobal, masterCategorie), categorieFromRows),
    [categorieGlobal, masterCategorie, categorieFromRows],
  );

  const needConsumoMap =
    !magazzinoInitialLoading &&
    (listSurface === "table" ||
      listSurface === "cards" ||
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
    () => buildMagazzinoFilterCatalog(prodotti, mezziListe, categorie, masterFornitori),
    [prodotti, mezziListe, categorie, masterFornitori],
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
    (row: RicambioMagazzino) =>
      readCompatDisplayForUi(row, mezziListe, "magazzino-view.compatDisplayFor", compatReadOpts),
    [mezziListe, compatReadOpts],
  );

  const compatModelsDisplayFor = useCallback(
    (row: RicambioMagazzino) =>
      readCompatModelsDisplayForUi(row, mezziListe, "magazzino-view.compatModelsDisplayFor", compatReadOpts),
    [mezziListe, compatReadOpts],
  );

  useEffect(() => {
    prodottiByIdRef.current = new Map(prodotti.map((p) => [p.id, p]));
  }, [prodotti]);

  const searchSuggestionPool = useMemo(() => {
    if (!searchFieldFocused) return [];
    if (!suggestionQuery.trim()) return [];
    return buildMagazzinoSearchSuggestions(prodotti, suggestionQuery, 8, mezziListe);
  }, [searchFieldFocused, suggestionQuery, prodotti, mezziListe]);

  const haystackIndex = useMemo(
    () => buildMagazzinoHaystackIndex(prodotti, mezziListe),
    [prodotti, mezziListe],
  );

  const serverSearchActive = usesServerSearch("magazzino") && searchApplied.trim().length > 0;

  const preparedSearch = useMemo(
    () => (searchApplied.trim() ? matchSearchStringPreparedFromRaw(searchApplied) : null),
    [searchApplied],
  );

  const filteredSorted = useMemo(() => {
    const orderMap = orderMapRef.current!;
    let rows = prodottiPerTabella.filter((p) =>
      magazzinoRowMatchesPageFiltersIndexed(p, pageFilters, haystackIndex, mezziListe, {
        skipSearchFilter: serverSearchActive,
        preparedSearch,
      }),
    );

    const relevanceActive = isSearchRelevanceSortActive(searchApplied, sortColumn);
    const scoreMap =
      relevanceActive && preparedSearch
        ? buildSearchRelevanceScoreMap(rows, (row) =>
            scoreSearchDocumentWithPrepared(
              preparedSearch,
              haystackIndex.get(row.id) ?? magazzinoRowSearchHaystack(row, mezziListe),
            ).score,
          )
        : null;

    rows = [...rows].sort((a, b) => {
      if (scoreMap) {
        const rel = compareSearchRelevanceWithScoreMap(a, b, scoreMap);
        if (rel !== 0) return rel;
      }
      if (sortPhase === "natural" || sortColumn === null) {
        if (listSurface === "cards") {
          return compareMagazzinoMobileDefaultOrder(a, b, orderMap, mezziListe);
        }
        return compareMagazzinoDefaultOrder(a, b, orderMap, mezziListe);
      }
      const primary = compareByColumn(a, b, sortColumn, sortPhase, consumoAvgById, mezziListe);
      if (primary !== 0) return primary;
      return compareNaturalOrder(a, b, orderMap);
    });

    return rows;
  }, [prodottiPerTabella, pageFilters, sortColumn, sortPhase, consumoAvgById, mezziListe, haystackIndex, listSurface, searchApplied, serverSearchActive, preparedSearch]);

  filteredSortedRef.current = filteredSorted;

  const { page, setPage, pageCount, sliceItems, showPager, label, resetPage } = useClientPagination(filteredSorted.length, listPageSize);

  useEffect(() => {
    setMagazzinoPageRef.current = setPage;
  }, [setPage]);

  useEffect(() => {
    resetPage();
  }, [searchApplied, advancedFilters, soloSottoScorta, nascondiScortaZero, sortColumn, sortPhase, listPageSize, resetPage]);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- lint phase2: stable hook contract
  const pagedMagazzino = useMemo(() => sliceItems(filteredSorted), [sliceItems, filteredSorted, page]);

  const magazzinoTableReadyMarked = useRef(false);
  useEffect(() => {
    if (magazzinoInitialLoading) return;
    if (magazzinoTableReadyMarked.current) return;
    magazzinoTableReadyMarked.current = true;
    try {
      performance.mark("magazzino-table-ready");
      performance.measure("magazzino-interactive", "navigationStart", "magazzino-table-ready");
    } catch {
      /* performance API unavailable */
    }
  }, [magazzinoInitialLoading]);

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

  const handleDebouncedScortaPersistLog = useCallback(
    (logId: string, ricambioId: string, ricambioLabel: string, prima: number, dopo: number) => {
      const entry = buildMagazzinoScortaPersistedLogEntry({
        id: logId,
        ricambioId,
        ricambioLabel,
        autore: authorName,
        prima,
        dopo,
        contaStatistiche: modalitaModifica,
        ...magazzinoLogScopeFields(),
      });
      applyLogEntry(entry);
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps -- lint phase2: stable hook contract
    [authorName, modalitaModifica],
  );

  const handleDebouncedScortaCommitSuccess = useCallback(
    (ricambioId: string) => {
      flashRow(ricambioId);
    },
    [flashRow],
  );

  const handleDebouncedScortaCommitError = useCallback(
    (error: string) => {
      toastError(error, { module: "magazzino", action: "update" });
    },
    [toastError],
  );

  const debouncedScortaContextValue = useMemo(
    () => ({
      contaStatistiche: modalitaModifica,
      canAdjust: magCanCreateRicambio,
      onPersistLog: handleDebouncedScortaPersistLog,
      onRemoveLog: removeMagazzinoLogEntry,
      onCommitSuccess: handleDebouncedScortaCommitSuccess,
      onCommitError: handleDebouncedScortaCommitError,
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps -- lint phase2: stable hook contract
    [
      modalitaModifica,
      magCanCreateRicambio,
      handleDebouncedScortaPersistLog,
      handleDebouncedScortaCommitSuccess,
      handleDebouncedScortaCommitError,
    ],
  );

  async function undoStockMovement(movimentoId: string) {
    if (!magCanCreateRicambio) return;
    setUndoStockPending(true);
    try {
      const result = await stockVoidMovementFetch(movimentoId);
      if (!result.ok) {
        toastError(result.error, { module: "magazzino", action: "update" });
        return;
      }
      mergeStockEntity(
        queryClient,
        {
          ricambioId: result.data.ricambioId,
          quantita: result.data.quantita,
          stockVersion: result.data.stockVersion,
          lastOperationId: null,
        },
        "mutation",
      );
      void invalidateAfterMagazzinoOrMovimenti(queryClient, [
        cabSyncEventForEntity("movimenti_ricambi", movimentoId, "entity_deleted", "movimenti_ricambi"),
        cabSyncEventForEntity("magazzino_ricambi", result.data.ricambioId, "entity_updated", "magazzino_ricambi"),
      ]);
      toastSuccess("Movimento annullato. Giacenza ripristinata.");
    } finally {
      setUndoStockPending(false);
    }
  }

  function openNewModal() {
    if (!magCanCreateRicambio) return;
    flushPendingLog();
    setDupCheckModalOpen(false);
    setNewOpen(true);
  }

  function closeNewRicambioModal() {
    setNewOpen(false);
    setModalChunkMountedKey(null);
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

  const detailRicambio = detail ? prodottiPerTabella.find((p) => p.id === detail.id) : undefined;

  function openInfo(p: RicambioMagazzino) {
    setDetail({ id: p.id, mode: "info" });
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps -- lint phase2: stable hook contract
  function setLabelQtyForRicambio(id: string, qty: number) {
    if (!labelMode) return;
    setLabelQuantity(id, qty);
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
    setModalChunkMountedKey(null);
  }

  const infoTimeline = useMemo(() => {
    if (!detailRicambio) return [];
    return magLogTimelineByRicambio[detailRicambio.id] ?? [];
  }, [detailRicambio, magLogTimelineByRicambio]);

  function resetMagazzinoRicerca() {
    setSearchClearSignal((n) => n + 1);
    setSuggestionQuery("");
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

  const renderMagazzinoDesktopRow = useCallback(
    (index: number) => {
      const p = pagedMagazzino[index];
      if (!p) return null;
      const consumoRow = consumoMap.get(p.id);
      const avgM = consumoRow?.avgMonthly ?? null;
      const low = p.scorta < p.scortaMinima;
      const stale = isModificaOlderThanMonths(p.dataUltimaModifica, MAGAZZINO_STALE_MODIFICA_MONTHS);
      const qty = labelSelection.quantities[p.id] ?? 0;
      const selected = qty > 0;
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
            <td className={`${gestionaleListTableTdCenter} ${magazzinoTableColLabelQtyClass}`}>
              <MagazzinoLabelQtyStepper
                value={qty}
                onChange={(next) => setLabelQtyForRicambio(p.id, next)}
                ariaLabel={ricambioCodiceForUi(p.codiceFornitoreOriginale) || p.descrizione}
              />
            </td>
          ) : null}
          <td className={`${magazzinoTableColCodiceTdClass} ${gestionaleListTableTd}`}>
            <RicambioCodiceCell p={p} />
          </td>
          <td className={`min-w-0 ${gestionaleListTableTd} ${magazzinoTableColMarcaClass}`}>
            {!isMagazzinoMobilePlaceholderValue(p.marca) ? (
              <MagazzinoMarcaMobileBadge
                marca={p.marca}
                magazzinoMaster={appSettings?.magazzinoMaster}
                variant="table"
              />
            ) : (
              <span className="text-[color:var(--cab-text-muted)]">—</span>
            )}
          </td>
          <td className={`min-w-0 ${gestionaleListTableTd} ${magazzinoTableColDescrizioneClass}`}>
            <div className="break-words font-medium leading-snug">{p.descrizione}</div>
            <div className="mt-0.5 break-words text-xs leading-snug text-zinc-500 dark:text-zinc-400">
              {compatModelsDisplayFor(p)}
            </div>
          </td>
          <td className={`min-w-0 ${gestionaleListTableTd} text-zinc-700 dark:text-zinc-300 ${magazzinoTableColCategoriaClass}`}>
            <span className="block truncate text-[13px] leading-snug">{p.categoria}</span>
          </td>
          <td className={`${gestionaleListTableTdCenter} ${magazzinoTableColScortaClass}`}>
            <MagazzinoScortaDisplayBadge
              ricambioId={p.id}
              ricambioLabel={p.descrizione}
              fallbackScorta={p.scorta}
              low={low}
              variant="table"
            />
          </td>
          <td className={`${gestionaleListTableTdCenter} !text-inherit ${magazzinoTableColScortaMinClass}`}>
            <div className="flex justify-center">
              <MagazzinoScortaBadge value={p.scortaMinima} kind="minima" variant="table" />
            </div>
          </td>
          <td className={`${gestionaleListTableTdCenter} ${magazzinoTableColUltimaModClass}`}>
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
          <td className={`${gestionaleListTableTdCenter} font-medium ${magazzinoTableColPrezzoClass}`}>{eur(p.prezzoVendita)}</td>
          <td className={`${gestionaleListTableTdCenter} text-[13px] text-zinc-700 dark:text-zinc-300 ${magazzinoTableColConsumoClass}`}>
            <span className="inline-block max-w-full truncate">
              {avgM != null ? formatAvgMonthlyMagazzinoIt(avgM) : "—"}
            </span>
          </td>
          <td className={gestionaleListTableTdAzioni}>
            <div
              className={`${gestionaleListTableActionsGroupEnd} min-w-0 max-w-full`}
              role="group"
              aria-label="Azioni ricambio"
            >
              <IconActionButton label="Info" className={dsTableActionBtnInfo} onClick={() => openInfo(p)}>
                <IconInfoMagazzino />
              </IconActionButton>
              <MagazzinoScortaAdjustActionsCell
                ricambioId={p.id}
                ricambioLabel={p.descrizione}
                fallbackScorta={p.scorta}
                canAdjust={magCanCreateRicambio}
                modalitaModifica={modalitaModifica}
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
      labelSelection.quantities,
      labelMode,
      setLabelQtyForRicambio,
      appSettings?.magazzinoMaster,
    ],
  );

  const magazzinoMenuItems = useMemo((): PageActionItem[] => {
    const items: PageActionItem[] = [
      ...importExportActions.items,
      ...(importExportActions.items.length > 0 ? [{ id: "__divider__", label: "" }] : []),
      pageActionLogItem(() => setLogOpen(true), "Log attività"),
    ];
    if (magPerm.canRead) {
      items.push({
        id: "manual-label",
        label: "Etichetta manuale",
        description: "Crea un'etichetta senza ricambio in magazzino",
        icon: <PageActionIconLabels />,
        onSelect: () => setManualLabelOpen(true),
      });
    }
    if (canAccessPage("/identifica-ricambio")) {
      items.push({
        id: "identifica-ricambio",
        label: "Identifica ricambio",
        description: "Ricerca assistita AI del codice ricambio",
        icon: <IconNavIdentificaRicambio className="h-5 w-5" />,
        onSelect: () => router.push("/identifica-ricambio"),
      });
    }
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
    magPerm.canRead,
    magCanDeleteRicambio,
    generatedListinoCount,
    canAccessPage,
    router,
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
    <MagazzinoDebouncedScortaProvider value={debouncedScortaContextValue}>
    {importExportActions.modal}
    <div className={`magazzino-scroll-scope ${layoutPageRoot} ${gestionaleListTierClass(listTier)}`.trim()}>
      <PageHeaderPageActionMenu
        items={magazzinoMenuItems}
        headerActions={magazzinoMenuHeaderActions}
      />
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
            mobilePrimaryThreeColumn
            primaryAction={
              <div className="contents sm:flex sm:shrink-0 sm:flex-nowrap sm:items-center sm:gap-2">
                <button
                  type="button"
                  onClick={openNewModal}
                  disabled={!magCanCreateRicambio}
                  className={`${dsPageToolbarCtaCompact} w-full min-w-0 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:shrink-0`}
                >
                  <PageToolbarCtaLabel short="+ Nuovo" full="+ Nuovo ricambio" mobileNoTruncate />
                </button>
                <MagazzinoCarichiCaptureLauncher size="md" className="h-11 w-full min-w-0 sm:w-auto sm:shrink-0" />
              </div>
            }
            search={
              <GestionaleListSearchController
                domain="magazzino"
                variant="suggestions"
                id="magazzino-search"
                placeholder={GESTIONALE_SEARCH_PLACEHOLDER}
                aria-label="Cerca in magazzino"
                wrapperClassName="min-w-0 flex-1 sm:min-w-[12rem]"
                onSearchAppliedChange={onSearchAppliedChange}
                onDebouncedInputChange={onDebouncedInputChange}
                clearSignal={searchClearSignal}
                onFocusChange={setSearchFieldFocused}
                suggestionPool={searchSuggestionPool}
                mapSuggestionToQuery={magazzinoSearchQueryFromSuggestion}
                mapInputToQueryOnEnter={magazzinoSearchQueryFromSuggestion}
                footer={
                  dirtySearchHint ? (
                    <p className="text-xs text-[color:var(--cab-text-muted)]" role="status">
                      {dirtySearchHint}
                    </p>
                  ) : null
                }
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
              <div className="flex min-w-0 w-full max-w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                <PageToolbarResultCount
                  className="w-full min-w-0 sm:flex-1"
                  hideCountOnMobile
                  mobileUniformActions
                  count={filteredSorted.length}
                  filtersActive={hasAdvancedPanelFilters || soloSottoScorta || nascondiScortaZero}
                  searchActive={searchApplied.trim().length > 0}
                  onSearchReset={resetMagazzinoRicerca}
                  onFilterReset={resetMagazzinoFilters}
                />
                <div className="flex w-full min-w-0 flex-nowrap items-stretch gap-2 sm:ms-auto sm:w-auto sm:justify-end">
                  {magCanCreateRicambio ? (
                    <PageToolbarMetaToggle
                      className="min-h-10 min-w-0 flex-1 sm:min-h-9 sm:flex-none sm:shrink-0"
                      label="Modalità modifica"
                      shortLabel="Modifica"
                      checked={modalitaModifica}
                      onChange={(next) => {
                        setModalitaModifica(next);
                        writeMagazzinoModalitaModifica(next);
                      }}
                    />
                  ) : null}
                  {magPerm.canRead ? (
                    <PageToolbarMetaToggle
                      className="min-h-10 min-w-0 flex-1 sm:min-h-9 sm:flex-none sm:shrink-0"
                      label="Etichette"
                      shortLabel="Etichette"
                      checked={labelMode}
                      onChange={(next) => {
                        setLabelMode(next);
                        if (!next) clearLabelQuantities();
                      }}
                    />
                  ) : null}
                </div>
              </div>
            }
          />
        </section>

        {labelMode ? (
          <MagazzinoBulkLabelToolbar
            selection={labelSelection}
            onClearSelection={clearLabelQuantities}
          />
        ) : null}

        <SkeletonBoundary loading={magazzinoInitialLoading}>
        <MagazzinoTableSection mode="content">
        {listSurface === "table" ? (
        <GestionaleListTable
          className={gestionaleMagazzinoDenseTableClass}
          wrapClassName="mt-4"
          colgroup={
            <>
              {labelMode ? <col className={magazzinoTableColLabelQtyClass} /> : null}
              <col className={magazzinoTableColCodiceClass} />
              <col className={magazzinoTableColMarcaClass} />
              <col className={magazzinoTableColDescrizioneClass} />
              <col className={magazzinoTableColCategoriaClass} />
              <col className={magazzinoTableColScortaClass} />
              <col className={magazzinoTableColScortaMinClass} />
              <col className={magazzinoTableColUltimaModClass} />
              <col className={magazzinoTableColPrezzoClass} />
              <col className={magazzinoTableColConsumoClass} />
              <col className={magazzinoTableColAzioniClass} />
            </>
          }
          headRow={
            <>
              {labelMode ? (
                <th
                  className={`${magazzinoTableColLabelQtyClass} px-2 text-center text-xs font-medium text-[color:var(--cab-text-muted)]`}
                  scope="col"
                >
                  Qtà
                </th>
              ) : null}
              <GlobalTableSortTh
                label="CODICE"
                columnKey="codiceFornitoreOriginale"
                sortColumn={sortColumn}
                sortPhase={sortPhase}
                onSort={onSort}
                thClassName={magazzinoTableColCodiceThClass}
              />
              <GlobalTableSortTh
                label="Marca"
                columnKey="marca"
                sortColumn={sortColumn}
                sortPhase={sortPhase}
                onSort={onSort}
                thClassName={magazzinoTableColMarcaClass}
              />
              <MagazzinoDescrizioneSortTh
                sortColumn={sortColumn}
                sortPhase={sortPhase}
                onSort={onSort}
                thClassName={magazzinoTableColDescrizioneClass}
              />
              <GlobalTableSortTh
                label="Categoria"
                columnKey="categoria"
                sortColumn={sortColumn}
                sortPhase={sortPhase}
                onSort={onSort}
                thClassName={`min-w-0 ${magazzinoTableColCategoriaClass}`}
              />
              <GlobalTableSortTh
                label="Scorta"
                columnKey="scorta"
                sortColumn={sortColumn}
                sortPhase={sortPhase}
                onSort={onSort}
                align="center"
                thClassName={magazzinoTableColScortaClass}
              />
              <GlobalTableSortTh
                label="Scorta min."
                columnKey="scortaMinima"
                sortColumn={sortColumn}
                sortPhase={sortPhase}
                onSort={onSort}
                align="center"
                thClassName={`min-w-0 ${magazzinoTableColScortaMinClass}`}
              />
              <GlobalTableSortTh
                label="Ultima modifica"
                columnKey="dataUltimaModifica"
                sortColumn={sortColumn}
                sortPhase={sortPhase}
                onSort={onSort}
                align="center"
                thClassName={`min-w-0 ${magazzinoTableColUltimaModClass}`}
              />
              <GlobalTableSortTh
                label="P. vendita"
                columnKey="prezzoVendita"
                sortColumn={sortColumn}
                sortPhase={sortPhase}
                onSort={onSort}
                align="center"
                thClassName={magazzinoTableColPrezzoClass}
              />
              <GlobalTableSortTh
                label="Consumo"
                columnKey="consumoMedioMensile"
                sortColumn={sortColumn}
                sortPhase={sortPhase}
                onSort={onSort}
                align="center"
                thClassName={`min-w-0 ${magazzinoTableColConsumoClass}`}
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
        ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {pagedMagazzino.map((p) => {
            const consumoRow = consumoMap.get(p.id);
            const avgM = consumoRow?.avgMonthly ?? null;
            const low = p.scorta < p.scortaMinima;
            const flash = flashRowId === p.id;
            const staleModifica = isModificaOlderThanMonths(p.dataUltimaModifica, MAGAZZINO_STALE_MODIFICA_MONTHS);
            const compatModels = compatModelsDisplayFor(p);
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
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
                      Etichette
                    </span>
                    <MagazzinoLabelQtyStepper
                      value={labelSelection.quantities[p.id] ?? 0}
                      onChange={(next) => setLabelQtyForRicambio(p.id, next)}
                      ariaLabel={ricambioCodiceForUi(p.codiceFornitoreOriginale) || p.descrizione}
                    />
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
                    {compatModels ? (
                      <p className="line-clamp-2 text-xs leading-snug text-zinc-500 dark:text-zinc-400">
                        {compatModels}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-center gap-1">
                    <MagazzinoScortaDisplayBadge
                      ricambioId={p.id}
                      ricambioLabel={p.descrizione}
                      fallbackScorta={p.scorta}
                      low={low}
                      variant="mobile"
                    />
                    <MagazzinoScortaBadge value={p.scortaMinima} kind="minima" variant="mobile" />
                  </div>
                </div>
                <dl className="mt-2 grid grid-cols-3 gap-x-2 gap-y-1.5 text-[11px]">
                  <div className="min-w-0">
                    <dt className="text-zinc-500 dark:text-zinc-400">Categoria</dt>
                    <dd className="truncate font-medium text-zinc-900 dark:text-zinc-100">{p.categoria}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-zinc-500 dark:text-zinc-400">P. vendita</dt>
                    <dd className="truncate font-medium tabular-nums text-zinc-900 dark:text-zinc-100">{eur(p.prezzoVendita)}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-zinc-500 dark:text-zinc-400">Consumo medio</dt>
                    <dd className="font-medium tabular-nums text-zinc-700 dark:text-zinc-300">
                      <span className="inline-block max-w-full truncate">
                        {avgM != null ? formatAvgMonthlyMagazzinoIt(avgM) : "—"}
                      </span>
                    </dd>
                  </div>
                </dl>
                <div className="mt-auto flex w-full min-w-0 shrink-0 items-end justify-between gap-2 border-t border-zinc-200/90 pt-2.5 dark:border-zinc-700/80">
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
                          ÔÜá
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
                  <div
                    className={`${gestionaleListTableActionsGroupEnd} shrink-0 flex-nowrap`}
                    role="group"
                    aria-label="Azioni"
                  >
                  <IconActionButton
                    label="Info"
                    tooltipForce
                    tooltipContent="Apri scheda ricambio"
                    className={dsTableActionBtnInfo}
                    onClick={() => openInfo(p)}
                  >
                    <IconInfoMagazzino />
                  </IconActionButton>
                  <MagazzinoScortaAdjustActionsCell
                    ricambioId={p.id}
                    ricambioLabel={p.descrizione}
                    fallbackScorta={p.scorta}
                    canAdjust={magCanCreateRicambio}
                    modalitaModifica={modalitaModifica}
                  />
                  </div>
                </div>
              </CardMobile>
            );
          })}
        </div>
        )}
        {showPager ? (
          <TablePagination page={page} pageCount={pageCount} onPageChange={setPage} label={label} />
        ) : null}
        </MagazzinoTableSection>
        </SkeletonBoundary>
      </ShellCard>

      {newOpen && modalChunkMountedKey !== "new" ? (
        <GestionaleModalShell
          modalSize="formMedium"
          title="Nuovo ricambio"
          titleId="new-ricambio-title"
          onRequestClose={closeNewRicambioModal}
        >
          <LoadingFormSkeleton sections={3} />
        </GestionaleModalShell>
      ) : null}

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
          onMounted={() => setModalChunkMountedKey("new")}
          onSaveError={(message) => toastError(message, { module: "magazzino", action: "create" })}
          onVaiAlRicambioDuplicato={(id) => focusRicambioInTable(id)}
          onSaved={(ui) => {
            registerOrderIndex(ui.id);
            patchProdotti((prev) => [ui, ...prev]);
            completeMagazzinoSave(ui.id, "Ricambio creato in magazzino.", "entity_created");
          }}
        />
      ) : null}

      {detail && detailRicambio && detail.mode === "info" && modalChunkMountedKey !== `${detail.id}-info` ? (
        <GestionaleModalShell
          modalSize="info"
          modalHeight="standard"
          title="Scheda ricambio"
          titleId="detail-ricambio-title"
          onRequestClose={closeDetail}
        >
          <LoadingFormSkeleton sections={3} />
        </GestionaleModalShell>
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
          onMounted={() => setModalChunkMountedKey(`${detail.id}-info`)}
          onEdit={startEditFromInfo}
          onImageEvent={(ev) => logImageEvent(ev, detailRicambio)}
          onDismissLogEntry={removeMagazzinoLogEntry}
          canAdjustScorta={magCanCreateRicambio}
          modalitaModifica={modalitaModifica}
          scortaFlash={flashRowId === detailRicambio.id}
          stockPolicyRaw={stockPolicyRaw}
          onUndoStockMovement={undoStockMovement}
          undoStockPending={undoStockPending}
        />
      ) : null}

      {detail && detailRicambio && detail.mode === "edit" && modalChunkMountedKey !== `${detail.id}-edit` ? (
        <GestionaleModalShell
          modalSize="formMedium"
          title="Modifica ricambio"
          onRequestClose={closeDetail}
        >
          <LoadingFormSkeleton sections={3} />
        </GestionaleModalShell>
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
          onMounted={() => setModalChunkMountedKey(`${detail.id}-edit`)}
          magCanCreateRicambio={magCanCreateRicambio}
          magCanDeleteRicambio={magCanDeleteRicambio}
          onClose={closeDetail}
          onCancel={cancelEditBackToInfo}
          onRequestDelete={requestEliminaRicambio}
          onSaveError={(message) => toastError(message, { module: "magazzino", action: "update" })}
          modalitaModifica={modalitaModifica}
          onSaved={(ui, message) => {
            patchProdotti((prev) => prev.map((p) => (p.id === ui.id ? touch(ui) : p)));
            completeMagazzinoSave(ui.id, message);
          }}
          onImageEvent={(ev) => logImageEvent(ev, detailRicambio)}
        />
      ) : null}

      {manualLabelOpen ? <MagazzinoManualLabelModal onClose={() => setManualLabelOpen(false)} /> : null}

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
    </MagazzinoDebouncedScortaProvider>
    </GestionaleSectionGate>
  );
}
