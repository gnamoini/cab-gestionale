"use client";

import "./lavorazioni-scroll.css";
import "./lavorazioni-select-theme.css";

import dynamic from "next/dynamic";
import { useLavorazioniPdfWarmup } from "@/lib/observability/asset-cache-warmup";
import { useGestionaleListLayout, GESTIONALE_LIST_DESKTOP_ONLY_CLASS } from "@/lib/ui/use-gestionale-list-layout";
import { LIST_QUERY_LOADING_FAILSAFE_MS, useLoadingFailsafe } from "@/lib/ui/loading-failsafe";
import { useUIAutonomyFixEngine } from "@/lib/ui-autonomy-fix/use-ui-autonomy-fix-engine";
import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  GestionaleListTable,
  GestionaleListTableActionsHead,
  GlobalTableSortTh,
} from "@/components/gestionale/global-table";
import { ShellCard } from "@/components/gestionale/shell-card";
import { TablePagination } from "@/components/gestionale/table-pagination";
import { ServerListLoadMore } from "@/components/gestionale/server-list-load-more";
import { isServerListPaginationEnabled } from "@/lib/performance/list-pagination-rollout";
import { enrichLavorazioneListRowsWithMezzi } from "@/lib/db/dto-mappers";
import { mezziGestitiToEmbedMap } from "@/lib/mezzi/mezzi-attrezzature-batch";
const LavorazioneCreateModal = dynamic(
  () =>
    import("@/components/gestionale/lavorazioni/lavorazione-create-modal").then((m) => ({
      default: m.LavorazioneCreateModal,
    })),
  { ssr: false },
);
const SchedeLavorazioneModal = dynamic(
  () =>
    import("@/components/lavorazioni/schede/schede-lavorazione-modal").then((m) => ({
      default: m.SchedeLavorazioneModal,
    })),
  { ssr: false },
);
import type { SchedeLavorazioneDialogSize } from "@/components/lavorazioni/schede/schede-lavorazione-modal";
const LavorazioniKanbanView = dynamic(
  () =>
    import("@/components/gestionale/lavorazioni/lavorazioni-kanban-lazy").then((m) => m.LavorazioniKanbanViewLazy),
  { ssr: false },
);
const LavorazioneCompletamentoEditModal = dynamic(
  () =>
    import("@/components/gestionale/lavorazioni/lavorazione-completamento-edit-modal").then((m) => ({
      default: m.LavorazioneCompletamentoEditModal,
    })),
  { ssr: false },
);
const SchedaConcurrencyMergeDialog = dynamic(
  () =>
    import("@/components/lavorazioni/schede/scheda-concurrency-merge-dialog").then((m) => ({
      default: m.SchedaConcurrencyMergeDialog,
    })),
  { ssr: false },
);
import { GestionaleModalGate } from "@/components/gestionale/gestionale-modal-gate";
import {
  LavorazioneConcludiConfirmDialogLazy,
  LavorazioneEliminaConfirmDialogLazy,
} from "@/components/gestionale/lavorazioni/lavorazioni-confirm-dialogs-lazy";
import { type TablePillOption } from "@/components/gestionale/lavorazioni/lavorazioni-inline-select";
import { lavorazioneMatchesMezzo } from "@/lib/mezzi/lavorazioni-sync";
import { lavRowToMatchShape } from "@/lib/mezzi/mezzi-db-ui-adapter";
import { upsertMezzoFromSchedaIngresso } from "@/lib/mezzi/upsert-mezzo-from-scheda";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { Q_FOCUS_LAV_ROW, Q_FOCUS_MEZZO, Q_LAVORAZIONI_MEZZO_ID } from "@/lib/navigation/dashboard-log-links";
import { deferredRouterReplace, deferredRouterRefresh } from "@/lib/navigation/deferred-app-router";
import {
  buildLavorazioniPillOptionsFromGlobal,
} from "@/lib/global-list/build-lavorazioni-pill-options";
import { gestionaleLavorazioniDenseTableClass } from "@/lib/ui/gestionale-list-table";
import { pickLavorazioniInitialSchedeIds } from "@/lib/lavorazioni/lavorazioni-schede-prefetch";
import { prioritaDisplayColor, statoDisplayColor } from "@/lib/lavorazioni/lavorazioni-theme";
import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import { comparePrioritaLavorazione, orderPrioritaList } from "@/lib/lavorazioni/priorita-order";
import { statoWorkflowOrderIndex } from "@/lib/lavorazioni/stato-order";
import type { PrioritaLav } from "@/lib/lavorazioni/types";
import { executeInterventoWriteEntry } from "@/lib/domain/intervento-entry";
import { logInterventoTelemetry } from "@/lib/domain/intervento-context/intervento-telemetry";
import { logMezzoSchedaConflictTelemetry } from "@/lib/domain/mezzo/mezzo-scheda-conflict-telemetry";
import { lavorazioneNoteOperative } from "@/lib/lavorazioni/lavorazione-display-helpers";
import { openPdfArtifact } from "@/lib/pdf/request-pdf-artifact";
import {
  buildLavorazioneRowProfileResolver,
  mergeLazyProfileNamesIntoResolver,
  resolveLavorazioneUltimaModifica,
} from "@/lib/lavorazioni/lavorazione-ultima-modifica";
import { lavRowMatchesPageFilters, type LavPageFilters } from "@/lib/lavorazioni/lavorazioni-list-ui-filters";
import {
  buildLavorazioniFilterCatalog,
  loadGestionaleAdvancedFiltersPersisted,
  LAVORAZIONI_ADVANCED_FILTERS_EMPTY,
  lavorazioniAdvancedFiltersActive,
  saveGestionaleAdvancedFiltersPersisted,
  type LavorazioniAdvancedFilters,
} from "@/lib/lavorazioni/lavorazioni-advanced-filters";
import {
  buildCaptureBundleSchedaPatch,
  buildCaptureMultiSchedaBundlePatch,
  mergeCaptureBundlePatch,
} from "@/lib/document-capture/capture-field-mapper";
import { resolveLavorazioneListRowForSchedeOpen } from "@/lib/document-capture/resolve-lavorazione-list-row-for-schede.client";
import type {
  CaptureSchedeOpenRequest,
  CaptureViewExistingSchedaRequest,
  LavorazioniCapturePageDropHandle,
} from "@/components/document-capture/lavorazioni-digital-capture-launcher";
import { getOrCreateBundle } from "@/lib/schede/lavorazioni-schede-storage";
import {
  resolveSchedaConcurrencyBundle,
  type SchedaConcurrencyResolution,
} from "@/lib/schede/scheda-concurrency-merge";
import {
  ensureSchedeBundlesInCache,
  isSchedaConcurrencyConflict,
  persistSchedeBundle,
  persistSchedeStore,
  type PersistSchedeErrorResult,
  type PersistSchedeResult,
} from "@/lib/schede/schede-sync-adapter";
import { clampSchedeBundle } from "@/lib/validation/clamp-free-text";
import { applyOptimisticSchedeStore, rollbackSchedeStore, snapshotSchedeStore } from "@/lib/schede/schede-store-optimistic";
import { dispatchGestionaleLocalMutation, cabSyncEventForEntity } from "@/lib/sync/gestionale-sync-dispatch";
import { flushGestionaleDirty } from "@/lib/sync/gestionale-dirty-flush";
import { useGestionaleSyncScope } from "@/src/hooks/gestionale/use-gestionale-sync-scope";
import { markRecentLocalTableBurst } from "@/lib/sync/recent-local-mutation";
import { useSchedeBundlesQuery } from "@/src/hooks/use-schede-store-query";
import {
  CAB_ADDETTO_DISPLAY_RENAME,
  type CabAddettoRenameDetail,
} from "@/lib/sistema/cab-events";
import { newSchedaMeta } from "@/lib/schede/schede-ui";
import { useMezziListQuery, useMagazzinoRicambiUIQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { GestionaleSectionGate } from "@/components/gestionale/gestionale-section-gate";
import { useGestionaleForegroundOverlayActive } from "@/lib/ui/use-gestionale-foreground-overlay";
import { layoutPageRoot } from "@/lib/ui/responsive-layout-core";
import { useGestionaleQueryOpts } from "@/src/hooks/gestionale/use-gestionale-query-opts";
import { formatSupabaseError } from "@/src/utils/supabaseErrorHandler";
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import { isStatoInConfig, resolveDefaultLavorazioneStatoId, statoLavorazioneLabel } from "@/src/shared/selectors";
import {
  dsAccentSoftBanner,
  dsInput,
  dsStackPage,
  dsTableActionGlyph,
} from "@/lib/ui/design-system";
import {
  Drawer,
  IconActionButton,
  LoadingErrorState,
  LoadingFormSkeleton,
  SkeletonBoundary,
} from "@/components/design-system";
import {
  LavorazioniListBodySection,
  LavorazioniTableSection,
} from "@/components/gestionale/lavorazioni/lavorazioni-page-structure";
import {
  GestionaleLogEmpty,
  GestionaleLogEntryFourLines,
  GestionaleLogList,
  gestionaleLogDrawerPanelClass,
  gestionaleLogScrollEmbeddedClass,
} from "@/components/gestionale/gestionale-log-ui";
import { useUndoableLog } from "@/src/hooks/gestionale/use-undoable-log";
import { writeModificaLog } from "@/src/services/internal/audit-log";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import type { LogModificaRow } from "@/src/types/supabase-tables";
import {
  buildLavorazioneLogOggettoResolver,
  buildLogModificheDisplayEntries,
  logAutoreLabel,
} from "@/lib/gestionale-log/log-modifiche-view-model";
import { lavorazioneLogContextFromListRow } from "@/lib/lavorazioni/lavorazione-log-oggetto";
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import { useResponsiveListPageSize } from "@/lib/ui/use-responsive-list-page-size";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type { LavorazioneSchedeBundle, LavorazioneSchedeStore, SchedaIngressoFields } from "@/types/schede";
import {
  type LavorazioneFilters,
  type LavorazioneListRow,
  type LavorazioneUpdate,
} from "@/src/services/lavorazioni.service";
import { useLavorazioneProfileNamesQuery } from "@/src/hooks/use-lavorazione-profile-names-query";
import { useLavorazioniList } from "@/src/services/domain/lavorazioni-domain.queries";
import { fetchLavorazioniListCountAuthorized } from "@/lib/lavorazioni/lavorazioni-list-fetch";
import { isLavorazioneArchived, isLavorazioneInCorso } from "@/lib/lavorazioni/archived";
import { lavorazioniListCountQueryKey } from "@/lib/lavorazioni/lavorazioni-list-query-keys";
import { useLavorazioneConcludeMutation, useLavorazioneRemoveMutation, useLavorazioneRestoreMutation, useLavorazioneUpdateCompletamentoMutation, useLavorazioneUpdateMutation } from "@/src/hooks/gestionale/use-lavorazione-mutations";
import { useLavorazioneStatoMoveMutation } from "@/src/hooks/gestionale/use-lavorazione-stato-move-mutation";
import { useMezzoCreateMutation, useMezzoUpdateMutation } from "@/src/hooks/gestionale/use-mezzo-mutations";
import { mezziListQueryKey } from "@/lib/render/query-key-factory";
import { QK, commitLavorazioneCreateSuccess } from "@/src/lib/react-query/invalidate-related";
import { mezziEntry } from "@/lib/domain/mezzi-entry";
import {
  runLavorazioniToolbarRefresh,
} from "@/src/lib/react-query/refetch-lavorazioni-operational-data";
import type { PrioritaLavorazione, StatoLavorazione } from "@/src/types/supabase-tables";
import { useAuth } from "@/context/auth-context";
import {
  collapsibleExpandedBoolPref,
  useCollapsiblePreference,
} from "@/lib/ui/collapsible-prefs";
import { useGestionaleConfirm } from "@/src/hooks/use-gestionale-confirm";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { GESTIONALE_TOAST } from "@/src/lib/ux/gestionale-toast-messages";
import { useAdminNotificationStore } from "@/src/hooks/gestionale/use-admin-notification-store";
import { usePermissionsSnapshot } from "@/src/hooks/use-permissions";
import { READONLY_PERMISSION_HINT } from "@/src/lib/auth/permissions";
import {
  erpBtnNeutral,
  erpBtnNuovaLavorazione,
  erpFocus,
  FilterSelectWrap,
  gestionaleSelectFilterClass,
  prioritaLabel,
  prioritaPillShellClass,
  prioritaPillShellStyle,
  selectLavorazioniFilter,
  addettoPillShellClass,
  addettoPillShellStyleForName,
  statoPillShellClass,
  statoPillShellStyle,
} from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import {
  LavorazioneIngressoDateCell,
  lavTableActionBtnDanger,
  lavTableActionBtnInfo,
  lavTableActionBtnPrimary,
  lavTableActionBtnSecondary,
  dsTableActionBadge,
  dsTableActionBtnWithBadge,
  lavTableActionsRow,
  lavTableTd,
  lavTableColAttrezzaturaClass,
  lavTableColAzioniClass,
  lavTableColCantiereClass,
  lavTableColClienteClass,
  lavTableColMatricolaClass,
  lavTableColScuderiaClass,
  lavTableColTargaClass,
  lavTableColIngressoClass,
  lavTableColNoteClass,
  lavTableColStatoAddettoInset,
  lavTablePillColStyleFromLabels,
  lavTableTdPill,
  lavTableTdAzioni,
  lavTableTdPillWrap,
  lavTableThAzioni,
} from "@/components/gestionale/lavorazioni/lavorazioni-table-shared";
import {
  lavorazioneDataCompletamentoIso,
} from "@/lib/lavorazioni/lavorazioni-list-table-display";
import {
  buildLavorazioneSchedeSortIndex,
  type LavorazioneSchedeSortIndex,
} from "@/lib/lavorazioni/lavorazioni-schede-sort-index";
import { groupLavorazioniLogsById } from "@/lib/lavorazioni/client-portal-ui";
import {
  lavorazioneAddettoLabel as addettoLabel,
  lavorazioneCantiereLabel as cantiereLabel,
  lavorazioneClienteLabel as clienteLabel,
  lavorazioneMacchinaLabel as macchinaLabel,
  lavorazioneMezzoIdent as mezzoIdent,
  lavorazioneMezzoIdentParts as mezzoIdentParts,
  lavorazioneTelaioLabel as telaioLabel,
  lavorazioneUtilizzatoreLabel as utilizzatoreLabel,
  lavorazioneSchedeBundleRevision,
} from "@/lib/lavorazioni/lavorazioni-list-row-labels";
import {
  LavorazioneArchivioTableRow,
  LavorazioneAttivaTableRow,
} from "@/components/gestionale/lavorazioni/lavorazione-table-row";
import {
  LavorazioneArchivioMobileCard,
  LavorazioneAttivaMobileCard,
  LavorazioniMobileListShell,
} from "@/components/gestionale/lavorazioni/lavorazione-mobile-cards";
import {
  LavorazioniListToolbar,
  LavorazioniPageHeaderToolbar,
  LavorazioniPageMenuProvider,
} from "@/components/gestionale/lavorazioni/lavorazioni-page-toolbar";
const dataCompletamentoIso = lavorazioneDataCompletamentoIso;

function canDeleteLavorazioneAttiva(row: LavorazioneListRow, canDelete: boolean): boolean {
  return canDelete && row.archived !== true;
}

function IconCloseWork({ className = dsTableActionGlyph }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 12.5 10 17 19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 20h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** Ripristina lavorazione dall'archivio verso «in corso». */
function IconRipristinaDaArchivio({ className = dsTableActionGlyph }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 8h14v10a2 2 0 01-2 2H7a2 2 0 01-2-2V8z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M5 8h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 11v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9.5 13.5 12 11l2.5 2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconInfo({ className = dsTableActionGlyph }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 11v5M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconSchede({ className = dsTableActionGlyph }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 4h7l3 3v13H7V4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M14 4v4h4M9.5 12h5M9.5 15.5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function legacyLavBase(row: LavorazioneListRow) {
  const mezzo = row.mezzo;
  return {
    id: row.id,
    codice: row.codice ?? null,
    macchina: mezzo ? `${mezzo.marca} ${mezzo.modello}`.trim() || "—" : "—",
    targa: mezzo?.targa?.trim() || "",
    matricola: mezzo?.matricola?.trim() || "",
    nScuderia: mezzo?.numero_scuderia?.trim() || "",
    cliente: mezzo?.cliente?.trim() || "—",
    utilizzatore: mezzo?.utilizzatore?.trim() || "",
    cantiere: "",
    noteInterne: row.note?.trim() || "",
    dataIngresso: row.data_ingresso ?? row.created_at,
  };
}

function rowToLegacyAttiva(
  row: LavorazioneListRow,
  schedeStore: LavorazioneSchedeStore,
  logs?: readonly LogModificaRow[],
  addettiRecords?: readonly AddettoRecord[],
): LavorazioneAttiva {
  return {
    ...legacyLavBase(row),
    addetto: addettoLabel(row, schedeStore, logs, addettiRecords),
    statoId: row.stato,
    priorita: row.priorita as PrioritaLav,
    dataCompletamento: row.data_uscita ?? null,
  };
}

function rowToLegacyArchiviata(
  row: LavorazioneListRow,
  schedeStore: LavorazioneSchedeStore,
  logs?: readonly LogModificaRow[],
  addettiRecords?: readonly AddettoRecord[],
): LavorazioneArchiviata {
  const completion = row.data_uscita ?? row.updated_at;
  return {
    ...legacyLavBase(row),
    addetto: addettoLabel(row, schedeStore, logs, addettiRecords),
    statoFinaleId: row.stato,
    prioritaFinale: row.priorita as PrioritaLav,
    dataCompletamento: completion,
    meseCompletamento: completion.slice(0, 7),
  };
}

function isoToItalianDay(iso: string | null | undefined): string {
  const raw = iso?.trim();
  if (!raw) return new Date().toLocaleDateString("it-IT");
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw.length >= 10 ? raw.slice(0, 10).split("-").reverse().join("/") : raw;
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

type SortPhase = "asc" | "desc" | "natural";
type SortKeyAtt =
  | "ingresso"
  | "cliente"
  | "utilizzatore"
  | "cantiere"
  | "macchina"
  | "nScuderia"
  | "targa"
  | "matricola"
  | "note"
  | "stato"
  | "priorita"
  | "addetto";
type SortKeyCh =
  | "ingresso"
  | "cliente"
  | "utilizzatore"
  | "cantiere"
  | "macchina"
  | "nScuderia"
  | "targa"
  | "matricola"
  | "note"
  | "completamento"
  | "oreTotali"
  | "addetto";

function cmpStr(a: string, b: string): number {
  return a.localeCompare(b, "it", { sensitivity: "base" });
}

function cmpAtt(
  a: LavorazioneListRow,
  b: LavorazioneListRow,
  k: SortKeyAtt,
  phase: SortPhase,
  sortIndex: LavorazioneSchedeSortIndex,
  statoOrderIds: readonly string[],
): number {
  const dir = phase === "desc" ? -1 : 1;
  const t = (x: number) => x * dir;
  const ia = sortIndex[a.id];
  const ib = sortIndex[b.id];
  if (k === "macchina") return t(cmpStr(ia?.macchina ?? "—", ib?.macchina ?? "—"));
  if (k === "targa") return t(cmpStr(ia?.targa ?? "", ib?.targa ?? ""));
  if (k === "matricola") return t(cmpStr(ia?.matricola ?? "", ib?.matricola ?? ""));
  if (k === "nScuderia") return t(cmpStr(ia?.nScuderia ?? "", ib?.nScuderia ?? ""));
  if (k === "cliente") return t(cmpStr(ia?.cliente ?? "—", ib?.cliente ?? "—"));
  if (k === "utilizzatore") return t(cmpStr(ia?.utilizzatore ?? "", ib?.utilizzatore ?? ""));
  if (k === "cantiere") return t(cmpStr(ia?.cantiere ?? "—", ib?.cantiere ?? "—"));
  if (k === "note") return t(cmpStr((a.note ?? "").trim(), (b.note ?? "").trim()));
  if (k === "stato") {
    return t(
      statoWorkflowOrderIndex(a.stato, statoOrderIds) - statoWorkflowOrderIndex(b.stato, statoOrderIds),
    );
  }
  if (k === "priorita") return t(comparePrioritaLavorazione(a.priorita, b.priorita));
  if (k === "addetto") return t(cmpStr(ia?.addetto ?? "—", ib?.addetto ?? "—"));
  const da = new Date(a.data_ingresso ?? a.created_at).getTime();
  const db = new Date(b.data_ingresso ?? b.created_at).getTime();
  return t(da === db ? 0 : da < db ? -1 : 1);
}

function cmpCh(
  a: LavorazioneListRow,
  b: LavorazioneListRow,
  k: SortKeyCh,
  phase: SortPhase,
  sortIndex: LavorazioneSchedeSortIndex,
): number {
  const dir = phase === "desc" ? -1 : 1;
  const t = (x: number) => x * dir;
  const ia = sortIndex[a.id];
  const ib = sortIndex[b.id];
  if (k === "macchina") return t(cmpStr(ia?.macchina ?? "—", ib?.macchina ?? "—"));
  if (k === "targa") return t(cmpStr(ia?.targa ?? "", ib?.targa ?? ""));
  if (k === "matricola") return t(cmpStr(ia?.matricola ?? "", ib?.matricola ?? ""));
  if (k === "nScuderia") return t(cmpStr(ia?.nScuderia ?? "", ib?.nScuderia ?? ""));
  if (k === "cliente") return t(cmpStr(ia?.cliente ?? "—", ib?.cliente ?? "—"));
  if (k === "utilizzatore") return t(cmpStr(ia?.utilizzatore ?? "", ib?.utilizzatore ?? ""));
  if (k === "cantiere") return t(cmpStr(ia?.cantiere ?? "—", ib?.cantiere ?? "—"));
  if (k === "note") return t(cmpStr((a.note ?? "").trim(), (b.note ?? "").trim()));
  if (k === "addetto") return t(cmpStr(ia?.addetto ?? "—", ib?.addetto ?? "—"));
  if (k === "ingresso") {
    const da = new Date(a.data_ingresso ?? a.created_at).getTime();
    const db = new Date(b.data_ingresso ?? b.created_at).getTime();
    return t(da === db ? 0 : da < db ? -1 : 1);
  }
  if (k === "oreTotali") {
    const ra = ia?.oreTotali ?? -1;
    const rb = ib?.oreTotali ?? -1;
    return t(ra === rb ? 0 : ra < rb ? -1 : 1);
  }
  const ua = new Date(dataCompletamentoIso(a)).getTime();
  const ub = new Date(dataCompletamentoIso(b)).getTime();
  return t(ua === ub ? 0 : ua < ub ? -1 : 1);
}

const ATTIVE_SORT_KEYS_NEED_SCHEde = new Set<SortKeyAtt>([
  "macchina",
  "nScuderia",
  "targa",
  "matricola",
  "cliente",
  "utilizzatore",
  "cantiere",
  "addetto",
]);

function attiveSortNeedsFullSchede(sortCol: SortKeyAtt | null, sortPhase: SortPhase): boolean {
  if (sortPhase === "natural" || sortCol === null) return false;
  return ATTIVE_SORT_KEYS_NEED_SCHEde.has(sortCol);
}

const ARCHIVIO_SORT_KEYS_NEED_SCHEde = new Set<SortKeyCh>([
  "macchina",
  "nScuderia",
  "targa",
  "matricola",
  "cliente",
  "utilizzatore",
  "cantiere",
  "addetto",
  "oreTotali",
]);

function archivioSortNeedsFullSchede(sortCol: SortKeyCh | null, sortPhase: SortPhase): boolean {
  if (sortPhase === "natural" || sortCol === null) return false;
  return ARCHIVIO_SORT_KEYS_NEED_SCHEde.has(sortCol);
}

/** Placeholder anagrafica quando il filtro arriva da URL ma il mezzo non è ancora nello snapshot locale. */
function mezzoFilterStubFromId(id: string): MezzoGestito {
  return {
    id,
    cliente: "",
    utilizzatore: "—",
    marca: "",
    modello: "—",
    targa: "—",
    matricola: "—",
    numeroScuderia: "",
    tipoAttrezzatura: "",
    anno: 0,
    oreKm: 0,
    statoAttuale: "",
    dataUltimaUscita: "",
    note: "",
    priorita: "normale",
  };
}

function navMezzoFilterBadgeLabel(m: MezzoGestito): string {
  const t = m.targa?.trim();
  if (t && t !== "—") return t;
  const mat = m.matricola?.trim();
  if (mat && mat !== "—") return mat;
  const sc = m.numeroScuderia?.trim();
  if (sc) return `Sc. ${sc}`;
  const mm = `${m.marca} ${m.modello}`.trim();
  return mm || m.id;
}

export function LavorazioniView() {
  useLavorazioniPdfWarmup();
  const { containerRef: listLayoutRef, layout: listLayout, layoutClassName: listLayoutClassName } = useGestionaleListLayout({ tier: "xl" });
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, authorName } = useAuth();
  const gestToast = useGestionaleToast();
  const { confirm, confirmDialog } = useGestionaleConfirm();
  const qc = useQueryClient();
  const gestionaleQueryOpts = useGestionaleQueryOpts();
  const { global: globalPerm, modules: permModules } = usePermissionsSnapshot();
  const lavPerm = permModules.lavorazioni;
  const { markAllRead: markAdminNotifRead } = useAdminNotificationStore();
  const canEditWorkOrders = lavPerm.canWrite;
  const canDeleteRecords = lavPerm.canWrite;
  const globalOpts = useGlobalOptions({ debugTag: "LavorazioniView" });
  const addettiRecords = useMemo(
    () => globalOpts.lavorazioni.addettiRecords,
    [globalOpts.lavorazioni.addettiRecords],
  );
  const mezziListQ = useMezziListQuery();
  const magazzinoQuery = useMagazzinoRicambiUIQuery();
  const statiOpts = useMemo(
    () => globalOpts.lavorazioni.stati.filter((s) => s.id !== "annullata"),
    [globalOpts.lavorazioni.stati],
  );
  const statoOrderIds = useMemo(() => statiOpts.map((s) => s.id), [statiOpts]);
  const statiInCorsoOpts = useMemo(
    () => globalOpts.lavorazioni.statiInCorso.filter((s) => s.id !== "annullata"),
    [globalOpts.lavorazioni.statiInCorso],
  );
  const statiAttiveOpts = statiOpts;
  const statiRapidiOpts = useMemo(
    () => globalOpts.lavorazioni.statiRapidi.filter((s) => s.id !== "annullata"),
    [globalOpts.lavorazioni.statiRapidi],
  );
  const prioritaOpts = useMemo(
    () => orderPrioritaList(globalOpts.lavorazioni.prioritaDb),
    [globalOpts.lavorazioni.prioritaDb],
  );

  const tablePillOptions = useMemo(
    () => buildLavorazioniPillOptionsFromGlobal(globalOpts),
    [globalOpts],
  );
  const macchinaColLabel = "Oggetto";

  const statiRapidiPillOpts = useMemo(
    () => tablePillOptions.stati(statiRapidiOpts),
    [tablePillOptions, statiRapidiOpts],
  );
  const prioritaPillOpts = useMemo(
    () => tablePillOptions.priorita(prioritaOpts),
    [tablePillOptions, prioritaOpts],
  );
  const statoPillStylesById = useMemo(() => {
    const styles: Record<string, ReturnType<typeof statoPillShellStyle>> = {};
    for (const s of statiOpts) {
      styles[s.id] = statoPillShellStyle(statoDisplayColor(s.id, statiOpts));
    }
    return styles;
  }, [statiOpts]);
  const statoPillColStyle = useMemo(
    () => lavTablePillColStyleFromLabels(statiOpts.map((s) => statoLavorazioneLabel(s.id, statiOpts))),
    [statiOpts],
  );
  const prioritaPillColStyle = useMemo(
    () => lavTablePillColStyleFromLabels(prioritaOpts.map((p) => prioritaLabel(p))),
    [prioritaOpts],
  );
  const addettoPillColStyle = useMemo(
    () => lavTablePillColStyleFromLabels(["—", ...globalOpts.lavorazioni.addetti]),
    [globalOpts.lavorazioni.addetti],
  );

  const lavTablePillFillClass = "w-full min-w-0";

  const mezziCatalog = useMemo(() => {
    const rows = Array.isArray(mezziListQ.data) ? mezziListQ.data : [];
    return [...rows].sort((a, b) =>
      `${a.marca} ${a.modello}`.localeCompare(`${b.marca} ${b.modello}`, "it"),
    );
  }, [mezziListQ.data]);

  const prioColor = useCallback(
    (p: PrioritaLavorazione) => {
      if (p === "urgente") return "#b91c1c";
      return prioritaDisplayColor(p as PrioritaLav, globalOpts.lavorazioni.prioritaColors);
    },
    [globalOpts.lavorazioni.prioritaColors],
  );

  const prioritaPillStylesById = useMemo(() => {
    const styles: Record<string, ReturnType<typeof prioritaPillShellStyle>> = {};
    for (const p of prioritaOpts) {
      styles[p] = prioritaPillShellStyle(prioColor(p));
    }
    return styles;
  }, [prioritaOpts, prioColor]);

  const updateLav = useLavorazioneUpdateMutation();
  const createMezzo = useMezzoCreateMutation();
  const updateMezzo = useMezzoUpdateMutation();
  const removeLav = useLavorazioneRemoveMutation();
  const restoreLav = useLavorazioneRestoreMutation();
  const concludeLav = useLavorazioneConcludeMutation();
  const updateCompletamentoLav = useLavorazioneUpdateCompletamentoMutation();

  const [createOpen, setCreateOpen] = useState(false);
  const [createModalWarm, setCreateModalWarm] = useState(false);
  const preloadCreateModal = useCallback(() => {
    void qc.prefetchQuery({
      queryKey: mezziListQueryKey("list", null),
      queryFn: async () => {
        const res = await mezziEntry.getAll(undefined);
        if (!res.success) throw new Error(res.error ?? "Errore lettura mezzi");
        return res.data ?? [];
      },
      staleTime: 30_000,
    });
  }, [qc]);

  const primeCreateModal = useCallback(() => {
    preloadCreateModal();
    if (canEditWorkOrders) setCreateModalWarm(true);
  }, [preloadCreateModal, canEditWorkOrders]);

  const openCreateModal = useCallback(() => {
    primeCreateModal();
    setCreateOpen(true);
  }, [primeCreateModal]);

  const closeCreateModal = useCallback(() => {
    setCreateOpen(false);
  }, []);

  useEffect(() => {
    if (mezziListQ.data != null && !Array.isArray(mezziListQ.data)) {
      void qc.invalidateQueries({ queryKey: mezziListQueryKey("list", null) });
    }
  }, [mezziListQ.data, qc]);

  useEffect(() => {
    primeCreateModal();
    if (typeof window === "undefined") return;
    const requestIdle = (
      window as Window & { requestIdleCallback?: typeof window.requestIdleCallback }
    ).requestIdleCallback;
    if (requestIdle) {
      const id = requestIdle(() => primeCreateModal(), { timeout: 4_000 });
      return () => window.cancelIdleCallback(id);
    }
    const t = setTimeout(() => primeCreateModal(), 2_000);
    return () => clearTimeout(t);
    // Mount-once preload: evita re-run su identity `primeCreateModal`.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount-once
  }, []);
  type LavorazioniListViewMode = "table" | "kanban";
  const [listViewMode, setListViewMode] = useState<LavorazioniListViewMode>("table");
  useUIAutonomyFixEngine("/lavorazioni");
  const [schedeRow, setSchedeRow] = useState<{
    row: LavorazioneListRow;
    origine: "attiva" | "storico";
    initialTab?: "schede" | "panoramica";
    dialogSize?: SchedeLavorazioneDialogSize;
    initialSchedaStage?: "lavorazioni" | "ricambi";
    bundleOverride?: LavorazioneSchedeBundle;
    captureHandoff?: {
      sequentialStages: Array<"lavorazioni" | "ricambi">;
      identMismatchWarnings?: string[];
      multiSchedaLabels?: string;
    };
  } | null>(null);

  const lavorazioniVisibleEntities = useMemo(
    () => (schedeRow ? [{ table: "lavorazioni", entityId: schedeRow.row.id }] : []),
    [schedeRow],
  );

  useGestionaleSyncScope({
    scopeId: "lavorazioni-view",
    domain: "lavorazioni",
    tables: ["lavorazioni", "scheda_lavorazione", "lavorazione_documents", "log_modifiche"],
    visibleEntities: lavorazioniVisibleEntities,
  });

  type ConcurrencyConflict = Extract<PersistSchedeErrorResult, { kind: "concurrency" }>;

  type ConcurrencyDialogPending = {
    conflict: ConcurrencyConflict;
    resolve: (bundle: LavorazioneSchedeBundle | null) => void;
  };
  const [concurrencyDialog, setConcurrencyDialog] = useState<ConcurrencyDialogPending | null>(null);
  const [concurrencyDialogPending, setConcurrencyDialogPending] = useState(false);

  const waitForConcurrencyResolution = useCallback(
    (conflict: ConcurrencyConflict) =>
      new Promise<LavorazioneSchedeBundle | null>((resolve) => {
        setConcurrencyDialog({ conflict, resolve });
      }),
    [],
  );

  const persistSchedeAndSync = useCallback(
    (
      promise: Promise<PersistSchedeResult>,
      options?: {
        syncAfter?: boolean;
        rollbackSnapshot?: ReturnType<typeof snapshotSchedeStore>;
        savedBundle?: LavorazioneSchedeBundle;
      },
    ): Promise<PersistSchedeResult> => {
      return promise.then((res) => {
        if (!res.ok) {
          if (res.kind === "concurrency") return res;
          if (options?.rollbackSnapshot !== undefined) {
            rollbackSchedeStore(qc, options.rollbackSnapshot);
          }
          gestToast.errorOnce("schede-save", res.error ?? "Salvataggio schede non riuscito.", {
            module: "lavorazioni",
            action: "update",
          });
          return res;
        }
        if (options?.savedBundle) {
          const prev = snapshotSchedeStore(qc) ?? {};
          applyOptimisticSchedeStore(qc, {
            ...prev,
            [options.savedBundle.lavorazioneId]: options.savedBundle,
          });
        }
        if (options?.syncAfter !== false) {
          const lavorazioneId = options?.savedBundle?.lavorazioneId?.trim() ?? "";
          const ingressoRowId = (options?.savedBundle?.ingresso as { id?: string } | null | undefined)?.id?.trim();
          const entityIdByTable = new Map<string, string>();
          if (ingressoRowId) entityIdByTable.set("scheda_lavorazione", ingressoRowId);
          if (lavorazioneId) entityIdByTable.set("lavorazioni", lavorazioneId);
          const tables = lavorazioneId ? ["scheda_lavorazione", "lavorazioni"] : ["scheda_lavorazione"];
          const cabSyncEvents = lavorazioneId
            ? [cabSyncEventForEntity("lavorazioni", lavorazioneId, "entity_updated", "lavorazioni")]
            : undefined;
          dispatchGestionaleLocalMutation(qc, tables, cabSyncEvents, entityIdByTable);
        } else {
          markRecentLocalTableBurst(["scheda_lavorazione"]);
        }
        return res;
      });
    },
    [qc, gestToast],
  );

  const onPersistSchedeBundle = useCallback(
    async (next: LavorazioneSchedeBundle): Promise<PersistSchedeResult> => {
      const snapshot = snapshotSchedeStore(qc);
      let safe = clampSchedeBundle(next);
      const prev = snapshot ?? {};
      applyOptimisticSchedeStore(qc, { ...prev, [safe.lavorazioneId]: safe });

      for (let attempt = 0; attempt < 4; attempt += 1) {
        const res = await persistSchedeAndSync(persistSchedeBundle(safe), {
          rollbackSnapshot: snapshot,
          savedBundle: safe,
        });
        if (res.ok || !isSchedaConcurrencyConflict(res)) return res;

        logInterventoTelemetry("intervento_edit_conflict", {
          lavorazioneId: safe.lavorazioneId,
        });

        const resolved = await waitForConcurrencyResolution(res);
        setConcurrencyDialog(null);
        if (!resolved) {
          if (snapshot !== undefined) rollbackSchedeStore(qc, snapshot);
          return { ok: false, kind: "error", error: "Salvataggio annullato." };
        }
        safe = clampSchedeBundle(resolved);
        applyOptimisticSchedeStore(qc, { ...prev, [safe.lavorazioneId]: safe });
      }

      return { ok: false, kind: "error", error: "Troppi tentativi di salvataggio in conflitto." };
    },
    [qc, persistSchedeAndSync, waitForConcurrencyResolution],
  );

  const handleConcurrencyResolve = useCallback(
    async (resolution: SchedaConcurrencyResolution) => {
      if (!concurrencyDialog) return;
      setConcurrencyDialogPending(true);
      try {
        const merged = resolveSchedaConcurrencyBundle(
          resolution,
          concurrencyDialog.conflict.clientBundle,
          concurrencyDialog.conflict.serverBundle,
        );
        concurrencyDialog.resolve(merged);
      } finally {
        setConcurrencyDialogPending(false);
      }
    },
    [concurrencyDialog],
  );

  const handleConcurrencyCancel = useCallback(() => {
    concurrencyDialog?.resolve(null);
    setConcurrencyDialog(null);
  }, [concurrencyDialog]);

  const SEARCH_DEBOUNCE_MS = 320;

  const [searchInput, setSearchInput] = useState("");
  const [searchApplied, setSearchApplied] = useState("");
  const searchInputRef = useRef(searchInput);
  searchInputRef.current = searchInput;

  useEffect(() => {
    const t = window.setTimeout(() => setSearchApplied(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const flushPageSearch = useCallback(() => {
    setSearchApplied(searchInputRef.current.trim());
  }, []);

  const [filtriAttiviEspansi, setFiltriAttiviEspansi] = useCollapsiblePreference(
    collapsibleExpandedBoolPref(false, {
      scope: "lavorazioni",
      key: "filters",
      userId: user?.id ?? null,
    }),
  );
  const [lavLogOpen, setLavLogOpen] = useState(false);

  const [advancedFilters, setAdvancedFilters] = useState<LavorazioniAdvancedFilters>(
    () => loadGestionaleAdvancedFiltersPersisted() ?? LAVORAZIONI_ADVANCED_FILTERS_EMPTY,
  );

  const patchAdvancedFilters = useCallback((patch: Partial<LavorazioniAdvancedFilters>) => {
    setAdvancedFilters((prev) => {
      const next = { ...prev, ...patch, section: "" as const };
      saveGestionaleAdvancedFiltersPersisted(next);
      return next;
    });
  }, []);

  // Default: ordine naturale (nessun filtro attivo in header).
  const [sortColA, setSortColA] = useState<SortKeyAtt | null>(null);
  const [sortPhaseA, setSortPhaseA] = useState<SortPhase>("natural");

  // Default archivio: completamento decrescente (più recente in alto).
  const [sortColC, setSortColC] = useState<SortKeyCh | null>("completamento");
  const [sortPhaseC, setSortPhaseC] = useState<SortPhase>("desc");

  const [flashRowId, setFlashRowId] = useState<string | null>(null);
  const [concludiConfirmRow, setConcludiConfirmRow] = useState<LavorazioneListRow | null>(null);
  const [completamentoEditRow, setCompletamentoEditRow] = useState<LavorazioneListRow | null>(null);
  const [eliminaConfirmRow, setEliminaConfirmRow] = useState<LavorazioneListRow | null>(null);
  const flashClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const consumedFocusLavRef = useRef<string | null>(null);

  const [navMezzoFilter, setNavMezzoFilter] = useState<MezzoGestito | null>(null);
  const [navBulkFlashIds, setNavBulkFlashIds] = useState<Set<string>>(() => new Set());
  const navFlashClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mezzoFilterPart = useMemo((): Pick<LavorazioneFilters, "mezzo_id"> | Record<string, never> => {
    return navMezzoFilter?.id ? { mezzo_id: navMezzoFilter.id } : {};
  }, [navMezzoFilter?.id]);

  const statiChiusiIds = useMemo(
    () => globalOpts.lavorazioni.statiChiusi.map((s) => s.id).filter(Boolean),
    [globalOpts.lavorazioni.statiChiusi],
  );

  const serverListPagination = isServerListPaginationEnabled();
  const listIncludeMezzo = !serverListPagination;

  const filtersAttive = useMemo(
    (): LavorazioneFilters => ({
      includeMezzo: listIncludeMezzo,
      fetchMode: "light",
      includeProfiles: false,
      ...mezzoFilterPart,
      archived: false,
      ...(serverListPagination &&
      searchApplied.trim() &&
      !lavorazioniAdvancedFiltersActive(advancedFilters)
        ? { search: searchApplied.trim() }
        : {}),
    }),
    [listIncludeMezzo, mezzoFilterPart, serverListPagination, searchApplied, advancedFilters],
  );

  const filtersChiuse = useMemo(
    (): LavorazioneFilters => ({
      includeMezzo: listIncludeMezzo,
      fetchMode: "light",
      includeProfiles: false,
      ...mezzoFilterPart,
      archived: true,
    }),
    [listIncludeMezzo, mezzoFilterPart],
  );

  const [archivioSectionOpen, setArchivioSectionOpen] = useState(false);
  const needsChiuseFetch = useMemo(
    () =>
      archivioSectionOpen ||
      Boolean(searchApplied.trim()) ||
      lavorazioniAdvancedFiltersActive(advancedFilters),
    [advancedFilters, archivioSectionOpen, searchApplied],
  );

  const attiveQuery = useLavorazioniList(filtersAttive, gestionaleQueryOpts);
  const chiuseQuery = useLavorazioniList(filtersChiuse, {
    ...gestionaleQueryOpts,
    enabled: needsChiuseFetch,
  });
  const archivioCountQuery = useQuery({
    queryKey: lavorazioniListCountQueryKey(filtersChiuse),
    queryFn: async () => {
      const res = await fetchLavorazioniListCountAuthorized(filtersChiuse);
      if (!res.success) throw new Error(res.error ?? "Errore conteggio archivio");
      return res.data ?? 0;
    },
    enabled: !needsChiuseFetch,
    staleTime: 30_000,
  });

  const { logQuery: lavModificheLogQuery } = useUndoableLog("lavorazioni");

  const mezziById = useMemo(() => mezziGestitiToEmbedMap(mezziCatalog), [mezziCatalog]);

  const attiveRowsRawEnriched = useMemo(() => {
    if (!serverListPagination) return attiveQuery.data ?? [];
    return enrichLavorazioneListRowsWithMezzi(attiveQuery.data ?? [], mezziById);
  }, [attiveQuery.data, mezziById, serverListPagination]);

  const chiuseRowsRawEnriched = useMemo(() => {
    if (!serverListPagination) return chiuseQuery.data ?? [];
    return enrichLavorazioneListRowsWithMezzi(chiuseQuery.data ?? [], mezziById);
  }, [chiuseQuery.data, mezziById, serverListPagination]);

  const attiveRowsRaw = attiveRowsRawEnriched;
  const chiuseRowsRaw = chiuseRowsRawEnriched;

  const attiveRows = useMemo(() => {
    const filtered = attiveRowsRaw.filter(isLavorazioneInCorso);
    if (process.env.NODE_ENV === "development") {
      for (const row of attiveRowsRaw) {
        if (!isLavorazioneInCorso(row)) {
          console.warn("[lavorazioni-archive-invariant] archived row in attive query data", {
            id: row.id,
            archived: row.archived,
            updated_at: row.updated_at,
          });
        }
      }
    }
    return filtered;
  }, [attiveRowsRaw]);

  const chiuseRows = useMemo(() => {
    const filtered = chiuseRowsRaw.filter(isLavorazioneArchived);
    if (process.env.NODE_ENV === "development") {
      for (const row of chiuseRowsRaw) {
        if (!isLavorazioneArchived(row)) {
          console.warn("[lavorazioni-archive-invariant] non-archived row in archivio query data", {
            id: row.id,
            archived: row.archived,
            updated_at: row.updated_at,
          });
        }
      }
    }
    return filtered;
  }, [chiuseRowsRaw]);

  const hasPageClientFilters =
    searchApplied.trim().length > 0 || lavorazioniAdvancedFiltersActive(advancedFilters);

  const needsFullSchedeFetch = useMemo(
    () =>
      hasPageClientFilters ||
      archivioSortNeedsFullSchede(sortColC, sortPhaseC) ||
      attiveSortNeedsFullSchede(sortColA, sortPhaseA),
    [hasPageClientFilters, sortColC, sortPhaseC, sortColA, sortPhaseA],
  );

  const schedeLavorazioneIds = useMemo(() => {
    if (needsChiuseFetch && needsFullSchedeFetch) {
      const ids = attiveRows.map((row) => row.id);
      ids.push(...chiuseRows.map((row) => row.id));
      return ids;
    }
    if (needsFullSchedeFetch) {
      return attiveRows.map((row) => row.id);
    }
    return pickLavorazioniInitialSchedeIds(attiveRows);
  }, [attiveRows, chiuseRows, needsChiuseFetch, needsFullSchedeFetch]);
  const {
    store: schedeStore,
    invalidate: invalidateSchedeStore,
    refetch: refetchSchedeStore,
    isLoading: schedeEnsureLoading,
    isFetching: schedeEnsureFetching,
  } = useSchedeBundlesQuery(true, { lavorazioneIds: schedeLavorazioneIds });

  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent<CabAddettoRenameDetail>).detail;
      if (!d?.previousName || !d?.nextName) return;
      invalidateSchedeStore();
    };
    window.addEventListener(CAB_ADDETTO_DISPLAY_RENAME, handler);
    return () => window.removeEventListener(CAB_ADDETTO_DISPLAY_RENAME, handler);
  }, [invalidateSchedeStore]);

  const logsByLavorazioneId = useMemo(
    () => groupLavorazioniLogsById(lavModificheLogQuery.data ?? []),
    [lavModificheLogQuery.data],
  );

  const schedeSortIndex = useMemo(
    () =>
      buildLavorazioneSchedeSortIndex(
        [...attiveRows, ...chiuseRows],
        schedeStore,
        logsByLavorazioneId,
        addettiRecords,
      ),
    [attiveRows, chiuseRows, schedeStore, logsByLavorazioneId, addettiRecords],
  );
  const [listRefreshBusy, setListRefreshBusy] = useState(false);
  const [printBusy, setPrintBusy] = useState(false);

  const refreshLavorazioniLists = useCallback(async () => {
    setListRefreshBusy(true);
    try {
      await flushGestionaleDirty(qc, { reason: "user_requested", domains: ["lavorazioni"] });
      await runLavorazioniToolbarRefresh([
        attiveQuery.refetch(),
        chiuseQuery.refetch(),
        lavModificheLogQuery.refetch(),
        refetchSchedeStore(),
      ]);
      gestToast.successOnce("lav-list-refresh", GESTIONALE_TOAST.successRefreshed);
    } catch (e) {
      gestToast.errorOnce("lav-list-refresh", e, { module: "lavorazioni" });
    } finally {
      setListRefreshBusy(false);
    }
  }, [qc, attiveQuery, chiuseQuery, lavModificheLogQuery, refetchSchedeStore, gestToast]);

  const pageFilters = useMemo(
    (): LavPageFilters => ({
      search: searchApplied,
      ...advancedFilters,
    }),
    [searchApplied, advancedFilters],
  );

  const attiveRowsFiltered = useMemo(
    () =>
      attiveRows.filter((row) =>
        lavRowMatchesPageFilters(row, pageFilters, schedeStore, "in_corso", addettiRecords),
      ),
    [attiveRows, pageFilters, schedeStore, addettiRecords],
  );

  const chiuseRowsFiltered = useMemo(
    () =>
      chiuseRows.filter((row) =>
        lavRowMatchesPageFilters(row, pageFilters, schedeStore, "archivio", addettiRecords),
      ),
    [chiuseRows, pageFilters, schedeStore, addettiRecords],
  );

  const filterCatalog = useMemo(
    () =>
      buildLavorazioniFilterCatalog(
        [...attiveRows, ...chiuseRows],
        schedeStore,
        globalOpts.lavorazioni.addetti,
        mezziCatalog,
        addettiRecords,
      ),
    [attiveRows, chiuseRows, schedeStore, globalOpts.lavorazioni.addetti, mezziCatalog, addettiRecords],
  );

  const openDetailById = useCallback(
    (id: string) => {
      const active = attiveRows.find((row) => row.id === id);
      if (active) {
        setSchedeRow({ row: active, origine: "attiva", initialTab: "panoramica", dialogSize: "compact" });
        return;
      }
      const closed = chiuseRows.find((row) => row.id === id);
      if (closed) setSchedeRow({ row: closed, origine: "storico", initialTab: "panoramica", dialogSize: "compact" });
    },
    [attiveRows, chiuseRows],
  );

  const attiveLegacyRows = useMemo(
    () =>
      attiveRows.map((row) =>
        rowToLegacyAttiva(row, schedeStore, logsByLavorazioneId.get(row.id), addettiRecords),
      ),
    [attiveRows, schedeStore, logsByLavorazioneId, addettiRecords],
  );

  const storicoLegacyRows = useMemo(
    () =>
      chiuseRows.map((row) =>
        rowToLegacyArchiviata(row, schedeStore, logsByLavorazioneId.get(row.id), addettiRecords),
      ),
    [chiuseRows, schedeStore, logsByLavorazioneId, addettiRecords],
  );

  const flashRow = useCallback((id: string) => {
    if (flashClearRef.current) clearTimeout(flashClearRef.current);
    setFlashRowId(id);
    flashClearRef.current = setTimeout(() => {
      setFlashRowId(null);
      flashClearRef.current = null;
    }, 1400);
  }, []);

  const { moveStato } = useLavorazioneStatoMoveMutation({
    updateLav,
    statiChiusiIds,
    onSuccess: flashRow,
    onError: (_id, err) => gestToast.errorOnce(`lav-stato-${_id}`, err, { module: "lavorazioni", action: "update" }),
  });

  const createdBy = user?.id ?? null;

  const mutErr = removeLav.isError
    ? formatSupabaseError(removeLav.error, { module: "lavorazioni", action: "delete" })
    : null;
  // Non bloccare l'UI inline per update ottimistici (stato/priorità).
  const mutPendingBlocking =
    removeLav.isPending ||
    restoreLav.isPending ||
    concludeLav.isPending ||
    updateCompletamentoLav.isPending;

  const foregroundOverlayActive = useGestionaleForegroundOverlayActive();
  const capturePageDropRef = useRef<LavorazioniCapturePageDropHandle | null>(null);
  const capturePageDropDisabled =
    !canEditWorkOrders || !createdBy || mutPendingBlocking || foregroundOverlayActive;
  const handlePageCaptureDrop = useCallback(
    (file: File) => {
      if (capturePageDropDisabled) return;
      capturePageDropRef.current?.openWithFile(file);
    },
    [capturePageDropDisabled, capturePageDropRef],
  );

  const onStatoRow = useCallback(
    (row: LavorazioneListRow, next: string) => {
      if (!canEditWorkOrders) return;
      moveStato(row.id, next);
    },
    [moveStato, canEditWorkOrders],
  );

  const onPrioritaRow = useCallback(
    (row: LavorazioneListRow, next: string) => {
      if (!canEditWorkOrders) return;
      if (!prioritaOpts.includes(next as PrioritaLavorazione)) return;
      updateLav.mutate(
        { id: row.id, data: { priorita: next as PrioritaLavorazione } },
        {
          onSuccess: () => {
            flashRow(row.id);
            updateLav.reset();
          },
          onError: (err) => {
            gestToast.errorOnce(`lav-priorita-${row.id}`, err, { module: "lavorazioni", action: "update" });
          },
        },
      );
    },
    [updateLav, flashRow, canEditWorkOrders, prioritaOpts, gestToast],
  );

  const onAddettoRow = useCallback(
    async (row: LavorazioneListRow, next: string) => {
      if (!canEditWorkOrders) return;
      const clean = next.trim();
      if (!clean || !globalOpts.lavorazioni.addetti.includes(clean)) return;
      const beforeAddetto = addettoLabel(row, schedeStore, logsByLavorazioneId.get(row.id), addettiRecords);
      {
        const prev = schedeStore;
        const current = getOrCreateBundle(prev, row.id);
        const ingresso = current.ingresso ?? {
          ...newSchedaMeta("ingresso", authorName),
          tipo: "ingresso" as const,
          campi: {
            dataIngresso: isoToItalianDay(row.data_ingresso ?? row.created_at),
            cliente: clienteLabel(row) === "—" ? "" : clienteLabel(row),
            cantiere: "",
            utilizzatore: utilizzatoreLabel(row, prev) === "—" ? "" : utilizzatoreLabel(row, prev),
            tipoAttrezzatura: "",
            marcaAttrezzatura: row.mezzo?.marca ?? "",
            modelloAttrezzatura: row.mezzo?.modello ?? "",
            matricola: row.mezzo?.matricola ?? "",
            nScuderia: row.mezzo?.numero_scuderia ?? "",
            oreLavoro: "",
            tipoTelaio: "",
            marcaTelaio: "",
            modelloTelaio: "",
            vin: "",
            targa: row.mezzo?.targa ?? "",
            km: "",
            descrizioneAnomalia: row.note ?? "",
            livelloCarburante: "",
            addettoAccettazione: clean,
            richiedente: "",
    richiedenteTelefono: "",
            noteIntervento: "",
          },
        };
        const updated = {
          ...prev,
          [row.id]: {
            ...current,
            ingresso: {
              ...ingresso,
              updatedAt: new Date().toISOString(),
              updatedBy: authorName.trim() || "Operatore",
              campi: {
                ...ingresso.campi,
                addettoAccettazione: clean,
                richiedente: (ingresso.campi as Partial<SchedaIngressoFields>).richiedente ?? "",
                noteIntervento: (ingresso.campi as Partial<SchedaIngressoFields>).noteIntervento ?? "",
              },
            },
          },
        };
        const schedeSnapshot = snapshotSchedeStore(qc);
        applyOptimisticSchedeStore(qc, updated);
        const persistRes = await persistSchedeAndSync(persistSchedeStore(updated, row.id), {
          syncAfter: false,
          rollbackSnapshot: schedeSnapshot,
        });
        if (!persistRes.ok) return;
      }
      const logContext = lavorazioneLogContextFromListRow(row, schedeStore);
      try {
        const sb = await getBrowserSupabase();
        await writeModificaLog(sb, {
          entita: "lavorazioni",
          entita_id: row.id,
          azione: "UPDATE",
          autore_id: user?.id ?? null,
          payload: {
            before: { addetto: beforeAddetto },
            after: { addetto: clean },
            ...(logContext ? { context: logContext } : {}),
          },
        });
      } catch (e) {
        const detail = e instanceof Error ? e.message : String(e);
        gestToast.warning(`Modifica salvata ma log non registrato: ${detail}`);
      }
      flashRow(row.id);
    },
    [authorName, canEditWorkOrders, flashRow, gestToast, globalOpts.lavorazioni.addetti, addettiRecords, logsByLavorazioneId, persistSchedeAndSync, qc, schedeStore, user?.id],
  );

  function openEliminaConfirm(row: LavorazioneListRow) {
    if (!canDeleteRecords || row.archived === true) return;
    setEliminaConfirmRow(row);
  }

  function confirmEliminaLavorazione() {
    const row = eliminaConfirmRow;
    if (!row || !canDeleteRecords) return;
    removeLav.mutate(row.id, {
      onSuccess: () => {
        gestToast.successOnce("lav-delete", "Lavorazione eliminata.");
        setEliminaConfirmRow(null);
        setSchedeRow((cur) => (cur?.row.id === row.id ? null : cur));
        flashRow(row.id);
        void lavModificheLogQuery.refetch();
      },
      onError: (err) => {
        gestToast.errorOnce("lav-delete", err, { module: "lavorazioni", action: "delete" });
      },
    });
  }

  function openConcludiConfirm(row: LavorazioneListRow) {
    if (!canEditWorkOrders || row.stato !== "completata" || row.archived === true) return;
    setConcludiConfirmRow(row);
  }

  const onOpenAttivaInfo = useCallback((row: LavorazioneListRow) => {
    setSchedeRow({ row, origine: "attiva", initialTab: "panoramica", dialogSize: "compact" });
  }, []);

  const onOpenAttivaSchede = useCallback((row: LavorazioneListRow) => {
    setSchedeRow({ row, origine: "attiva", initialTab: "schede", dialogSize: "hub" });
  }, []);

  const onOpenSchedeFromCapture = useCallback(
    async (req: CaptureSchedeOpenRequest): Promise<boolean> => {
      const row = await resolveLavorazioneListRowForSchedeOpen(
        req.lavorazioneId,
        attiveRows,
        () =>
          attiveQuery.refetch() as Promise<{ data?: readonly LavorazioneListRow[] } | void>,
      );
      if (!row) {
        gestToast.error("Lavorazione in corso non trovata. Aggiorna l'elenco e riprova.");
        return false;
      }
      const base = getOrCreateBundle(schedeStore, row.id, row.codice);
      const postStages =
        req.sequentialStages && req.sequentialStages.length > 0
          ? [req.schedaTipo, ...req.sequentialStages]
          : [req.schedaTipo];
      const patch =
        postStages.length > 1
          ? buildCaptureMultiSchedaBundlePatch({
              lavorazioneId: row.id,
              fields: req.fieldRows,
              createdBy: createdBy ?? authorName ?? "Operatore",
              stages: postStages,
              addettiRecords: globalOpts.lavorazioni.addettiRecords,
              magazzino: magazzinoQuery.data ?? [],
            })
          : buildCaptureBundleSchedaPatch({
              lavorazioneId: row.id,
              schedaTipo: req.schedaTipo,
              fields: req.fieldRows,
              createdBy: createdBy ?? authorName ?? "Operatore",
              addettiRecords: globalOpts.lavorazioni.addettiRecords,
              magazzino: magazzinoQuery.data ?? [],
            });
      setSchedeRow({
        row,
        origine: "attiva",
        initialTab: "schede",
        dialogSize: "hub",
        initialSchedaStage: req.schedaTipo,
        bundleOverride: mergeCaptureBundlePatch(base, patch),
        captureHandoff:
          req.sequentialStages && req.sequentialStages.length > 0
            ? {
                sequentialStages: req.sequentialStages,
                identMismatchWarnings: req.identMismatchWarnings,
                multiSchedaLabels: req.multiSchedaLabels,
              }
            : undefined,
      });
      return true;
    },
    [attiveQuery, attiveRows, authorName, createdBy, gestToast, globalOpts.lavorazioni.addettiRecords, magazzinoQuery.data, schedeStore],
  );

  const onViewExistingScheda = useCallback(
    async (req: CaptureViewExistingSchedaRequest): Promise<boolean> => {
      const row = await resolveLavorazioneListRowForSchedeOpen(
        req.lavorazioneId,
        attiveRows,
        () =>
          attiveQuery.refetch() as Promise<{ data?: readonly LavorazioneListRow[] } | void>,
      );
      if (!row) {
        gestToast.error("Lavorazione in corso non trovata. Aggiorna l'elenco e riprova.");
        return false;
      }
      setSchedeRow({
        row,
        origine: "attiva",
        initialTab: "schede",
        dialogSize: "hub",
        initialSchedaStage:
          req.schedaTipo === "ingresso" ? undefined : req.schedaTipo,
      });
      return true;
    },
    [attiveQuery, attiveRows, gestToast],
  );

  const onOpenArchivioInfo = useCallback((row: LavorazioneListRow) => {
    setSchedeRow({ row, origine: "storico", initialTab: "panoramica", dialogSize: "compact" });
  }, []);

  const onOpenArchivioSchede = useCallback((row: LavorazioneListRow) => {
    setSchedeRow({ row, origine: "storico", initialTab: "schede", dialogSize: "hub" });
  }, []);

  const openCompletamentoEdit = useCallback(
    (row: LavorazioneListRow) => {
      if (!canEditWorkOrders || row.archived !== true || updateCompletamentoLav.isPending) return;
      setCompletamentoEditRow(row);
    },
    [canEditWorkOrders, updateCompletamentoLav.isPending],
  );

  function concludiActionBtnProps(row: LavorazioneListRow) {
    const awaitingCompletata = row.stato !== "completata" && row.archived !== true;
    return {
      disabled: mutPendingBlocking || loading || !canEditWorkOrders || row.archived === true,
      className: `${lavTableActionBtnSecondary}${awaitingCompletata ? " opacity-50" : ""}`,
      tooltipContent:
        row.stato === "completata" ? undefined : "Imposta come completata per archiviarla",
      tooltipDisabled: row.stato === "completata",
      onClick: () => onConcludiAction(row),
    };
  }

  function confirmConcludiLavorazione() {
    const row = concludiConfirmRow;
    if (!row || !canEditWorkOrders) return;
    concludeLav.mutate(row.id, {
      onSuccess: () => {
        gestToast.successOnce("lav-conclude", "Lavorazione conclusa e archiviata.");
        setConcludiConfirmRow(null);
        if (schedeRow?.row.id === row.id && schedeRow.origine === "attiva") {
          setSchedeRow(null);
        }
        flashRow(row.id);
        void lavModificheLogQuery.refetch();
      },
      onError: (err) => {
        gestToast.errorOnce("lav-conclude", err, { module: "lavorazioni", action: "update" });
      },
    });
  }

  async function submitRipristinaInLavorazione(row: LavorazioneListRow) {
    if (!canEditWorkOrders) return;
    const ok = await confirm({
      title: "Ripristinare lavorazione?",
      message: `«${macchinaLabel(row)}» tornerà tra le lavorazioni attive.`,
      confirmLabel: "Ripristina",
    });
    if (!ok) return;
    const preferred =
      statiInCorsoOpts.find((s) => s.id === "in_lavorazione") ??
      statiInCorsoOpts.find((s) => s.id === "accettazione") ??
      statiInCorsoOpts[0];
    const restoreStato = preferred?.id ?? resolveDefaultLavorazioneStatoId(globalOpts.lavorazioni.stati);
    if (!restoreStato || !isStatoInConfig(restoreStato, globalOpts.lavorazioni.stati)) {
      gestToast.warning("Nessuno stato attivo configurato per ripristinare la lavorazione.");
      return;
    }
    restoreLav.mutate(
      { id: row.id, stato: restoreStato },
      {
        onSuccess: () => {
          flashRow(row.id);
          void lavModificheLogQuery.refetch();
        },
        onError: (err) => {
          gestToast.errorOnce("lav-restore", err, { module: "lavorazioni", action: "update" });
        },
      },
    );
  }

  useEffect(() => {
    return () => {
      if (flashClearRef.current) clearTimeout(flashClearRef.current);
      if (navFlashClearRef.current) clearTimeout(navFlashClearRef.current);
    };
  }, []);

  const attiveRowsRef = useRef(attiveRows);
  const chiuseRowsRef = useRef(chiuseRows);
  attiveRowsRef.current = attiveRows;
  chiuseRowsRef.current = chiuseRows;

  useEffect(() => {
    const rawFocus = searchParams.get(Q_FOCUS_MEZZO)?.trim();
    if (rawFocus?.startsWith("hub-lav-")) {
      const t = window.setTimeout(() => {
        const lavId = rawFocus.slice("hub-lav-".length);
        openDetailById(lavId);
        flashRow(lavId);
        deferredRouterReplace(router, pathname, { scroll: false });
      }, 80);
      return () => window.clearTimeout(t);
    }

    const rawMezzo =
      searchParams.get(Q_LAVORAZIONI_MEZZO_ID)?.trim() ||
      (rawFocus && !rawFocus.startsWith("hub-lav-") ? rawFocus : "");
    if (!rawMezzo) return;

    const t = window.setTimeout(() => {
      deferredRouterReplace(router, pathname, { scroll: false });
      const mezzo = mezziCatalog.find((m) => m.id === rawMezzo);
      const resolved = mezzo ? { ...mezzo } : mezzoFilterStubFromId(rawMezzo);
      setNavMezzoFilter(resolved);
      const hitA = attiveRowsRef.current.filter(
        (lav) => lav.mezzo_id === rawMezzo || lavorazioneMatchesMezzo(resolved, lavRowToMatchShape(lav)),
      );
      const hitC = chiuseRowsRef.current.filter(
        (lav) => lav.mezzo_id === rawMezzo || lavorazioneMatchesMezzo(resolved, lavRowToMatchShape(lav)),
      );
      const ids = new Set<string>([...hitA.map((r) => r.id), ...hitC.map((r) => r.id)]);
      setNavBulkFlashIds(ids);
      if (navFlashClearRef.current) clearTimeout(navFlashClearRef.current);
      navFlashClearRef.current = setTimeout(() => {
        setNavBulkFlashIds(new Set());
        navFlashClearRef.current = null;
      }, 2000);
    }, 80);
    return () => window.clearTimeout(t);
  }, [searchParams, pathname, router, flashRow, openDetailById, mezziCatalog]);

  function cycleSort<T extends string>(
    curCol: T | null,
    setCol: (c: T | null) => void,
    setPhase: Dispatch<SetStateAction<SortPhase>>,
    k: T,
  ) {
    if (curCol !== k) {
      setCol(k);
      setPhase("asc");
      return;
    }
    setPhase((prev) => {
      if (prev === "asc") return "desc";
      if (prev === "desc") {
        setCol(null);
        return "natural";
      }
      return "asc";
    });
  }

  const sortedAttive = useMemo(() => {
    const rows = [...attiveRowsFiltered];
    rows.sort((a, b) => {
      if (sortPhaseA === "natural" || sortColA === null) {
        // Ordine naturale: più vecchia in alto, nuova in fondo.
        const ta = new Date(a.data_ingresso ?? a.created_at).getTime();
        const tb = new Date(b.data_ingresso ?? b.created_at).getTime();
        if (ta !== tb) return ta - tb;
        return a.id.localeCompare(b.id);
      }
      const p = cmpAtt(a, b, sortColA, sortPhaseA, schedeSortIndex, statoOrderIds);
      if (p !== 0) return p;
      const ta = new Date(a.data_ingresso ?? a.created_at).getTime();
      const tb = new Date(b.data_ingresso ?? b.created_at).getTime();
      if (ta !== tb) return ta - tb;
      return a.id.localeCompare(b.id);
    });
    return rows;
  }, [attiveRowsFiltered, sortColA, sortPhaseA, schedeSortIndex, statoOrderIds]);

  const sortedChiuse = useMemo(() => {
    const rows = [...chiuseRowsFiltered];
    rows.sort((a, b) => {
      if (sortPhaseC === "natural" || sortColC === null) {
        const ta = new Date(dataCompletamentoIso(a)).getTime();
        const tb = new Date(dataCompletamentoIso(b)).getTime();
        if (tb !== ta) return tb - ta;
        return b.id.localeCompare(a.id);
      }
      const p = cmpCh(a, b, sortColC, sortPhaseC, schedeSortIndex);
      if (p !== 0) return p;
      const ta = new Date(dataCompletamentoIso(a)).getTime();
      const tb = new Date(dataCompletamentoIso(b)).getTime();
      if (tb !== ta) return tb - ta;
      return b.id.localeCompare(a.id);
    });
    return rows;
  }, [chiuseRowsFiltered, sortColC, sortPhaseC, schedeSortIndex]);

  const listPageSize = useResponsiveListPageSize();

  const {
    page: pageA,
    setPage: setPageA,
    pageCount: pageCountA,
    sliceItems: sliceA,
    showPager: showPagerA,
    label: labelA,
    resetPage: resetPageA,
  } = useClientPagination(sortedAttive.length, listPageSize);
  useEffect(() => {
    resetPageA();
  }, [filtersAttive, attiveRowsFiltered.length, searchApplied, advancedFilters, listPageSize, resetPageA]);
  const pagedAttive = useMemo(() => sliceA(sortedAttive), [sortedAttive, sliceA, pageA]);

  const {
    page: pageC,
    setPage: setPageC,
    pageCount: pageCountC,
    sliceItems: sliceC,
    showPager: showPagerC,
    label: labelC,
    resetPage: resetPageC,
  } = useClientPagination(sortedChiuse.length, listPageSize);
  useEffect(() => {
    resetPageC();
  }, [filtersChiuse, chiuseRowsFiltered.length, searchApplied, advancedFilters, listPageSize, resetPageC]);
  const pagedChiuse = useMemo(() => sliceC(sortedChiuse), [sortedChiuse, sliceC, pageC]);

  const pagedChiuseIdsKey = useMemo(
    () => pagedChiuse.map((row) => row.id).sort().join(","),
    [pagedChiuse],
  );

  useEffect(() => {
    if (!needsChiuseFetch || needsFullSchedeFetch || !pagedChiuseIdsKey) return;
    const ids = pagedChiuseIdsKey.split(",").filter(Boolean);
    void ensureSchedeBundlesInCache(qc, ids);
  }, [needsChiuseFetch, needsFullSchedeFetch, pagedChiuseIdsKey, qc]);

  const pagedAttiveIdsKey = useMemo(
    () => pagedAttive.map((row) => row.id).sort().join(","),
    [pagedAttive],
  );

  useEffect(() => {
    if (needsFullSchedeFetch || !pagedAttiveIdsKey) return;
    const ids = pagedAttiveIdsKey.split(",").filter(Boolean);
    void ensureSchedeBundlesInCache(qc, ids);
  }, [needsFullSchedeFetch, pagedAttiveIdsKey, qc]);

  const archivioPagedSchedePending = useMemo(
    () =>
      pagedChiuse.length > 0 &&
      pagedChiuse.some((row) => schedeStore[row.id] === undefined),
    [pagedChiuse, schedeStore],
  );

  const mobileProfileUserIds = useMemo(() => {
    const ids = new Set<string>();
    const collect = (row: LavorazioneListRow) => {
      if (row.updated_by?.trim()) ids.add(row.updated_by.trim());
      if (row.created_by?.trim()) ids.add(row.created_by.trim());
    };
    for (const row of pagedAttive) collect(row);
    for (const row of pagedChiuse) collect(row);
    return [...ids];
  }, [pagedAttive, pagedChiuse]);
  const lazyProfileNames = useLavorazioneProfileNamesQuery(mobileProfileUserIds);
  const resolveMobileProfile = useCallback(
    (row: LavorazioneListRow) =>
      mergeLazyProfileNamesIntoResolver(
        buildLavorazioneRowProfileResolver(row, user?.id ?? null, authorName),
        lazyProfileNames,
      ),
    [authorName, lazyProfileNames, user?.id],
  );

  const schedeStoreRef = useRef(schedeStore);
  schedeStoreRef.current = schedeStore;
  const logsByLavorazioneIdRef = useRef(logsByLavorazioneId);
  logsByLavorazioneIdRef.current = logsByLavorazioneId;

  const archivioPagedBundleRevisionKey = useMemo(
    () =>
      pagedChiuse
        .map((row) => `${row.id}:${lavorazioneSchedeBundleRevision(schedeStore[row.id])}`)
        .join(","),
    [pagedChiuse, schedeStore],
  );

  const archivioMobileUltimaModificaMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof resolveLavorazioneUltimaModifica>>();
    for (const row of pagedChiuse) {
      map.set(
        row.id,
        resolveLavorazioneUltimaModifica(row, schedeStore[row.id], {
          resolveUserId: resolveMobileProfile(row),
        }),
      );
    }
    return map;
  }, [pagedChiuse, archivioPagedBundleRevisionKey, resolveMobileProfile, schedeStore]);

  const focusLavorazioneInTable = useCallback(
    (id: string) => {
      setLavLogOpen(false);

      const scrollToRow = (elementId: string) => {
        window.setTimeout(() => {
          document.getElementById(elementId)?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 120);
      };

      const idxA = sortedAttive.findIndex((r) => r.id === id);
      if (idxA >= 0) {
        setPageA(Math.floor(idxA / listPageSize) + 1);
        flashRow(id);
        scrollToRow(`lavorazioni-row-${id}`);
        return;
      }

      const idxC = sortedChiuse.findIndex((r) => r.id === id);
      if (idxC >= 0) {
        setPageC(Math.floor(idxC / listPageSize) + 1);
        flashRow(id);
        scrollToRow(`lavorazioni-storico-row-${id}`);
        return;
      }

      flashRow(id);
    },
    [flashRow, listPageSize, setPageA, setPageC, sortedAttive, sortedChiuse],
  );

  const focusLavorazioneInTableRef = useRef(focusLavorazioneInTable);
  focusLavorazioneInTableRef.current = focusLavorazioneInTable;

  useEffect(() => {
    const id = searchParams.get(Q_FOCUS_LAV_ROW)?.trim();
    if (!id) {
      consumedFocusLavRef.current = null;
      return;
    }
    if (consumedFocusLavRef.current === id) return;
    consumedFocusLavRef.current = id;

    deferredRouterReplace(router, pathname, { scroll: false });

    const t = window.setTimeout(() => {
      focusLavorazioneInTableRef.current(id);
    }, 80);
    return () => window.clearTimeout(t);
  }, [searchParams, pathname, router]);

  useEffect(() => {
    if (!globalPerm.isAdmin) return;
    markAdminNotifRead();
    if (typeof document !== "undefined") {
      document.title = document.title.replace(/^\(\d+|99\+\)\s*/, "");
    }
  }, [globalPerm.isAdmin, markAdminNotifRead]);

  /**
   * EDIT_INGRESSO_ORDER (v1):
   * 1. scheda già persistita dal modal
   * 2. refetch mezzi + row lavorazione (W5)
   * 3. executeInterventoWrite — unico entry point; sync interno a write-contract
   */
  async function syncIngressoToBackend(
    staleRow: LavorazioneListRow,
    campi: SchedaIngressoFields,
    mezzoUpdatePlan?: import("@/lib/domain/mezzo/mezzo-update-from-scheda-plan").MezzoUpdateFromSchedaPlan,
  ) {
    await qc.refetchQueries({ queryKey: QK.mezzi });
    const freshRows =
      qc.getQueryData<MezzoGestito[]>(mezziListQueryKey("list", null)) ??
      qc.getQueriesData<MezzoGestito[]>({ queryKey: QK.mezzi }).find(([, data]) => data?.length)?.[1] ??
      mezziListQ.data ??
      [];
    const catalog = freshRows;

    await qc.refetchQueries({ queryKey: QK.lavorazioniQueries });
    const freshRow =
      qc
        .getQueriesData<LavorazioneListRow[]>({ queryKey: QK.lavorazioniQueries })
        .flatMap(([, data]) => data ?? [])
        .find((r) => r.id === staleRow.id) ??
      attiveRows.find((r) => r.id === staleRow.id) ??
      chiuseRows.find((r) => r.id === staleRow.id) ??
      staleRow;

    const writeDeps = {
      upsertMezzo: ({
        fields,
        preferredMezzoId,
        updatePlan,
        lavorazioneId,
      }: {
        fields: SchedaIngressoFields;
        preferredMezzoId?: string | null;
        updatePlan?: import("@/lib/domain/mezzo/mezzo-update-from-scheda-plan").MezzoUpdateFromSchedaPlan;
        lavorazioneId?: string | null;
      }) =>
        upsertMezzoFromSchedaIngresso({
          fields,
          mezziCatalog: catalog,
          preferredMezzoId,
          updatePlan,
          lavorazioneId,
          create: (data) => createMezzo.mutateAsync(data),
          update: (id, data) => updateMezzo.mutateAsync({ id, data }),
        }),
      updateLavorazione: async (id: string, patch: Parameters<typeof updateLav.mutateAsync>[0]["data"]) => {
        await updateLav.mutateAsync({ id, data: patch });
      },
    };

    const { result } = await executeInterventoWriteEntry(
      {
        mode: "edit",
        idempotencyKey: `edit-${freshRow.id}`,
        fields: campi,
        mezziCatalog: catalog,
        meta: {
          row: freshRow,
          writeContext: { source: "manual", mezzoUpdatePlan },
        },
      },
      writeDeps,
    );

    if (!result.ok) {
      if (result.error === "MEZZO_STALE_CONFLICT") {
        logMezzoSchedaConflictTelemetry({
          event: "MEZZO_STALE_CONFLICT",
          mezzoId: freshRow.mezzo_id,
          lavorazioneId: freshRow.id,
        });
      }
      logInterventoTelemetry("intervento_sync_drift_detected", {
        lavorazioneId: freshRow.id,
        stage: result.stage,
        mismatch: true,
      });
      throw new Error(result.error);
    }
  }

  function resetRicercaPagina() {
    setSearchInput("");
    setSearchApplied("");
  }

  function resetFiltriPagina() {
    setAdvancedFilters(LAVORAZIONI_ADVANCED_FILTERS_EMPTY);
    saveGestionaleAdvancedFiltersPersisted(LAVORAZIONI_ADVANCED_FILTERS_EMPTY);
    setNavMezzoFilter(null);
    setFiltriAttiviEspansi(false);
    resetRicercaPagina();
  }

  const lavorazioniById = useMemo(() => {
    const map = new Map<string, LavorazioneListRow>();
    for (const row of attiveRows) map.set(row.id, row);
    for (const row of chiuseRows) map.set(row.id, row);
    return map;
  }, [attiveRows, chiuseRows]);

  const resolveLavorazioneLogOggetto = useMemo(
    () => buildLavorazioneLogOggettoResolver(lavorazioniById, schedeStore),
    [lavorazioniById, schedeStore],
  );

  const logDisplayEntries = useMemo(
    () =>
      buildLogModificheDisplayEntries(
        lavModificheLogQuery.data ?? [],
        (row) => logAutoreLabel(row, user?.id ?? null, authorName),
        {
          resolveOggetto: resolveLavorazioneLogOggetto,
          statiLavorazione: statiOpts,
        },
      ),
    [lavModificheLogQuery.data, user?.id, authorName, resolveLavorazioneLogOggetto, statiOpts],
  );

  const archivioHeadCount =
    archivioCountQuery.data !== undefined ? archivioCountQuery.data : null;

  const archivioFilteredCount = needsChiuseFetch
    ? chiuseQuery.isPending && archivioHeadCount !== null
      ? archivioHeadCount
      : chiuseRowsFiltered.length
    : archivioHeadCount;

  const totalFilteredCount = attiveRowsFiltered.length + (archivioFilteredCount ?? 0);

  const loading = attiveQuery.isLoading || chiuseQuery.isLoading;
  const initialListLoadingRaw = attiveQuery.isPending;
  const listLoadingFailsafe = useLoadingFailsafe(initialListLoadingRaw, LIST_QUERY_LOADING_FAILSAFE_MS);
  const initialListLoading = initialListLoadingRaw && !listLoadingFailsafe;
  const archivioTableLoading =
    archivioSectionOpen &&
    (chiuseQuery.isPending ||
      (needsFullSchedeFetch
        ? chiuseRows.length > 0 && schedeEnsureLoading
        : archivioPagedSchedePending && (schedeEnsureLoading || schedeEnsureFetching)));
  const archivioCardTitle =
    archivioFilteredCount === null
      ? "Archivio lavorazioni (…)"
      : `Archivio lavorazioni (${archivioFilteredCount})`;
  const loadErrRaw = attiveQuery.isError ? attiveQuery.error : chiuseQuery.isError ? chiuseQuery.error : null;
  const loadErr = loadErrRaw
    ? formatSupabaseError(loadErrRaw, { module: "lavorazioni", action: "read" })
    : listLoadingFailsafe && initialListLoadingRaw
      ? "Il caricamento delle lavorazioni sta impiegando troppo tempo. Verifica la connessione e riprova."
      : null;

  const onConcludiAction = useCallback(
    (row: LavorazioneListRow) => {
      if (mutPendingBlocking || loading || !canEditWorkOrders || row.archived === true) return;
      if (row.stato !== "completata") {
        gestToast.warning("Imposta la lavorazione come completata prima di archiviarla.");
        return;
      }
      openConcludiConfirm(row);
    },
    [mutPendingBlocking, loading, canEditWorkOrders, gestToast],
  );

  const onRipristinaArchivioRow = useCallback((row: LavorazioneListRow) => {
    void submitRipristinaInLavorazione(row);
  }, []);

  const renderAttiveDesktopRow = useCallback(
    (index: number) => {
      const row = pagedAttive[index];
      if (!row) return null;
      return (
        <LavorazioneAttivaTableRow
          key={row.id}
          row={row}
          bundle={schedeStore[row.id]}
          flash={flashRowId === row.id}
          navBulkFlash={navBulkFlashIds.has(row.id)}
          rowIndex={index}
          rowCount={pagedAttive.length}
          loading={loading}
          canEditWorkOrders={canEditWorkOrders}
          mutPendingBlocking={mutPendingBlocking}
          statiOpts={statiOpts}
          statiRapidiPillOpts={statiRapidiPillOpts}
          prioritaPillOpts={prioritaPillOpts}
          tablePillOptions={tablePillOptions}
          statoPillStyle={
            statoPillStylesById[row.stato] ?? statoPillShellStyle(statoDisplayColor(row.stato, statiOpts))
          }
          prioritaPillStyle={
            prioritaPillStylesById[row.priorita] ?? prioritaPillShellStyle(prioColor(row.priorita))
          }
          addettoColors={globalOpts.lavorazioni.addettoColors}
          addettiRecords={addettiRecords}
          addetti={globalOpts.lavorazioni.addetti}
          onStatoRow={onStatoRow}
          onPrioritaRow={onPrioritaRow}
          onAddettoRow={onAddettoRow}
          onConcludiAction={onConcludiAction}
          onOpenInfo={onOpenAttivaInfo}
          onOpenSchede={onOpenAttivaSchede}
        />
      );
    },
    [
      pagedAttive,
      flashRowId,
      navBulkFlashIds,
      loading,
      canEditWorkOrders,
      mutPendingBlocking,
      statiOpts,
      statiRapidiPillOpts,
      prioritaPillOpts,
      tablePillOptions,
      statoPillStylesById,
      prioritaPillStylesById,
      globalOpts.lavorazioni.addettoColors,
      addettiRecords,
      globalOpts.lavorazioni.addetti,
      onStatoRow,
      onPrioritaRow,
      onAddettoRow,
      onConcludiAction,
      onOpenAttivaInfo,
      onOpenAttivaSchede,
      prioColor,
      schedeStore,
    ],
  );

  const renderArchivioDesktopRow = useCallback(
    (index: number) => {
      const row = pagedChiuse[index];
      if (!row) return null;
      const store = schedeStoreRef.current;
      const logs = logsByLavorazioneIdRef.current;
      return (
        <LavorazioneArchivioTableRow
          key={row.id}
          row={row}
          bundle={store[row.id]}
          flash={flashRowId === row.id}
          navBulkFlash={navBulkFlashIds.has(row.id)}
          rowIndex={index}
          rowCount={pagedChiuse.length}
          canEditWorkOrders={canEditWorkOrders}
          mutPendingBlocking={mutPendingBlocking}
          loading={loading}
          addettoLogs={logs.get(row.id)}
          addettoColors={globalOpts.lavorazioni.addettoColors}
          addettiRecords={addettiRecords}
          onRipristina={onRipristinaArchivioRow}
          onOpenInfo={onOpenArchivioInfo}
          onOpenSchede={onOpenArchivioSchede}
          onEditCompletamento={openCompletamentoEdit}
          completamentoEditDisabled={updateCompletamentoLav.isPending}
        />
      );
    },
    [
      pagedChiuse,
      flashRowId,
      navBulkFlashIds,
      canEditWorkOrders,
      mutPendingBlocking,
      loading,
      globalOpts.lavorazioni.addettoColors,
      addettiRecords,
      onRipristinaArchivioRow,
      onOpenArchivioInfo,
      onOpenArchivioSchede,
      openCompletamentoEdit,
      updateCompletamentoLav.isPending,
    ],
  );

  const archivioVirtualRows = useMemo(
    () => ({
      rowCount: pagedChiuse.length,
      renderRow: renderArchivioDesktopRow,
      estimateRowHeight: 72,
    }),
    [pagedChiuse.length, renderArchivioDesktopRow, archivioPagedBundleRevisionKey],
  );

  const onPrintLavorazioniInCorso = useCallback(async () => {
    if (printBusy) return;
    setPrintBusy(true);
    try {
      await openPdfArtifact("lavorazioni-in-corso");
    } finally {
      setPrintBusy(false);
    }
  }, [printBusy]);

  return (
    <GestionaleSectionGate module="lavorazioni">
    <LavorazioniPageMenuProvider
      listRefreshBusy={listRefreshBusy}
      printBusy={printBusy}
      onRefresh={() => void refreshLavorazioniLists()}
      onOpenLog={() => setLavLogOpen(true)}
      onPrint={onPrintLavorazioniInCorso}
      listViewMode={listViewMode}
      onToggleListViewMode={() => setListViewMode((m) => (m === "table" ? "kanban" : "table"))}
      filtersActive={hasPageClientFilters || Boolean(navMezzoFilter)}
    >
    <div ref={listLayoutRef} className={`lavorazioni-scroll-scope ${layoutPageRoot} ${listLayoutClassName}`.trim()}>
    <>
      <LavorazioniPageHeaderToolbar />

      <div className={dsStackPage}>
        {loadErr ? (
          <LoadingErrorState
            title="Impossibile caricare le lavorazioni"
            description={loadErr}
            onRetry={() => {
              void attiveQuery.refetch();
              void chiuseQuery.refetch();
            }}
          />
        ) : null}

        {mutErr ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100">
            {mutErr}
          </div>
        ) : null}

        {navMezzoFilter ? (
          <div className={`flex flex-nowrap items-center justify-between gap-2 px-3 py-2 text-sm sm:flex-wrap ${dsAccentSoftBanner}`}>
            <span>
              Filtro mezzo: <span className="font-semibold tabular-nums">{navMezzoFilterBadgeLabel(navMezzoFilter)}</span>
            </span>
            <button
              type="button"
              onClick={() => setNavMezzoFilter(null)}
              className={`${erpBtnNeutral} shrink-0 font-semibold`}
              aria-label="Rimuovi filtro mezzo"
            >
              × Rimuovi
            </button>
          </div>
        ) : null}

        <LavorazioniListToolbar
          canEditWorkOrders={canEditWorkOrders}
          createdBy={createdBy}
          mutPendingBlocking={mutPendingBlocking}
          searchInput={searchInput}
          onSearchInputChange={(e) => setSearchInput(e.target.value)}
          onSearchEnter={flushPageSearch}
          filtriAttiviEspansi={filtriAttiviEspansi}
          onFiltersToggle={() => setFiltriAttiviEspansi((o) => !o)}
          hasPageClientFilters={hasPageClientFilters}
          navMezzoFilterActive={Boolean(navMezzoFilter)}
          advancedFilters={advancedFilters}
          onAdvancedFiltersChange={patchAdvancedFilters}
          filterCatalog={filterCatalog}
          addettiRecords={addettiRecords}
          statiOpts={statiOpts}
          onFilterReset={resetFiltriPagina}
          totalFilteredCount={totalFilteredCount}
          searchApplied={searchApplied}
          onSearchReset={resetRicercaPagina}
          attiveFilteredCount={attiveRowsFiltered.length}
          chiuseFilteredCount={archivioFilteredCount ?? 0}
          onOpenCreate={openCreateModal}
          onPrimeCreate={primeCreateModal}
          onCaptureLavorazioneCreated={(id, opts) => {
            if (!opts?.skipTableFocus) {
              void (async () => {
                await commitLavorazioneCreateSuccess(qc, id);
                invalidateSchedeStore();
                await ensureSchedeBundlesInCache(qc, [id]);
                focusLavorazioneInTable(id);
              })();
            }
          }}
          onOpenSchedeFromCapture={onOpenSchedeFromCapture}
          onViewExistingScheda={onViewExistingScheda}
          captureMezzi={mezziCatalog}
          captureSchedeStore={schedeStore}
          captureAttive={attiveLegacyRows}
          captureStorico={storicoLegacyRows}
          captureSharedGlobalOpts={globalOpts}
          captureSharedMezziCatalog={mezziCatalog}
          capturePageDropRef={capturePageDropRef}
          capturePageDropDisabled={capturePageDropDisabled}
          onCapturePageDrop={handlePageCaptureDrop}
        />

        <SkeletonBoundary loading={initialListLoading}>
        <LavorazioniListBodySection mode="content">
        <ShellCard
          title={`Lavorazioni in corso (${attiveRowsFiltered.length})`}
          collapsible
          defaultCollapsed={false}
          persistScope="lavorazioni"
          persistKey="attive"
        >
          {listViewMode === "kanban" ? (
            <LavorazioniKanbanView
              rows={attiveRowsFiltered}
              columns={statiInCorsoOpts}
              statiOpts={statiOpts}
              schedeStore={schedeStore}
              addettiRecords={addettiRecords}
              prioritaColors={globalOpts.lavorazioni.prioritaColors}
              addettoColors={globalOpts.lavorazioni.addettoColors}
              flashRowId={flashRowId}
              navBulkFlashIds={navBulkFlashIds}
              loading={loading}
              canDrag={canEditWorkOrders}
              onMoveStato={onStatoRow}
              emptyMessage={
                hasPageClientFilters || navMezzoFilter
                  ? "Nessuna lavorazione corrisponde alla ricerca o ai filtri selezionati."
                  : "Nessuna lavorazione."
              }
              closedEmptyMessage={
                hasPageClientFilters || navMezzoFilter
                  ? "Nessuna lavorazione completata corrisponde alla ricerca o ai filtri selezionati."
                  : "Nessuna lavorazione completata."
              }
              onOpenRow={(row) =>
                setSchedeRow({ row, origine: "attiva", initialTab: "panoramica", dialogSize: "compact" })
              }
              onOpenClosedRow={(row) =>
                setSchedeRow({ row, origine: "storico", initialTab: "panoramica", dialogSize: "compact" })
              }
            />
          ) : (
            <>
          {listLayout === "desktop" ? (
          <GestionaleListTable
            visibilityClass={GESTIONALE_LIST_DESKTOP_ONLY_CLASS}
            className={gestionaleLavorazioniDenseTableClass}
            colgroup={
              <>
                <col className={lavTableColIngressoClass} />
                <col className={lavTableColClienteClass} />
                <col className={lavTableColCantiereClass} />
                <col className={lavTableColAttrezzaturaClass} />
                <col className={lavTableColScuderiaClass} />
                <col className={lavTableColTargaClass} />
                <col className={lavTableColMatricolaClass} />
                <col className={lavTableColNoteClass} />
                <col style={statoPillColStyle} />
                <col style={prioritaPillColStyle} />
                <col style={addettoPillColStyle} />
                <col className={lavTableColAzioniClass} />
              </>
            }
            headRow={
              <>
                  <GlobalTableSortTh
                    label="Ingresso"
                    columnKey="ingresso"
                    sortColumn={sortColA}
                    sortPhase={sortPhaseA}
                    align="left"
                    onSort={(k) => cycleSort(sortColA, setSortColA, setSortPhaseA, k as SortKeyAtt)}
                  />
                  <GlobalTableSortTh
                    label="Cliente"
                    columnKey="cliente"
                    sortColumn={sortColA}
                    sortPhase={sortPhaseA}
                    onSort={(k) => cycleSort(sortColA, setSortColA, setSortPhaseA, k as SortKeyAtt)}
                  />
                  <GlobalTableSortTh
                    label="Cantiere"
                    columnKey="cantiere"
                    sortColumn={sortColA}
                    sortPhase={sortPhaseA}
                    onSort={(k) => cycleSort(sortColA, setSortColA, setSortPhaseA, k as SortKeyAtt)}
                  />
                  <GlobalTableSortTh
                    label={macchinaColLabel}
                    columnKey="macchina"
                    sortColumn={sortColA}
                    sortPhase={sortPhaseA}
                    onSort={(k) => cycleSort(sortColA, setSortColA, setSortPhaseA, k as SortKeyAtt)}
                  />
                  <GlobalTableSortTh
                    label="scud."
                    columnKey="nScuderia"
                    sortColumn={sortColA}
                    sortPhase={sortPhaseA}
                    align="center"
                    thClassName="gestionale-list-table-col-ident"
                    onSort={(k) => cycleSort(sortColA, setSortColA, setSortPhaseA, k as SortKeyAtt)}
                  />
                  <GlobalTableSortTh
                    label="Targa"
                    columnKey="targa"
                    sortColumn={sortColA}
                    sortPhase={sortPhaseA}
                    align="center"
                    thClassName="gestionale-list-table-col-ident"
                    onSort={(k) => cycleSort(sortColA, setSortColA, setSortPhaseA, k as SortKeyAtt)}
                  />
                  <GlobalTableSortTh
                    label="Matricola"
                    columnKey="matricola"
                    sortColumn={sortColA}
                    sortPhase={sortPhaseA}
                    align="center"
                    thClassName="gestionale-list-table-col-ident"
                    onSort={(k) => cycleSort(sortColA, setSortColA, setSortPhaseA, k as SortKeyAtt)}
                  />
                  <GlobalTableSortTh
                    label="Note"
                    columnKey="note"
                    sortColumn={sortColA}
                    sortPhase={sortPhaseA}
                    thClassName="gestionale-list-table-col-note"
                    onSort={(k) => cycleSort(sortColA, setSortColA, setSortPhaseA, k as SortKeyAtt)}
                  />
                  <GlobalTableSortTh
                    label="Stato"
                    columnKey="stato"
                    sortColumn={sortColA}
                    sortPhase={sortPhaseA}
                    align="center"
                    thClassName={lavTableColStatoAddettoInset}
                    onSort={(k) => cycleSort(sortColA, setSortColA, setSortPhaseA, k as SortKeyAtt)}
                  />
                  <GlobalTableSortTh
                    label="Priorità"
                    columnKey="priorita"
                    sortColumn={sortColA}
                    sortPhase={sortPhaseA}
                    align="center"
                    onSort={(k) => cycleSort(sortColA, setSortColA, setSortPhaseA, k as SortKeyAtt)}
                  />
                  <GlobalTableSortTh
                    label="Addetto"
                    columnKey="addetto"
                    sortColumn={sortColA}
                    sortPhase={sortPhaseA}
                    align="center"
                    thClassName={lavTableColStatoAddettoInset}
                    onSort={(k) => cycleSort(sortColA, setSortColA, setSortPhaseA, k as SortKeyAtt)}
                  />
                  <GestionaleListTableActionsHead />
              </>
            }
            empty={pagedAttive.length === 0}
            emptyMessage={
              hasPageClientFilters || navMezzoFilter
                ? "Nessuna lavorazione in corso corrisponde alla ricerca o ai filtri selezionati."
                : "Nessuna lavorazione in corso."
            }
            colSpan={12}
            virtualRows={{
              rowCount: pagedAttive.length,
              renderRow: renderAttiveDesktopRow,
              estimateRowHeight: 72,
            }}
          >
            {null}
          </GestionaleListTable>
          ) : null}

          {listLayout === "mobile" ? (
          <LavorazioniMobileListShell
            empty={pagedAttive.length === 0}
            emptyMessage={
              hasPageClientFilters || navMezzoFilter
                ? "Nessuna lavorazione in corso corrisponde alla ricerca o ai filtri selezionati."
                : "Nessuna lavorazione in corso."
            }
          >
            {pagedAttive.map((row) => {
              const concludiProps = concludiActionBtnProps(row);
              return (
                <LavorazioneAttivaMobileCard
                  key={row.id}
                  row={row}
                  bundle={schedeStore[row.id]}
                  loading={loading}
                  canEditWorkOrders={canEditWorkOrders}
                  mutPendingBlocking={mutPendingBlocking}
                  statiOpts={statiOpts}
                  statiRapidiPillOpts={statiRapidiPillOpts}
                  prioritaPillOpts={prioritaPillOpts}
                  tablePillOptions={tablePillOptions}
                  statoPillStyle={
                    statoPillStylesById[row.stato] ?? statoPillShellStyle(statoDisplayColor(row.stato, statiOpts))
                  }
                  prioritaPillStyle={
                    prioritaPillStylesById[row.priorita] ?? prioritaPillShellStyle(prioColor(row.priorita))
                  }
                  addetti={globalOpts.lavorazioni.addetti}
                  addettiRecords={addettiRecords}
                  addettoColors={globalOpts.lavorazioni.addettoColors}
                  ultimaModificaInfo={resolveLavorazioneUltimaModifica(row, schedeStore[row.id], {
                    resolveUserId: resolveMobileProfile(row),
                  })}
                  concludiDisabled={concludiProps.disabled ?? false}
                  concludiClassName={concludiProps.className ?? lavTableActionBtnSecondary}
                  concludiTooltip={concludiProps.tooltipContent}
                  onStatoRow={onStatoRow}
                  onPrioritaRow={onPrioritaRow}
                  onAddettoRow={onAddettoRow}
                  onConcludi={onConcludiAction}
                  onOpenInfo={onOpenAttivaInfo}
                  onOpenSchede={onOpenAttivaSchede}
                />
              );
            })}
          </LavorazioniMobileListShell>
          ) : null}


          {showPagerA ? <TablePagination page={pageA} pageCount={pageCountA} onPageChange={setPageA} label={labelA} /> : null}
          {serverListPagination ? (
            <ServerListLoadMore
              hasNextPage={attiveQuery.hasNextPage}
              isFetchingNextPage={attiveQuery.isFetchingNextPage}
              controls={attiveQuery.controls}
            />
          ) : null}
            </>
          )}
        </ShellCard>
        </LavorazioniListBodySection>
        </SkeletonBoundary>

        {listViewMode === "table" && !initialListLoading ? (
        <ShellCard
          title={archivioCardTitle}
          collapsible
          defaultCollapsed
          persistScope="lavorazioni"
          persistKey="archivio"
          persist={false}
          onCollapsedChange={(collapsed) => setArchivioSectionOpen(!collapsed)}
        >
          {!archivioSectionOpen ? null : (
          <SkeletonBoundary loading={archivioTableLoading}>
          <LavorazioniTableSection mode="content">
          <>
          {listLayout === "desktop" ? (
          <GestionaleListTable
            visibilityClass={GESTIONALE_LIST_DESKTOP_ONLY_CLASS}
            className={gestionaleLavorazioniDenseTableClass}
            colgroup={
              <>
                <col className={lavTableColIngressoClass} />
                <col className={lavTableColClienteClass} />
                <col className={lavTableColCantiereClass} />
                <col className={lavTableColAttrezzaturaClass} />
                <col className={lavTableColScuderiaClass} />
                <col className={lavTableColTargaClass} />
                <col className={lavTableColMatricolaClass} />
                <col className={lavTableColNoteClass} />
                <col style={statoPillColStyle} />
                <col style={prioritaPillColStyle} />
                <col style={addettoPillColStyle} />
                <col className={lavTableColAzioniClass} />
              </>
            }
            headRow={
              <>
                  <GlobalTableSortTh
                    label="Ingresso"
                    columnKey="ingresso"
                    sortColumn={sortColC}
                    sortPhase={sortPhaseC}
                    align="left"
                    onSort={(k) => cycleSort(sortColC, setSortColC, setSortPhaseC, k as SortKeyCh)}
                  />
                  <GlobalTableSortTh
                    label="Cliente"
                    columnKey="cliente"
                    sortColumn={sortColC}
                    sortPhase={sortPhaseC}
                    align="left"
                    onSort={(k) => cycleSort(sortColC, setSortColC, setSortPhaseC, k as SortKeyCh)}
                  />
                  <GlobalTableSortTh
                    label="Cantiere"
                    columnKey="cantiere"
                    sortColumn={sortColC}
                    sortPhase={sortPhaseC}
                    align="left"
                    onSort={(k) => cycleSort(sortColC, setSortColC, setSortPhaseC, k as SortKeyCh)}
                  />
                  <GlobalTableSortTh
                    label={macchinaColLabel}
                    columnKey="macchina"
                    sortColumn={sortColC}
                    sortPhase={sortPhaseC}
                    align="left"
                    onSort={(k) => cycleSort(sortColC, setSortColC, setSortPhaseC, k as SortKeyCh)}
                  />
                  <GlobalTableSortTh
                    label="scud."
                    columnKey="nScuderia"
                    sortColumn={sortColC}
                    sortPhase={sortPhaseC}
                    align="center"
                    thClassName="gestionale-list-table-col-ident"
                    onSort={(k) => cycleSort(sortColC, setSortColC, setSortPhaseC, k as SortKeyCh)}
                  />
                  <GlobalTableSortTh
                    label="Targa"
                    columnKey="targa"
                    sortColumn={sortColC}
                    sortPhase={sortPhaseC}
                    align="center"
                    thClassName="gestionale-list-table-col-ident"
                    onSort={(k) => cycleSort(sortColC, setSortColC, setSortPhaseC, k as SortKeyCh)}
                  />
                  <GlobalTableSortTh
                    label="Matricola"
                    columnKey="matricola"
                    sortColumn={sortColC}
                    sortPhase={sortPhaseC}
                    align="center"
                    thClassName="gestionale-list-table-col-ident"
                    onSort={(k) => cycleSort(sortColC, setSortColC, setSortPhaseC, k as SortKeyCh)}
                  />
                  <GlobalTableSortTh
                    label="Note"
                    columnKey="note"
                    sortColumn={sortColC}
                    sortPhase={sortPhaseC}
                    thClassName="gestionale-list-table-col-note"
                    onSort={(k) => cycleSort(sortColC, setSortColC, setSortPhaseC, k as SortKeyCh)}
                  />
                  <GlobalTableSortTh
                    label="Completamento"
                    columnKey="completamento"
                    sortColumn={sortColC}
                    sortPhase={sortPhaseC}
                    align="center"
                    highlightWhenActive={false}
                    thClassName={lavTableColStatoAddettoInset}
                    onSort={(k) => cycleSort(sortColC, setSortColC, setSortPhaseC, k as SortKeyCh)}
                  />
                  <GlobalTableSortTh
                    label="Ore lavoro"
                    columnKey="oreTotali"
                    sortColumn={sortColC}
                    sortPhase={sortPhaseC}
                    align="center"
                    onSort={(k) => cycleSort(sortColC, setSortColC, setSortPhaseC, k as SortKeyCh)}
                  />
                  <GlobalTableSortTh
                    label="Addetto"
                    columnKey="addetto"
                    sortColumn={sortColC}
                    sortPhase={sortPhaseC}
                    align="center"
                    thClassName={lavTableColStatoAddettoInset}
                    onSort={(k) => cycleSort(sortColC, setSortColC, setSortPhaseC, k as SortKeyCh)}
                  />
                  <GestionaleListTableActionsHead />
              </>
            }
            empty={pagedChiuse.length === 0}
            emptyMessage={
              hasPageClientFilters || navMezzoFilter
                ? "Nessun record in archivio corrisponde alla ricerca o ai filtri selezionati."
                : "Nessun record in archivio."
            }
            colSpan={12}
            virtualRows={archivioVirtualRows}
          >
            {null}
          </GestionaleListTable>
          ) : null}

          {listLayout === "mobile" ? (
          <LavorazioniMobileListShell
            empty={pagedChiuse.length === 0}
            emptyMessage={
              hasPageClientFilters || navMezzoFilter
                ? "Nessun record in archivio corrisponde alla ricerca o ai filtri selezionati."
                : "Nessun record in archivio."
            }
          >
            {pagedChiuse.map((row) => (
              <LavorazioneArchivioMobileCard
                key={row.id}
                row={row}
                bundle={schedeStore[row.id]}
                addettoLogs={logsByLavorazioneId.get(row.id)}
                canEditWorkOrders={canEditWorkOrders}
                mutPendingBlocking={mutPendingBlocking}
                loading={loading}
                prioritaColors={globalOpts.lavorazioni.prioritaColors}
                addettiRecords={addettiRecords}
                addettoColors={globalOpts.lavorazioni.addettoColors}
                ultimaModificaInfo={archivioMobileUltimaModificaMap.get(row.id)!}
                onRipristina={onRipristinaArchivioRow}
                onOpenInfo={onOpenArchivioInfo}
                onOpenSchede={onOpenArchivioSchede}
                onEditCompletamento={openCompletamentoEdit}
                completamentoEditDisabled={updateCompletamentoLav.isPending}
              />
            ))}
          </LavorazioniMobileListShell>
          ) : null}

          {showPagerC ? <TablePagination page={pageC} pageCount={pageCountC} onPageChange={setPageC} label={labelC} /> : null}
          {serverListPagination && needsChiuseFetch ? (
            <ServerListLoadMore
              hasNextPage={chiuseQuery.hasNextPage}
              isFetchingNextPage={chiuseQuery.isFetchingNextPage}
              controls={chiuseQuery.controls}
            />
          ) : null}
          </>
          </LavorazioniTableSection>
          </SkeletonBoundary>
          )}
        </ShellCard>
        ) : null}

      </div>

      <Drawer
        open={lavLogOpen}
        onClose={() => setLavLogOpen(false)}
        title="Log modifiche lavorazioni"
        ariaLabel="Log modifiche lavorazioni"
      >
        <div className={gestionaleLogDrawerPanelClass}>
              {lavModificheLogQuery.isError ? (
                <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                  Impossibile caricare il log dal server. Riprova più tardi.
                </p>
              ) : null}
              <div className={`${gestionaleLogScrollEmbeddedClass} min-h-0 min-w-0 flex-1`}>
                {lavModificheLogQuery.isLoading ? (
                  <LoadingFormSkeleton fields={3} className="px-1 py-2" />
                ) : logDisplayEntries.length === 0 ? (
                  <GestionaleLogEmpty message="Nessuna voce di log da mostrare." />
                ) : (
                  <GestionaleLogList>
                    {logDisplayEntries.map((entry) => (
                      <li key={entry.id} className="list-none">
                        <GestionaleLogEntryFourLines
                          vm={entry.vm}
                          onClick={() => focusLavorazioneInTable(entry.row.entita_id)}
                          title="Vai alla riga in tabella"
                        />
                      </li>
                    ))}
                  </GestionaleLogList>
                )}
              </div>
        </div>
      </Drawer>

      <SchedaConcurrencyMergeDialog
        open={concurrencyDialog != null}
        pending={concurrencyDialogPending}
        onCancel={handleConcurrencyCancel}
        onResolve={handleConcurrencyResolve}
      />

      {schedeRow ? (
        <SchedeLavorazioneModal
          open
          onClose={() => setSchedeRow(null)}
          lav={
            schedeRow.origine === "storico"
              ? rowToLegacyArchiviata(
                  schedeRow.row,
                  schedeStore,
                  logsByLavorazioneId.get(schedeRow.row.id),
                  addettiRecords,
                )
              : rowToLegacyAttiva(
                  schedeRow.row,
                  schedeStore,
                  logsByLavorazioneId.get(schedeRow.row.id),
                  addettiRecords,
                )
          }
          origine={schedeRow.origine}
          initialTab={schedeRow.initialTab}
          dialogSize={schedeRow.dialogSize}
          initialSchedaStage={schedeRow.initialSchedaStage}
          captureHandoff={schedeRow.captureHandoff}
          bundle={
            schedeRow.bundleOverride ??
            getOrCreateBundle(schedeStore, schedeRow.row.id, schedeRow.row.codice)
          }
          onPersist={onPersistSchedeBundle}
          onIngressoCommitted={async (campi, options) => {
            if (!schedeRow) return;
            try {
              await syncIngressoToBackend(schedeRow.row, campi, options?.mezzoUpdatePlan);
            } catch (err) {
              gestToast.error(err, { module: "lavorazioni", action: "update" });
            }
          }}
          attive={attiveLegacyRows}
          storico={storicoLegacyRows}
          mezzi={mezziCatalog}
          addetti={globalOpts.lavorazioni.addetti}
          currentUser={authorName}
          schedeStore={schedeStore}
          canDeleteLavorazione={
            schedeRow.origine === "attiva" && canDeleteLavorazioneAttiva(schedeRow.row, canDeleteRecords)
          }
          onDeleteLavorazione={() => openEliminaConfirm(schedeRow.row)}
          deleteLavorazionePending={removeLav.isPending && eliminaConfirmRow?.id === schedeRow.row.id}
        />
      ) : null}

      {canEditWorkOrders && createModalWarm ? (
      <LavorazioneCreateModal
        key={createOpen ? "lav-create-open" : "lav-create-closed"}
        open={createOpen}
        onClose={closeCreateModal}
        createdBy={createdBy}
        mezzi={mezziCatalog}
        sharedGlobalOpts={globalOpts}
        sharedMezziCatalog={mezziCatalog}
        schedeStore={schedeStore}
        attive={attiveLegacyRows}
        storico={storicoLegacyRows}
        onCreated={(id) => {
          invalidateSchedeStore();
          focusLavorazioneInTable(id);
          closeCreateModal();
        }}
      />
      ) : null}

      <GestionaleModalGate open={concludiConfirmRow != null}>
        <LavorazioneConcludiConfirmDialogLazy
        open={concludiConfirmRow != null}
        pending={concludeLav.isPending}
        onCancel={() => {
          if (!concludeLav.isPending) setConcludiConfirmRow(null);
        }}
        onConfirm={confirmConcludiLavorazione}
        />
      </GestionaleModalGate>

      {canEditWorkOrders && completamentoEditRow ? (
        <LavorazioneCompletamentoEditModal
          row={completamentoEditRow}
          onClose={() => {
            if (!updateCompletamentoLav.isPending) setCompletamentoEditRow(null);
          }}
          onSaved={() => {
            flashRow(completamentoEditRow.id);
            void lavModificheLogQuery.refetch();
          }}
        />
      ) : null}

      <GestionaleModalGate open={eliminaConfirmRow != null}>
        <LavorazioneEliminaConfirmDialogLazy
        open={eliminaConfirmRow != null}
        pending={removeLav.isPending}
        onCancel={() => {
          if (!removeLav.isPending) setEliminaConfirmRow(null);
        }}
        onConfirm={confirmEliminaLavorazione}
        />
      </GestionaleModalGate>

      {confirmDialog}
    </>
    </div>
    </LavorazioniPageMenuProvider>
    </GestionaleSectionGate>
  );
}
