"use client";

import "./lavorazioni-scroll.css";
import "./lavorazioni-select-theme.css";

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  GestionaleListTable,
  GestionaleListTableActionsHead,
  GlobalTableSortTh,
} from "@/components/gestionale/global-table";
import { PageHeader } from "@/components/gestionale/page-header";
import { GestionalePageToolbarActions } from "@/components/gestionale/page-header-toolbar";
import { ShellCard } from "@/components/gestionale/shell-card";
import { TablePagination } from "@/components/gestionale/table-pagination";
import { GestionaleSearchField } from "@/components/gestionale/gestionale-search-field";
import { LavorazioneCreateModal } from "@/components/gestionale/lavorazioni/lavorazione-create-modal";
import { LavorazioniKanbanView } from "@/components/gestionale/lavorazioni/lavorazioni-kanban-view";
import { LavorazioneConcludiConfirmDialog } from "@/components/gestionale/lavorazioni/lavorazione-concludi-confirm-dialog";
import { LavorazioneEliminaConfirmDialog } from "@/components/gestionale/lavorazioni/lavorazione-elimina-confirm-dialog";
import { SchedeLavorazioneModal } from "@/components/lavorazioni/schede/schede-lavorazione-modal";
import { InlineSelectField, type TablePillOption } from "@/components/gestionale/lavorazioni/lavorazioni-inline-select";
import {
  formatLavorazioneMobileIdentLine,
  LavMobileInlineField,
  LavorazioneMobileCardFooter,
  LavorazioneMobileCardHeader,
  LavorazioneMobileUltimaModifica,
  LavorazioneMobileCardShell,
  LavorazioneMobileStatusSlot,
  LavorazioneMobileControlsPanel,
  LavorazioneMobileMetaGrid,
  LavorazioneMobileMetaItem,
  LavorazioneMobileNote,
} from "@/components/gestionale/lavorazioni/lavorazione-mobile-card";
import { toMezzoUI } from "@/lib/mezzi/mezzi-db-ui-adapter";
import { lavorazioneMatchesMezzo } from "@/lib/mezzi/lavorazioni-sync";
import { lavRowToMatchShape } from "@/lib/mezzi/mezzi-db-ui-adapter";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { Q_FOCUS_LAV_ROW, Q_FOCUS_MEZZO, Q_LAVORAZIONI_MEZZO_ID } from "@/lib/navigation/dashboard-log-links";
import { buildLavorazioniPillOptionsFromGlobal } from "@/lib/global-list/build-lavorazioni-pill-options";
import { readablePillStyleFromHex } from "@/lib/lavorazioni/table-pill-readability";
import { prioritaDisplayColor, statoDisplayColor } from "@/lib/lavorazioni/lavorazioni-theme";
import { comparePrioritaLavorazione, orderPrioritaList } from "@/lib/lavorazioni/priorita-order";
import { statoWorkflowOrderIndex } from "@/lib/lavorazioni/stato-order";
import type { PrioritaLav } from "@/lib/lavorazioni/types";
import { durataMsStorico, formatDurataMs } from "@/lib/lavorazioni/duration";
import { parseItalianDayToIso } from "@/lib/lavorazioni/date-day-only";
import { lavorazioneNoteOperative } from "@/lib/lavorazioni/lavorazione-display-helpers";
import { resolveLavorazioneUltimaModifica } from "@/lib/lavorazioni/lavorazione-ultima-modifica";
import { lavRowMatchesPageFilters, type LavPageFilters } from "@/lib/lavorazioni/lavorazioni-list-ui-filters";
import {
  buildLavorazioniFilterCatalog,
  loadGestionaleAdvancedFiltersPersisted,
  LAVORAZIONI_ADVANCED_FILTERS_EMPTY,
  lavorazioniAdvancedFiltersActive,
  saveGestionaleAdvancedFiltersPersisted,
  type LavorazioniAdvancedFilters,
} from "@/lib/lavorazioni/lavorazioni-advanced-filters";
import { LavorazioniAdvancedFilterPanel } from "@/components/gestionale/lavorazioni/lavorazioni-advanced-filter-panel";
import { getOrCreateBundle } from "@/lib/schede/lavorazioni-schede-storage";
import { persistSchedeBundle, persistSchedeStore } from "@/lib/schede/schede-sync-adapter";
import { useSchedeStoreQuery } from "@/src/hooks/use-schede-store-query";
import {
  CAB_ADDETTO_DISPLAY_RENAME,
  type CabAddettoRenameDetail,
} from "@/lib/sistema/cab-events";
import { useCabSyncListener } from "@/src/hooks/use-cab-sync-listener";
import { countSchedePresenti, newSchedaMeta } from "@/lib/schede/schede-ui";
import { useMezziListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import { isStatoInConfig, resolveDefaultLavorazioneStatoId, statoLavorazioneLabel } from "@/src/shared/selectors";
import {
  dsInput,
  dsPageToolbarBtn,
  dsStackPage,
  GESTIONALE_SEARCH_PLACEHOLDER,
  dsTableRow,
  dsTableActionBtnDanger,
  dsTableActionBtnInfo,
  dsTableActionBtnPrimary,
  dsTableActionBtnSecondary,
  dsTableActionGlyph,
} from "@/lib/ui/design-system";
import {
  Drawer,
  PageToolbar,
  PageToolbarActions,
  PageToolbarResultCount,
} from "@/components/design-system";
import {
  GestionaleLogEmpty,
  GestionaleLogEntryFourLines,
  GestionaleLogList,
  gestionaleLogScrollEmbeddedClass,
} from "@/components/gestionale/gestionale-log-ui";
import { useUndoableLog } from "@/src/hooks/gestionale/use-undoable-log";
import { logService } from "@/src/services/log.service";
import type { LogModificaRow } from "@/src/types/supabase-tables";
import {
  buildLogModificheDisplayEntries,
  logAutoreLabel,
} from "@/lib/gestionale-log/log-modifiche-view-model";
import { lavorazioneLogOggettoFromListRow } from "@/lib/lavorazioni/lavorazione-log-oggetto";
import { auditPayload, pickExistingFields } from "@/lib/gestionale-log/undo";
import { withUndoSessionPayload } from "@/lib/gestionale-log/undo-session";
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import { useResponsiveListPageSize } from "@/lib/ui/use-responsive-list-page-size";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type { LavorazioneSchedeStore, SchedaIngressoFields } from "@/types/schede";
import {
  type LavorazioneFilters,
  type LavorazioneListRow,
  type LavorazioneUpdate,
} from "@/src/services/lavorazioni.service";
import { useLavorazioniList } from "@/src/services/domain/lavorazioni-domain.queries";
import { useLavorazioneConcludeMutation, useLavorazioneRemoveMutation, useLavorazioneRestoreMutation, useLavorazioneUpdateMutation } from "@/src/hooks/gestionale/use-lavorazione-mutations";
import { useMezzoUpdateMutation } from "@/src/hooks/gestionale/use-mezzo-mutations";
import type { PrioritaLavorazione, StatoLavorazione } from "@/src/types/supabase-tables";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { usePermissions } from "@/src/hooks/use-permissions";
import { READONLY_PERMISSION_HINT } from "@/src/lib/auth/permissions";
import {
  erpBtnNeutral,
  erpBtnNuovaLavorazione,
  erpFocus,
  FilterSelectWrap,
  gestionaleSelectFilterClass,
  prioritaLabel,
  prioritaPillShellClass,
  selectLavorazioniFilter,
  addettoPillShellClass,
  addettoPillShellStyle,
  statoPillShellClass,
} from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import {
  LavorazioniClienteUtilStack,
  LavorazioneIngressoDateCell,
  LavorazioneIngressoDateCellFromIso,
  lavTableActionBtnDanger,
  lavTableActionBtnInfo,
  lavTableActionBtnPrimary,
  lavTableActionBtnSecondary,
  dsTableActionBadge,
  dsTableActionBtnWithBadge,
  lavTableActionsRow,
  lavTableTd,
  lavTableArchivioMiddleColStyle,
  lavTableColAttrezzaturaClass,
  lavTableColAzioniClass,
  lavTableColCantiereClass,
  lavTableColClienteClass,
  lavTableColIdentificazioneClass,
  lavTableColIngressoClass,
  lavTableColNoteClass,
  lavTablePillColStyleFromLabels,
  lavTablePillColWidthRem,
  lavTablePillTextClass,
  lavTableTdPill,
  lavTableTdAzioni,
  lavTableTdCenter,
  lavTablePillWrapStyleFromLabels,
  lavTableTdPillWrap,
  lavTableThAzioni,
} from "@/components/gestionale/lavorazioni/lavorazioni-table-shared";

function fmtDay(iso: string | null | undefined): string {
  if (!iso?.trim()) return "—";
  try {
    return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return iso;
  }
}


function fmtOreTotaliCell(row: LavorazioneListRow): string {
  const ms = durataMsStorico(
    (row.data_ingresso ?? row.created_at) as string,
    (row.data_uscita ?? row.updated_at) as string,
  );
  if (ms <= 0) return "—";
  return formatDurataMs(ms);
}

function macchinaLabel(row: LavorazioneListRow, schedeStore?: LavorazioneSchedeStore): string {
  const ing = schedeStore?.[row.id]?.ingresso?.campi;
  if (ing?.marcaAttrezzatura?.trim() || ing?.modelloAttrezzatura?.trim()) {
    return [ing.marcaAttrezzatura, ing.modelloAttrezzatura].filter(Boolean).join(" ").trim() || "—";
  }
  const m = row.mezzo;
  return m ? `${m.marca} ${m.modello}`.trim() : "—";
}

function clienteLabel(row: LavorazioneListRow, schedeStore?: LavorazioneSchedeStore): string {
  const fromScheda = schedeStore?.[row.id]?.ingresso?.campi.cliente?.trim();
  return fromScheda || row.mezzo?.cliente?.trim() || "—";
}

function utilizzatoreLabel(row: LavorazioneListRow, schedeStore?: LavorazioneSchedeStore): string {
  return (
    schedeStore?.[row.id]?.ingresso?.campi.utilizzatore?.trim() || row.mezzo?.utilizzatore?.trim() || ""
  );
}

function cantiereLabel(row: LavorazioneListRow, schedeStore?: LavorazioneSchedeStore): string {
  return schedeStore?.[row.id]?.ingresso?.campi.cantiere?.trim() || "—";
}

function addettoLabel(row: LavorazioneListRow, schedeStore: LavorazioneSchedeStore, fallbackAddetto: string): string {
  return (
    schedeStore[row.id]?.ingresso?.campi.addettoAccettazione?.trim() ||
    schedeStore[row.id]?.lavorazioni?.campi.righe.flatMap((r) => r.addettiAssegnati).find((a) => a.addetto.trim())?.addetto.trim() ||
    fallbackAddetto ||
    "—"
  );
}

function addettoSelectValue(label: string, addetti: string[]): string {
  if (addetti.includes(label)) return label;
  if (label === "—") return "";
  return label;
}

function schedeCountForRow(row: LavorazioneListRow, schedeStore: LavorazioneSchedeStore): number {
  return countSchedePresenti(getOrCreateBundle(schedeStore, row.id));
}

type MezzoIdentParts = { targa: string; matricola: string; scuderia: string };

function mezzoIdentParts(row: LavorazioneListRow, schedeStore?: LavorazioneSchedeStore): MezzoIdentParts {
  const ing = schedeStore?.[row.id]?.ingresso?.campi;
  const scuderiaIngresso = ing?.nScuderia?.trim() ?? "";
  if (ing) {
    return {
      targa: ing.targa?.trim() || "—",
      matricola: ing.matricola?.trim() || "—",
      scuderia: scuderiaIngresso,
    };
  }
  const m = row.mezzo;
  return {
    targa: m?.targa?.trim() || "—",
    matricola: m?.matricola?.trim() || "—",
    scuderia: "",
  };
}

function mezzoIdent(row: LavorazioneListRow, schedeStore?: LavorazioneSchedeStore): string {
  const p = mezzoIdentParts(row, schedeStore);
  const base = `${p.targa} · ${p.matricola}`;
  return p.scuderia ? `${base} · ${p.scuderia}` : base;
}

function ClienteUtilizzatoreCell({
  row,
  schedeStore,
}: {
  row: LavorazioneListRow;
  schedeStore: LavorazioneSchedeStore;
}) {
  const cliente = clienteLabel(row, schedeStore);
  const utilizzatore = utilizzatoreLabel(row, schedeStore);
  return (
    <LavorazioniClienteUtilStack cliente={cliente} utilizzatore={utilizzatore} />
  );
}

function MezzoIdentStackCell({
  row,
  schedeStore,
}: {
  row: LavorazioneListRow;
  schedeStore?: LavorazioneSchedeStore;
}) {
  const p = mezzoIdentParts(row, schedeStore);
  return (
    <div className="min-w-0 leading-tight">
      <div className="truncate text-xs font-medium text-zinc-800 dark:text-zinc-100">{p.targa}</div>
      <div className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">{p.matricola}</div>
      {p.scuderia ? (
        <div className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">N. {p.scuderia}</div>
      ) : null}
    </div>
  );
}

function telaioLabel(row: LavorazioneListRow, schedeStore: LavorazioneSchedeStore): string {
  const ing = schedeStore[row.id]?.ingresso?.campi;
  if (!ing) return "—";
  const parts = [ing.tipoTelaio, ing.marcaTelaio, ing.modelloTelaio].map((s) => s?.trim()).filter(Boolean);
  return parts.length ? parts.join(" ") : "—";
}

function oreLavoroLabel(row: LavorazioneListRow, schedeStore: LavorazioneSchedeStore): string {
  const ore = schedeStore[row.id]?.ingresso?.campi.oreLavoro?.trim();
  if (ore) return ore;
  return fmtOreTotaliCell(row);
}

function dataCompletamentoIso(row: LavorazioneListRow): string {
  return (row.data_uscita ?? row.updated_at) as string;
}

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

function IconTrash({ className = dsTableActionGlyph }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 7h14M10 11v6M14 11v6M8 7l1-3h6l1 3M7 7l1 13h8l1-13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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

function legacyLavBase(row: LavorazioneListRow, fallbackAddetto: string) {
  const mezzo = row.mezzo;
  return {
    id: row.id,
    macchina: mezzo ? `${mezzo.marca} ${mezzo.modello}`.trim() || "—" : "—",
    targa: mezzo?.targa?.trim() || "",
    matricola: mezzo?.matricola?.trim() || "",
    nScuderia: mezzo?.numero_scuderia?.trim() || "",
    cliente: mezzo?.cliente?.trim() || "—",
    utilizzatore: mezzo?.utilizzatore?.trim() || "",
    cantiere: "",
    addetto: fallbackAddetto,
    noteInterne: row.note?.trim() || "",
    dataIngresso: row.data_ingresso ?? row.created_at,
  };
}

function rowToLegacyAttiva(row: LavorazioneListRow, fallbackAddetto: string): LavorazioneAttiva {
  return {
    ...legacyLavBase(row, fallbackAddetto),
    statoId: row.stato,
    priorita: row.priorita as PrioritaLav,
    dataCompletamento: row.data_uscita ?? null,
  };
}

function rowToLegacyArchiviata(row: LavorazioneListRow, fallbackAddetto: string): LavorazioneArchiviata {
  const completion = row.data_uscita ?? row.updated_at;
  return {
    ...legacyLavBase(row, fallbackAddetto),
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
  | "mezzoIdent"
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
  | "mezzoIdent"
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
  schedeStore: LavorazioneSchedeStore,
  fallbackAddetto: string,
  statoOrderIds: readonly string[],
): number {
  const dir = phase === "desc" ? -1 : 1;
  const t = (x: number) => x * dir;
  if (k === "macchina") return t(cmpStr(macchinaLabel(a, schedeStore), macchinaLabel(b, schedeStore)));
  if (k === "mezzoIdent") return t(cmpStr(mezzoIdent(a, schedeStore), mezzoIdent(b, schedeStore)));
  if (k === "cliente") return t(cmpStr(clienteLabel(a, schedeStore), clienteLabel(b, schedeStore)));
  if (k === "utilizzatore") return t(cmpStr(utilizzatoreLabel(a, schedeStore), utilizzatoreLabel(b, schedeStore)));
  if (k === "cantiere") return t(cmpStr(cantiereLabel(a, schedeStore), cantiereLabel(b, schedeStore)));
  if (k === "note") return t(cmpStr((a.note ?? "").trim(), (b.note ?? "").trim()));
  if (k === "stato") {
    return t(
      statoWorkflowOrderIndex(a.stato, statoOrderIds) - statoWorkflowOrderIndex(b.stato, statoOrderIds),
    );
  }
  if (k === "priorita") return t(comparePrioritaLavorazione(a.priorita, b.priorita));
  if (k === "addetto") return t(cmpStr(addettoLabel(a, schedeStore, fallbackAddetto), addettoLabel(b, schedeStore, fallbackAddetto)));
  const da = new Date(a.data_ingresso ?? a.created_at).getTime();
  const db = new Date(b.data_ingresso ?? b.created_at).getTime();
  return t(da === db ? 0 : da < db ? -1 : 1);
}

function cmpCh(
  a: LavorazioneListRow,
  b: LavorazioneListRow,
  k: SortKeyCh,
  phase: SortPhase,
  schedeStore: LavorazioneSchedeStore,
  fallbackAddetto: string,
): number {
  const dir = phase === "desc" ? -1 : 1;
  const t = (x: number) => x * dir;
  if (k === "macchina") return t(cmpStr(macchinaLabel(a, schedeStore), macchinaLabel(b, schedeStore)));
  if (k === "mezzoIdent") return t(cmpStr(mezzoIdent(a, schedeStore), mezzoIdent(b, schedeStore)));
  if (k === "cliente") return t(cmpStr(clienteLabel(a, schedeStore), clienteLabel(b, schedeStore)));
  if (k === "utilizzatore") return t(cmpStr(utilizzatoreLabel(a, schedeStore), utilizzatoreLabel(b, schedeStore)));
  if (k === "cantiere") return t(cmpStr(cantiereLabel(a, schedeStore), cantiereLabel(b, schedeStore)));
  if (k === "note") return t(cmpStr((a.note ?? "").trim(), (b.note ?? "").trim()));
  if (k === "addetto") return t(cmpStr(addettoLabel(a, schedeStore, fallbackAddetto), addettoLabel(b, schedeStore, fallbackAddetto)));
  if (k === "ingresso") {
    const da = new Date(a.data_ingresso ?? a.created_at).getTime();
    const db = new Date(b.data_ingresso ?? b.created_at).getTime();
    return t(da === db ? 0 : da < db ? -1 : 1);
  }
  if (k === "oreTotali") {
    const ra = durataMsStorico(
      (a.data_ingresso ?? a.created_at) as string,
      dataCompletamentoIso(a),
    );
    const rb = durataMsStorico(
      (b.data_ingresso ?? b.created_at) as string,
      dataCompletamentoIso(b),
    );
    return t(ra === rb ? 0 : ra < rb ? -1 : 1);
  }
  const ua = new Date(dataCompletamentoIso(a)).getTime();
  const ub = new Date(dataCompletamentoIso(b)).getTime();
  return t(ua === ub ? 0 : ua < ub ? -1 : 1);
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, authorName } = useAuth();
  const { push: pushToast } = useToast();
  const permissions = usePermissions();
  const canEditWorkOrders = permissions.canEditWorkOrders;
  const canDeleteRecords = permissions.canDeleteRecords;
  const globalOpts = useGlobalOptions({ debugTag: "LavorazioniView" });
  const mezziListQ = useMezziListQuery();
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

  const statoPillWrapStyle = useMemo(
    () =>
      lavTablePillWrapStyleFromLabels(
        statiOpts.map((s) => statoLavorazioneLabel(s.id, statiOpts)),
      ),
    [statiOpts],
  );
  const prioritaPillWrapStyle = useMemo(
    () => lavTablePillWrapStyleFromLabels(prioritaOpts.map((p) => prioritaLabel(p))),
    [prioritaOpts],
  );
  const addettoPillWrapStyle = useMemo(
    () => lavTablePillWrapStyleFromLabels(["—", ...globalOpts.lavorazioni.addetti]),
    [globalOpts.lavorazioni.addetti],
  );

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

  const statoColRem = useMemo(
    () => lavTablePillColWidthRem(statiOpts.map((s) => statoLavorazioneLabel(s.id, statiOpts))),
    [statiOpts],
  );
  const prioritaColRem = useMemo(
    () => lavTablePillColWidthRem(prioritaOpts.map((p) => prioritaLabel(p))),
    [prioritaOpts],
  );
  const archivioMiddleColStyle = useMemo(
    () => lavTableArchivioMiddleColStyle(statoColRem, prioritaColRem),
    [statoColRem, prioritaColRem],
  );

  const lavTablePillFillClass = "w-full min-w-0";

  const mezziCatalog = useMemo(() => {
    return [...(mezziListQ.data ?? []).map(toMezzoUI)].sort((a, b) =>
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

  const updateLav = useLavorazioneUpdateMutation();
  const updateMezzo = useMezzoUpdateMutation();
  const removeLav = useLavorazioneRemoveMutation();
  const restoreLav = useLavorazioneRestoreMutation();
  const concludeLav = useLavorazioneConcludeMutation();

  const [createOpen, setCreateOpen] = useState(false);
  type LavorazioniListViewMode = "table" | "kanban";
  const [listViewMode, setListViewMode] = useState<LavorazioniListViewMode>("table");
  const [schedeRow, setSchedeRow] = useState<{ row: LavorazioneListRow; origine: "attiva" | "storico"; initialTab?: "schede" | "panoramica" } | null>(null);
  const { store: schedeStore, invalidate: invalidateSchedeStore } = useSchedeStoreQuery();

  const persistSchedeAndSync = useCallback(
    (promise: Promise<{ ok: true } | { ok: false; error: string }>) => {
      void promise.then((res) => {
        if (!res.ok) {
          pushToast(res.error ?? "Salvataggio schede non riuscito.", "error", 5000);
          return;
        }
        invalidateSchedeStore();
      });
    },
    [invalidateSchedeStore, pushToast],
  );

  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent<CabAddettoRenameDetail>).detail;
      if (!d?.previousName || !d?.nextName) return;
      invalidateSchedeStore();
    };
    window.addEventListener(CAB_ADDETTO_DISPLAY_RENAME, handler);
    return () => window.removeEventListener(CAB_ADDETTO_DISPLAY_RENAME, handler);
  }, [invalidateSchedeStore]);

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

  const [filtriAttiviEspansi, setFiltriAttiviEspansi] = useState(false);
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

  const [sortColA, setSortColA] = useState<SortKeyAtt | null>(null);
  const [sortPhaseA, setSortPhaseA] = useState<SortPhase>("natural");

  const [sortColC, setSortColC] = useState<SortKeyCh | null>(null);
  const [sortPhaseC, setSortPhaseC] = useState<SortPhase>("natural");

  const [flashRowId, setFlashRowId] = useState<string | null>(null);
  const [concludiConfirmRow, setConcludiConfirmRow] = useState<LavorazioneListRow | null>(null);
  const [eliminaConfirmRow, setEliminaConfirmRow] = useState<LavorazioneListRow | null>(null);
  const flashClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const filtersAttive = useMemo(
    (): LavorazioneFilters => ({
      includeMezzo: true,
      ...mezzoFilterPart,
      archived: false,
    }),
    [mezzoFilterPart],
  );

  const filtersChiuse = useMemo(
    (): LavorazioneFilters => ({
      includeMezzo: true,
      ...mezzoFilterPart,
      archived: true,
    }),
    [mezzoFilterPart],
  );

  const attiveQuery = useLavorazioniList(filtersAttive, { staleTime: 30_000 });
  const chiuseQuery = useLavorazioniList(filtersChiuse, { staleTime: 30_000 });

  const { undoable: undoableLavLog, logQuery: lavModificheLogQuery } = useUndoableLog("lavorazioni");

  const attiveRows = attiveQuery.data ?? [];
  const chiuseRows = chiuseQuery.data ?? [];
  const defaultAddetto = globalOpts.lavorazioni.addetti[0] ?? "";

  const pageFilters = useMemo(
    (): LavPageFilters => ({
      search: searchApplied,
      ...advancedFilters,
    }),
    [searchApplied, advancedFilters],
  );

  const rowMatchesPageFilters = useCallback(
    (row: LavorazioneListRow) => lavRowMatchesPageFilters(row, pageFilters, schedeStore, defaultAddetto),
    [pageFilters, schedeStore, defaultAddetto],
  );

  const filterCatalog = useMemo(
    () =>
      buildLavorazioniFilterCatalog(
        [...attiveRows, ...chiuseRows],
        schedeStore,
        globalOpts.lavorazioni.addetti,
        mezziCatalog,
        defaultAddetto,
      ),
    [attiveRows, chiuseRows, schedeStore, globalOpts.lavorazioni.addetti, mezziCatalog, defaultAddetto],
  );

  const openDetailById = useCallback(
    (id: string) => {
      const active = attiveRows.find((row) => row.id === id);
      if (active) {
        setSchedeRow({ row: active, origine: "attiva", initialTab: "panoramica" });
        return;
      }
      const closed = chiuseRows.find((row) => row.id === id);
      if (closed) setSchedeRow({ row: closed, origine: "storico", initialTab: "panoramica" });
    },
    [attiveRows, chiuseRows],
  );

  const attiveLegacyRows = useMemo(
    () => attiveRows.map((row) => rowToLegacyAttiva(row, defaultAddetto)),
    [attiveRows, defaultAddetto],
  );

  const storicoLegacyRows = useMemo(
    () => chiuseRows.map((row) => rowToLegacyArchiviata(row, defaultAddetto)),
    [chiuseRows, defaultAddetto],
  );

  const attiveRowsFiltered = useMemo(
    () => attiveRows.filter(rowMatchesPageFilters),
    [attiveRows, rowMatchesPageFilters],
  );

  const chiuseRowsFiltered = useMemo(
    () => chiuseRows.filter(rowMatchesPageFilters),
    [chiuseRows, rowMatchesPageFilters],
  );

  const flashRow = useCallback((id: string) => {
    if (flashClearRef.current) clearTimeout(flashClearRef.current);
    setFlashRowId(id);
    flashClearRef.current = setTimeout(() => {
      setFlashRowId(null);
      flashClearRef.current = null;
    }, 1400);
  }, []);

  const createdBy = user?.id ?? null;

  const mutErr = updateLav.isError ? updateLav.error?.message : removeLav.isError ? removeLav.error?.message : null;
  const mutPending = updateLav.isPending || removeLav.isPending || restoreLav.isPending || concludeLav.isPending;

  const onStatoRow = useCallback(
    (row: LavorazioneListRow, next: string) => {
      if (!canEditWorkOrders) return;
      const nuovo = next as StatoLavorazione;
      const data: LavorazioneUpdate = { stato: nuovo };
      if (!statiChiusiIds.includes(nuovo)) {
        data.data_uscita = null;
      }
      updateLav.mutate(
        { id: row.id, data },
        {
          onSuccess: () => flashRow(row.id),
        },
      );
    },
    [updateLav, flashRow, statiChiusiIds, canEditWorkOrders],
  );

  const onPrioritaRow = useCallback(
    (row: LavorazioneListRow, next: string) => {
      if (!canEditWorkOrders) return;
      if (!prioritaOpts.includes(next as PrioritaLavorazione)) return;
      updateLav.mutate(
        { id: row.id, data: { priorita: next as PrioritaLavorazione } },
        { onSuccess: () => flashRow(row.id) },
      );
    },
    [updateLav, flashRow, canEditWorkOrders, prioritaOpts],
  );

  const onAddettoRow = useCallback(
    (row: LavorazioneListRow, next: string) => {
      if (!canEditWorkOrders) return;
      const clean = next.trim();
      if (!clean || !globalOpts.lavorazioni.addetti.includes(clean)) return;
      const beforeAddetto = addettoLabel(row, schedeStore, defaultAddetto);
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
            targa: row.mezzo?.targa ?? "",
            km: "",
            descrizioneAnomalia: row.note ?? "",
            livelloCarburante: "",
            addettoAccettazione: clean,
            richiedente: "",
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
        persistSchedeAndSync(persistSchedeStore(updated, row.id));
      }
      void logService.create({
        entita: "lavorazioni",
        entita_id: row.id,
        azione: "UPDATE",
        autore_id: user?.id ?? null,
        payload: {
          before: { addetto: beforeAddetto },
          after: { addetto: clean },
        },
      });
      flashRow(row.id);
    },
    [authorName, canEditWorkOrders, defaultAddetto, flashRow, globalOpts.lavorazioni.addetti, schedeStore, user?.id],
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
        pushToast("Lavorazione eliminata.", "success");
        setEliminaConfirmRow(null);
        setSchedeRow((cur) => (cur?.row.id === row.id ? null : cur));
        flashRow(row.id);
        void lavModificheLogQuery.refetch();
      },
      onError: (err) => {
        pushToast(err.message ?? "Eliminazione non riuscita.", "error");
      },
    });
  }

  function openConcludiConfirm(row: LavorazioneListRow) {
    if (!canEditWorkOrders || row.stato !== "completata" || row.archived === true) return;
    setConcludiConfirmRow(row);
  }

  function confirmConcludiLavorazione() {
    const row = concludiConfirmRow;
    if (!row || !canEditWorkOrders) return;
    concludeLav.mutate(row.id, {
      onSuccess: () => {
        pushToast("Lavorazione conclusa e archiviata.", "success");
        setConcludiConfirmRow(null);
        if (schedeRow?.row.id === row.id && schedeRow.origine === "attiva") {
          setSchedeRow(null);
        }
        flashRow(row.id);
        void lavModificheLogQuery.refetch();
      },
      onError: (err) => {
        pushToast(err.message ?? "Conclusione non riuscita.", "error");
      },
    });
  }

  function submitRipristinaInLavorazione(row: LavorazioneListRow) {
    if (!canEditWorkOrders) return;
    const ok = window.confirm(
      `Ripristinare la lavorazione «${macchinaLabel(row)}» tra le lavorazioni attive?`,
    );
    if (!ok) return;
    const preferred =
      statiInCorsoOpts.find((s) => s.id === "in_lavorazione") ??
      statiInCorsoOpts.find((s) => s.id === "accettazione") ??
      statiInCorsoOpts[0];
    const restoreStato = preferred?.id ?? resolveDefaultLavorazioneStatoId(globalOpts.lavorazioni.stati);
    if (!restoreStato || !isStatoInConfig(restoreStato, globalOpts.lavorazioni.stati)) {
      window.alert("Nessuno stato attivo configurato per ripristinare la lavorazione.");
      return;
    }
    restoreLav.mutate(
      { id: row.id, stato: restoreStato },
      {
        onSuccess: () => {
          flashRow(row.id);
          void lavModificheLogQuery.refetch();
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

  useEffect(() => {
    const rawFocus = searchParams.get(Q_FOCUS_MEZZO)?.trim();
    if (rawFocus?.startsWith("hub-lav-")) {
      const t = window.setTimeout(() => {
        const lavId = rawFocus.slice("hub-lav-".length);
        openDetailById(lavId);
        flashRow(lavId);
        router.replace(pathname, { scroll: false });
      }, 80);
      return () => window.clearTimeout(t);
    }

    const rawMezzo =
      searchParams.get(Q_LAVORAZIONI_MEZZO_ID)?.trim() ||
      (rawFocus && !rawFocus.startsWith("hub-lav-") ? rawFocus : "");
    if (!rawMezzo) return;

    const t = window.setTimeout(() => {
      router.replace(pathname, { scroll: false });
      const mezzo = mezziCatalog.find((m) => m.id === rawMezzo);
      const resolved = mezzo ? { ...mezzo } : mezzoFilterStubFromId(rawMezzo);
      setNavMezzoFilter(resolved);
      const hitA = attiveRows.filter((lav) => lav.mezzo_id === rawMezzo || lavorazioneMatchesMezzo(resolved, lavRowToMatchShape(lav)));
      const hitC = chiuseRows.filter((lav) => lav.mezzo_id === rawMezzo || lavorazioneMatchesMezzo(resolved, lavRowToMatchShape(lav)));
      const ids = new Set<string>([...hitA.map((r) => r.id), ...hitC.map((r) => r.id)]);
      setNavBulkFlashIds(ids);
      if (navFlashClearRef.current) clearTimeout(navFlashClearRef.current);
      navFlashClearRef.current = setTimeout(() => {
        setNavBulkFlashIds(new Set());
        navFlashClearRef.current = null;
      }, 2000);
    }, 80);
    return () => window.clearTimeout(t);
  }, [searchParams, pathname, router, flashRow, attiveRows, chiuseRows, openDetailById]);

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
        const ta = new Date(a.created_at).getTime();
        const tb = new Date(b.created_at).getTime();
        if (tb !== ta) return tb - ta;
        return b.id.localeCompare(a.id);
      }
      const p = cmpAtt(a, b, sortColA, sortPhaseA, schedeStore, defaultAddetto, statoOrderIds);
      if (p !== 0) return p;
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      if (tb !== ta) return tb - ta;
      return b.id.localeCompare(a.id);
    });
    return rows;
  }, [attiveRowsFiltered, sortColA, sortPhaseA, schedeStore, defaultAddetto, statoOrderIds]);

  const sortedChiuse = useMemo(() => {
    const rows = [...chiuseRowsFiltered];
    rows.sort((a, b) => {
      if (sortPhaseC === "natural" || sortColC === null) {
        const ta = new Date(a.data_uscita ?? a.updated_at).getTime();
        const tb = new Date(b.data_uscita ?? b.updated_at).getTime();
        if (tb !== ta) return tb - ta;
        return b.id.localeCompare(a.id);
      }
      const p = cmpCh(a, b, sortColC, sortPhaseC, schedeStore, defaultAddetto);
      if (p !== 0) return p;
      const ta = new Date(dataCompletamentoIso(a)).getTime();
      const tb = new Date(dataCompletamentoIso(b)).getTime();
      if (tb !== ta) return tb - ta;
      return b.id.localeCompare(a.id);
    });
    return rows;
  }, [chiuseRowsFiltered, sortColC, sortPhaseC, schedeStore, defaultAddetto]);

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
  }, [filtersChiuse, chiuseRowsFiltered.length, searchApplied, listPageSize, resetPageC]);
  const pagedChiuse = useMemo(() => sliceC(sortedChiuse), [sortedChiuse, sliceC, pageC]);

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

  useEffect(() => {
    const id = searchParams.get(Q_FOCUS_LAV_ROW)?.trim();
    if (!id) return;
    const t = window.setTimeout(() => {
      focusLavorazioneInTable(id);
      router.replace(pathname, { scroll: false });
    }, 80);
    return () => window.clearTimeout(t);
  }, [searchParams, pathname, router, focusLavorazioneInTable]);

  async function syncIngressoToBackend(row: LavorazioneListRow, campi: SchedaIngressoFields) {
    const note = campi.noteIntervento?.trim() || null;
    const parsedIngresso = parseItalianDayToIso(campi.dataIngresso.trim());
    const lavPatch: { note?: string | null; data_ingresso?: string } = {};
    if (note !== (row.note ?? "").trim()) lavPatch.note = note;
    if (parsedIngresso.ok) lavPatch.data_ingresso = parsedIngresso.iso;
    if (Object.keys(lavPatch).length) {
      await updateLav.mutateAsync({ id: row.id, data: lavPatch });
    }
    if (
      row.mezzo_id &&
      campi.cliente.trim() &&
      campi.marcaAttrezzatura.trim() &&
      campi.modelloAttrezzatura.trim() &&
      campi.matricola.trim()
    ) {
      await updateMezzo.mutateAsync({
        id: row.mezzo_id,
        data: {
          cliente: campi.cliente.trim(),
          utilizzatore: campi.utilizzatore.trim() || null,
          marca: campi.marcaAttrezzatura.trim(),
          modello: campi.modelloAttrezzatura.trim(),
          targa: campi.targa.trim() || null,
          matricola: campi.matricola.trim(),
          numero_scuderia: campi.nScuderia.trim() || null,
        },
      });
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

  const logDisplayEntries = useMemo(
    () =>
      buildLogModificheDisplayEntries(
        lavModificheLogQuery.data ?? [],
        (row) => logAutoreLabel(row, user?.id ?? null, authorName),
        {
          resolveOggetto: (row) => {
            if (row.entita !== "lavorazioni") return undefined;
            const lav = lavorazioniById.get(row.entita_id);
            if (!lav) return undefined;
            return lavorazioneLogOggettoFromListRow(lav, schedeStore);
          },
        },
      ),
    [lavModificheLogQuery.data, user?.id, authorName, lavorazioniById, schedeStore],
  );

  const hasPageClientFilters =
    searchApplied.trim().length > 0 || lavorazioniAdvancedFiltersActive(advancedFilters);

  const totalFilteredCount = attiveRowsFiltered.length + chiuseRowsFiltered.length;

  const loading = attiveQuery.isLoading || chiuseQuery.isLoading;
  const loadErr = attiveQuery.isError ? attiveQuery.error?.message : chiuseQuery.isError ? chiuseQuery.error?.message : null;

  async function undoUltimaLavorazione() {
    if (!canEditWorkOrders || !undoableLavLog) return;
    const payload = auditPayload(undoableLavLog);
    const before = payload.before;
    if (!before) return;
    if (!window.confirm("Annullare l'ultima azione reversibile sulle lavorazioni?")) return;
    const data = pickExistingFields<LavorazioneUpdate>(before, ["mezzo_id", "stato", "priorita", "data_ingresso", "data_uscita", "note", "created_by"]);
    try {
      let rollbackUpdateLog: LogModificaRow | null = null;
      if (Object.keys(data).length > 0) {
        await updateLav.mutateAsync({ id: undoableLavLog.entita_id, data });
        const generatedUpdate = await logService.getByEntita("lavorazioni", undoableLavLog.entita_id, 5);
        rollbackUpdateLog = generatedUpdate.success
          ? (generatedUpdate.data?.find((row) => row.id !== undoableLavLog.id && row.azione === "UPDATE") ?? null)
          : null;
      }
      if (typeof before.addetto === "string") {
        {
          const prev = schedeStore;
          const current = getOrCreateBundle(prev, undoableLavLog.entita_id);
          if (current.ingresso) {
            const updated = {
              ...prev,
              [undoableLavLog.entita_id]: {
                ...current,
                ingresso: {
                  ...current.ingresso,
                  updatedAt: new Date().toISOString(),
                  updatedBy: authorName.trim() || "Operatore",
                  campi: { ...current.ingresso.campi, addettoAccettazione: before.addetto as string },
                },
              },
            };
            persistSchedeAndSync(persistSchedeStore(updated, undoableLavLog.entita_id));
          }
        }
      }
      const undoLog = await logService.create({
        entita: "lavorazioni",
        entita_id: undoableLavLog.entita_id,
        azione: "UNDO",
        autore_id: user?.id ?? null,
        payload: withUndoSessionPayload({
          reverted_log_id: undoableLavLog.id,
          before: payload.after ?? null,
          after: before,
        }),
      });
      if (rollbackUpdateLog) {
        await logService.markReverted(rollbackUpdateLog.id, {
          reverted_by: user?.id ?? null,
          undo_log_id: undoLog.success ? undoLog.data?.id : null,
          permission: "editWorkOrders",
        });
      }
      await logService.markReverted(undoableLavLog.id, {
        reverted_by: user?.id ?? null,
        undo_log_id: undoLog.success ? undoLog.data?.id : null,
        permission: "editWorkOrders",
      });
      await lavModificheLogQuery.refetch();
      flashRow(undoableLavLog.entita_id);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Undo non riuscito.");
    }
  }

  return (
    <>
      <PageHeader
        title="Lavorazioni"
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              className={dsPageToolbarBtn}
              onClick={() => setListViewMode((m) => (m === "table" ? "kanban" : "table"))}
              aria-pressed={listViewMode === "kanban"}
            >
              {listViewMode === "table" ? "Vista Kanban" : "Vista Tabella"}
            </button>
            <GestionalePageToolbarActions
              canUndo={Boolean(undoableLavLog)}
              undoDisabled={!canEditWorkOrders}
              undoPending={updateLav.isPending}
              onUndo={() => void undoUltimaLavorazione()}
              onOpenLog={() => setLavLogOpen(true)}
              logTitle="Storico modifiche lavorazioni"
            />
          </div>
        }
      />

      <div className={dsStackPage}>
        {loadErr ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100">
            {loadErr}
          </div>
        ) : null}

        {mutErr ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100">
            {mutErr}
          </div>
        ) : null}

        {navMezzoFilter ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-orange-200 bg-orange-50/90 px-3 py-2 text-sm text-orange-950">
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

        <ShellCard>
          <section aria-label="Azioni e filtri lavorazioni (in corso e archivio)">
          <PageToolbar
            primaryAction={
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className={`${erpBtnNuovaLavorazione} h-11 shrink-0`}
                disabled={mutPending || !createdBy || !canEditWorkOrders}
                title={!canEditWorkOrders ? READONLY_PERMISSION_HINT : !createdBy ? "Accedi per creare una lavorazione." : undefined}
              >
                + Nuova lavorazione
              </button>
            }
            search={
              <GestionaleSearchField
                id="lavorazioni-search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    flushPageSearch();
                  }
                }}
                placeholder={GESTIONALE_SEARCH_PLACEHOLDER}
                aria-label="Cerca in lavorazioni in corso e archivio"
                wrapperClassName="min-w-0 flex-1 sm:min-w-[12rem]"
              />
            }
            filtersExpanded={filtriAttiviEspansi}
            onFiltersToggle={() => setFiltriAttiviEspansi((o) => !o)}
            filtersActive={hasPageClientFilters || Boolean(navMezzoFilter)}
            filtersPanel={
              <LavorazioniAdvancedFilterPanel
                filters={advancedFilters}
                onChange={patchAdvancedFilters}
                catalog={filterCatalog}
                statiOpts={statiOpts}
              />
            }
            meta={
              <>
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  {mutPending ? (
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Salvataggio in corso…</span>
                  ) : null}
                  {!createdBy ? (
                    <span className="text-xs text-amber-800 dark:text-amber-200">Accedi per registrare nuove lavorazioni.</span>
                  ) : null}
                  <PageToolbarResultCount
                    count={totalFilteredCount}
                    filtersActive={hasPageClientFilters || Boolean(navMezzoFilter)}
                  />
                  {hasPageClientFilters || navMezzoFilter ? (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {attiveRowsFiltered.length} in corso · {chiuseRowsFiltered.length} in archivio
                    </span>
                  ) : null}
                </div>
                <PageToolbarActions>
                  <button type="button" className={dsPageToolbarBtn} onClick={resetRicercaPagina}>
                    Pulisci ricerca
                  </button>
                  <button type="button" className={dsPageToolbarBtn} onClick={resetFiltriPagina}>
                    Reimposta filtri
                  </button>
                </PageToolbarActions>
              </>
            }
          />
          </section>
        </ShellCard>

        <ShellCard>
          {listViewMode === "kanban" ? (
            <LavorazioniKanbanView
              rows={attiveRowsFiltered}
              columns={statiInCorsoOpts}
              statiOpts={statiOpts}
              schedeStore={schedeStore}
              defaultAddetto={defaultAddetto}
              prioritaColors={globalOpts.lavorazioni.prioritaColors}
              flashRowId={flashRowId}
              navBulkFlashIds={navBulkFlashIds}
              loading={loading}
              emptyMessage={
                hasPageClientFilters || navMezzoFilter
                  ? "Nessuna lavorazione in corso corrisponde alla ricerca o ai filtri selezionati."
                  : "Nessuna lavorazione in corso."
              }
              onOpenRow={(row) => setSchedeRow({ row, origine: "attiva", initialTab: "panoramica" })}
            />
          ) : (
            <>
          {loading ? <p className="text-sm text-zinc-500">Caricamento…</p> : null}

          <GestionaleListTable
            visibilityClass="hidden md:block"
            colgroup={
              <>
                <col className={lavTableColIngressoClass} />
                <col className={lavTableColClienteClass} />
                <col className={lavTableColCantiereClass} />
                <col className={lavTableColAttrezzaturaClass} />
                <col className={lavTableColIdentificazioneClass} />
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
                    label="Attrezzatura"
                    columnKey="macchina"
                    sortColumn={sortColA}
                    sortPhase={sortPhaseA}
                    onSort={(k) => cycleSort(sortColA, setSortColA, setSortPhaseA, k as SortKeyAtt)}
                  />
                  <GlobalTableSortTh
                    label="Identificazione"
                    columnKey="mezzoIdent"
                    sortColumn={sortColA}
                    sortPhase={sortPhaseA}
                    onSort={(k) => cycleSort(sortColA, setSortColA, setSortPhaseA, k as SortKeyAtt)}
                  />
                  <GlobalTableSortTh
                    label="Note"
                    columnKey="note"
                    sortColumn={sortColA}
                    sortPhase={sortPhaseA}
                    onSort={(k) => cycleSort(sortColA, setSortColA, setSortPhaseA, k as SortKeyAtt)}
                  />
                  <GlobalTableSortTh
                    label="Stato"
                    columnKey="stato"
                    sortColumn={sortColA}
                    sortPhase={sortPhaseA}
                    align="center"
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
            colSpan={10}
          >
                  {pagedAttive.map((row) => {
                    const flash = flashRowId === row.id || navBulkFlashIds.has(row.id);
                    return (
                      <tr
                        key={row.id}
                        id={`lavorazioni-row-${row.id}`}
                        className={[
                          dsTableRow,
                          "h-14 bg-white dark:bg-zinc-900/40",
                          flash
                            ? "bg-orange-50/90 shadow-[inset_0_0_0_1px_rgba(251,146,60,0.45)] ring-2 ring-orange-400/35"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <td className={lavTableTd}>
                          <LavorazioneIngressoDateCell row={row} schedeStore={schedeStore} />
                        </td>
                        <td className={lavTableTd}>
                          <ClienteUtilizzatoreCell row={row} schedeStore={schedeStore} />
                        </td>
                        <td className={`${lavTableTd} min-w-0 text-sm text-zinc-700 dark:text-zinc-200`}>
                          <span className="line-clamp-2 break-words">{cantiereLabel(row, schedeStore)}</span>
                        </td>
                        <td className={`${lavTableTd} min-w-0`}>
                          <div className="truncate text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100">{macchinaLabel(row, schedeStore)}</div>
                        </td>
                        <td className={lavTableTd}>
                          <MezzoIdentStackCell row={row} schedeStore={schedeStore} />
                        </td>
                        <td className={`${lavTableTd} min-w-0 text-sm text-zinc-600 dark:text-zinc-300`}>
                          <span className="line-clamp-2">{lavorazioneNoteOperative(row, schedeStore) || "—"}</span>
                        </td>
                        <td className={lavTableTdPill}>
                          <div className={lavTableTdPillWrap} style={statoPillWrapStyle}>
                          <InlineSelectField
                            tablePill
                            tablePillWidth={lavTablePillFillClass}
                            tablePillOptions={tablePillOptions.stati(statiRapidiOpts)}
                            shellClass={statoPillShellClass()}
                            shellStyle={readablePillStyleFromHex(statoDisplayColor(row.stato, statiOpts))}
                            value={row.stato}
                            onChange={(v) => onStatoRow(row, v)}
                            ariaLabel={`Stato — ${macchinaLabel(row, schedeStore)}`}
                            disabled={mutPending || loading || !canEditWorkOrders}
                            title={statoLavorazioneLabel(row.stato, statiOpts)}
                          >
                            <option value={row.stato}>{statoLavorazioneLabel(row.stato, statiOpts)}</option>
                          </InlineSelectField>
                          </div>
                        </td>
                        <td className={lavTableTdPill}>
                          <div className={lavTableTdPillWrap} style={prioritaPillWrapStyle}>
                          <InlineSelectField
                            tablePill
                            tablePillWidth={lavTablePillFillClass}
                            tablePillOptions={tablePillOptions.priorita(prioritaOpts)}
                            shellClass={prioritaPillShellClass()}
                            shellStyle={readablePillStyleFromHex(prioColor(row.priorita))}
                            value={row.priorita}
                            onChange={(v) => onPrioritaRow(row, v)}
                            ariaLabel={`Priorità — ${macchinaLabel(row, schedeStore)}`}
                            disabled={mutPending || loading || !canEditWorkOrders}
                            title={prioritaLabel(row.priorita)}
                          >
                            <option value={row.priorita}>{prioritaLabel(row.priorita)}</option>
                          </InlineSelectField>
                          </div>
                        </td>
                        <td className={lavTableTdPill}>
                          <div className={lavTableTdPillWrap} style={addettoPillWrapStyle}>
                          {(() => {
                            const addetto = addettoLabel(row, schedeStore, defaultAddetto);
                            const addetti = globalOpts.lavorazioni.addetti;
                            return (
                              <InlineSelectField
                                tablePill
                                tablePillWidth={lavTablePillFillClass}
                                tablePillOptions={tablePillOptions.addetto(addetto)}
                                shellClass={addettoPillShellClass()}
                                shellStyle={addettoPillShellStyle(globalOpts.lavorazioni.addettoColors[addetto])}
                                value={addettoSelectValue(addetto, addetti)}
                                onChange={(v) => onAddettoRow(row, v)}
                                ariaLabel={`Addetto — ${macchinaLabel(row, schedeStore)}`}
                                disabled={mutPending || loading || !canEditWorkOrders || addetti.length === 0}
                                title={addetto}
                              >
                                <option value={addettoSelectValue(addetto, addetti)}>{addetto}</option>
                              </InlineSelectField>
                            );
                          })()}
                          </div>
                        </td>
                        <td className={lavTableTdAzioni}>
                          <div className={lavTableActionsRow}>
                            <button
                              type="button"
                              className={lavTableActionBtnSecondary}
                              title={row.stato === "completata" ? "Concludi lavorazione" : "Concludi disponibile solo con stato completata"}
                              aria-label="Concludi lavorazione"
                              disabled={mutPending || loading || !canEditWorkOrders || row.stato !== "completata" || row.archived === true}
                              onClick={() => openConcludiConfirm(row)}
                            >
                              <IconCloseWork />
                            </button>
                            {canDeleteLavorazioneAttiva(row, canDeleteRecords) ? (
                              <button
                                type="button"
                                className={lavTableActionBtnDanger}
                                title="Elimina"
                                aria-label="Elimina"
                                disabled={mutPending || loading || !canDeleteRecords}
                                onClick={() => openEliminaConfirm(row)}
                              >
                                <IconTrash />
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className={lavTableActionBtnInfo}
                              title="Apri dettaglio lavorazione"
                              aria-label="Apri dettaglio lavorazione"
                              disabled={mutPending}
                              onClick={() => setSchedeRow({ row, origine: "attiva", initialTab: "panoramica" })}
                            >
                              <IconInfo />
                            </button>
                            <button
                              type="button"
                              className={`${lavTableActionBtnPrimary} ${dsTableActionBtnWithBadge}`}
                              title="Apri schede lavorazione"
                              aria-label="Apri schede lavorazione"
                              disabled={mutPending}
                              onClick={() => setSchedeRow({ row, origine: "attiva", initialTab: "schede" })}
                            >
                              <IconSchede />
                              <span className={dsTableActionBadge} aria-hidden>
                                {schedeCountForRow(row, schedeStore)}/3
                              </span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
          </GestionaleListTable>

          <div className="mt-4 space-y-2 md:hidden">
            {pagedAttive.length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                {hasPageClientFilters || navMezzoFilter
                  ? "Nessuna lavorazione in corso corrisponde alla ricerca o ai filtri selezionati."
                  : "Nessuna lavorazione in corso."}
              </p>
            ) : (
              pagedAttive.map((row) => {
                const macchina = macchinaLabel(row, schedeStore);
                const utilizzatore = utilizzatoreLabel(row, schedeStore);
                return (
                <LavorazioneMobileCardShell key={row.id}>
                  <LavorazioneMobileCardHeader
                    macchina={macchina}
                    identLine={formatLavorazioneMobileIdentLine(mezzoIdentParts(row, schedeStore))}
                    ingresso={<LavorazioneIngressoDateCell row={row} schedeStore={schedeStore} />}
                    statusSlot={
                      <LavorazioneMobileStatusSlot>
                        <InlineSelectField
                          tablePill
                          tablePillWidth={lavTablePillFillClass}
                          tablePillOptions={tablePillOptions.stati(statiRapidiOpts)}
                          shellClass={statoPillShellClass()}
                          shellStyle={readablePillStyleFromHex(statoDisplayColor(row.stato, statiOpts))}
                          value={row.stato}
                          onChange={(v) => onStatoRow(row, v)}
                          ariaLabel={`Stato — ${macchina}`}
                          disabled={mutPending || loading || !canEditWorkOrders}
                          title={statoLavorazioneLabel(row.stato, statiOpts)}
                        >
                          <option value={row.stato}>{statoLavorazioneLabel(row.stato, statiOpts)}</option>
                        </InlineSelectField>
                      </LavorazioneMobileStatusSlot>
                    }
                  />
                  <LavorazioneMobileMetaGrid>
                    <LavorazioneMobileMetaItem label="Cliente" value={clienteLabel(row, schedeStore)} />
                    <LavorazioneMobileMetaItem label="Cantiere" value={cantiereLabel(row, schedeStore)} />
                    {utilizzatore ? (
                      <LavorazioneMobileMetaItem
                        label="Utilizzatore"
                        value={utilizzatore}
                        className="col-span-2"
                      />
                    ) : null}
                  </LavorazioneMobileMetaGrid>
                  <LavorazioneMobileNote text={lavorazioneNoteOperative(row, schedeStore)} />
                  <LavorazioneMobileControlsPanel>
                    <LavMobileInlineField label="Priorità" layout="stack">
                      <InlineSelectField
                        tablePill
                        tablePillWidth={lavTablePillFillClass}
                        tablePillOptions={tablePillOptions.priorita(prioritaOpts)}
                        shellClass={prioritaPillShellClass()}
                        shellStyle={readablePillStyleFromHex(prioColor(row.priorita))}
                        value={row.priorita}
                        onChange={(v) => onPrioritaRow(row, v)}
                        ariaLabel={`Priorità — ${macchina}`}
                        disabled={mutPending || loading || !canEditWorkOrders}
                        title={prioritaLabel(row.priorita)}
                      >
                        <option value={row.priorita}>{prioritaLabel(row.priorita)}</option>
                      </InlineSelectField>
                    </LavMobileInlineField>
                    <LavMobileInlineField label="Addetto" layout="stack">
                      {(() => {
                        const addetto = addettoLabel(row, schedeStore, defaultAddetto);
                        const addetti = globalOpts.lavorazioni.addetti;
                        return (
                          <InlineSelectField
                            tablePill
                            tablePillWidth={lavTablePillFillClass}
                            tablePillOptions={tablePillOptions.addetto(addetto)}
                            shellClass={addettoPillShellClass()}
                            shellStyle={addettoPillShellStyle(globalOpts.lavorazioni.addettoColors[addetto])}
                            value={addettoSelectValue(addetto, addetti)}
                            onChange={(v) => onAddettoRow(row, v)}
                            ariaLabel={`Addetto — ${macchina}`}
                            disabled={mutPending || loading || !canEditWorkOrders || addetti.length === 0}
                            title={addetto}
                          >
                            <option value={addettoSelectValue(addetto, addetti)}>{addetto}</option>
                          </InlineSelectField>
                        );
                      })()}
                    </LavMobileInlineField>
                  </LavorazioneMobileControlsPanel>
                  <LavorazioneMobileCardFooter
                    meta={
                      <LavorazioneMobileUltimaModifica
                        info={resolveLavorazioneUltimaModifica(row, schedeStore[row.id])}
                      />
                    }
                  >
                    <button type="button" className={dsTableActionBtnSecondary} title={row.stato === "completata" ? "Concludi lavorazione" : "Concludi disponibile solo con stato completata"} aria-label="Concludi lavorazione" disabled={mutPending || loading || !canEditWorkOrders || row.stato !== "completata" || row.archived === true} onClick={() => openConcludiConfirm(row)}>
                      <IconCloseWork />
                    </button>
                    {canDeleteLavorazioneAttiva(row, canDeleteRecords) ? (
                      <button
                        type="button"
                        className={dsTableActionBtnDanger}
                        title="Elimina"
                        aria-label="Elimina"
                        disabled={mutPending || loading || !canDeleteRecords}
                        onClick={() => openEliminaConfirm(row)}
                      >
                        <IconTrash />
                      </button>
                    ) : null}
                    <button type="button" className={dsTableActionBtnInfo} title="Apri dettaglio lavorazione" aria-label="Apri dettaglio lavorazione" disabled={mutPending} onClick={() => setSchedeRow({ row, origine: "attiva", initialTab: "panoramica" })}>
                      <IconInfo />
                    </button>
                    <button
                      type="button"
                      className={`${dsTableActionBtnPrimary} ${dsTableActionBtnWithBadge}`}
                      title="Apri schede lavorazione"
                      aria-label="Apri schede lavorazione"
                      disabled={mutPending}
                      onClick={() => setSchedeRow({ row, origine: "attiva", initialTab: "schede" })}
                    >
                      <IconSchede />
                      <span className={dsTableActionBadge} aria-hidden>
                        {schedeCountForRow(row, schedeStore)}/3
                      </span>
                    </button>
                  </LavorazioneMobileCardFooter>
                </LavorazioneMobileCardShell>
              );
              })
            )}
          </div>

          {showPagerA ? <TablePagination page={pageA} pageCount={pageCountA} onPageChange={setPageA} label={labelA} /> : null}
            </>
          )}
        </ShellCard>

        {listViewMode === "table" ? (
        <ShellCard title="Archivio lavorazioni">
          <GestionaleListTable
            visibilityClass="hidden md:block"
            colgroup={
              <>
                <col className={lavTableColIngressoClass} />
                <col className={lavTableColClienteClass} />
                <col className={lavTableColCantiereClass} />
                <col className={lavTableColAttrezzaturaClass} />
                <col className={lavTableColIdentificazioneClass} />
                <col className={lavTableColNoteClass} />
                <col style={archivioMiddleColStyle} />
                <col style={archivioMiddleColStyle} />
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
                    label="Attrezzatura"
                    columnKey="macchina"
                    sortColumn={sortColC}
                    sortPhase={sortPhaseC}
                    align="left"
                    onSort={(k) => cycleSort(sortColC, setSortColC, setSortPhaseC, k as SortKeyCh)}
                  />
                  <GlobalTableSortTh
                    label="Identificazione"
                    columnKey="mezzoIdent"
                    sortColumn={sortColC}
                    sortPhase={sortPhaseC}
                    align="left"
                    onSort={(k) => cycleSort(sortColC, setSortColC, setSortPhaseC, k as SortKeyCh)}
                  />
                  <GlobalTableSortTh
                    label="Note"
                    columnKey="note"
                    sortColumn={sortColC}
                    sortPhase={sortPhaseC}
                    align="left"
                    onSort={(k) => cycleSort(sortColC, setSortColC, setSortPhaseC, k as SortKeyCh)}
                  />
                  <GlobalTableSortTh
                    label="Completamento"
                    columnKey="completamento"
                    sortColumn={sortColC}
                    sortPhase={sortPhaseC}
                    align="center"
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
            colSpan={10}
          >
                  {pagedChiuse.map((row) => {
                    const flash = flashRowId === row.id || navBulkFlashIds.has(row.id);
                    const telaio = telaioLabel(row, schedeStore);
                    return (
                      <tr
                        key={row.id}
                        id={`lavorazioni-storico-row-${row.id}`}
                        className={[
                          dsTableRow,
                          "h-14 bg-white dark:bg-zinc-900/40",
                          flash
                            ? "bg-orange-50/90 shadow-[inset_0_0_0_1px_rgba(251,146,60,0.45)] ring-2 ring-orange-400/35"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <td className={lavTableTd}>
                          <LavorazioneIngressoDateCell row={row} schedeStore={schedeStore} />
                        </td>
                        <td className={lavTableTd}>
                          <ClienteUtilizzatoreCell row={row} schedeStore={schedeStore} />
                        </td>
                        <td className={`${lavTableTd} min-w-0 text-sm text-zinc-700 dark:text-zinc-200`}>
                          <span className="line-clamp-2 break-words">{cantiereLabel(row, schedeStore)}</span>
                        </td>
                        <td className={`${lavTableTd} min-w-0`}>
                          <div className="truncate text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100">{macchinaLabel(row, schedeStore)}</div>
                          {telaio !== "—" ? (
                            <div className="truncate text-[10px] leading-tight text-zinc-500 dark:text-zinc-400">Telaio: {telaio}</div>
                          ) : null}
                        </td>
                        <td className={lavTableTd}>
                          <MezzoIdentStackCell row={row} schedeStore={schedeStore} />
                        </td>
                        <td className={`${lavTableTd} min-w-0 text-sm text-zinc-600 dark:text-zinc-300`}>
                          <span className="line-clamp-2">{lavorazioneNoteOperative(row, schedeStore) || "—"}</span>
                        </td>
                        <td className={lavTableTdCenter}>
                          <LavorazioneIngressoDateCellFromIso iso={dataCompletamentoIso(row)} align="center" />
                        </td>
                        <td className={lavTableTdCenter}>{oreLavoroLabel(row, schedeStore)}</td>
                        <td className={lavTableTdPill}>
                          <div className={lavTableTdPillWrap} style={addettoPillWrapStyle}>
                            <span className={`whitespace-nowrap ${lavTablePillTextClass} text-zinc-800 dark:text-zinc-100`}>
                              {addettoLabel(row, schedeStore, defaultAddetto)}
                            </span>
                          </div>
                        </td>
                        <td className={lavTableTdAzioni}>
                          <div className={lavTableActionsRow}>
                            <button
                              type="button"
                              className={lavTableActionBtnDanger}
                              title="Ripristina lavorazione"
                              aria-label="Ripristina lavorazione"
                              disabled={!canEditWorkOrders || mutPending || loading}
                              onClick={() => submitRipristinaInLavorazione(row)}
                            >
                              <IconRipristinaDaArchivio />
                            </button>
                            <button type="button" className={lavTableActionBtnInfo} title="Apri dettaglio lavorazione" aria-label="Apri dettaglio lavorazione" onClick={() => setSchedeRow({ row, origine: "storico", initialTab: "panoramica" })}>
                              <IconInfo />
                            </button>
                            <button
                              type="button"
                              className={`${lavTableActionBtnPrimary} ${dsTableActionBtnWithBadge}`}
                              title="Apri schede lavorazione"
                              aria-label="Apri schede lavorazione"
                              onClick={() => setSchedeRow({ row, origine: "storico", initialTab: "schede" })}
                            >
                              <IconSchede />
                              <span className={dsTableActionBadge} aria-hidden>
                                {schedeCountForRow(row, schedeStore)}/3
                              </span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
          </GestionaleListTable>

          <div className="mt-4 space-y-2 md:hidden">
            {pagedChiuse.length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                {hasPageClientFilters || navMezzoFilter
                  ? "Nessun record in archivio corrisponde alla ricerca o ai filtri selezionati."
                  : "Nessun record in archivio."}
              </p>
            ) : (
              pagedChiuse.map((row) => {
              const telaio = telaioLabel(row, schedeStore);
              const macchina = macchinaLabel(row, schedeStore);
              const utilizzatore = utilizzatoreLabel(row, schedeStore);
              const identBase = formatLavorazioneMobileIdentLine(mezzoIdentParts(row, schedeStore));
              const identLine =
                telaio !== "—"
                  ? [identBase, `Telaio: ${telaio}`].filter(Boolean).join(" · ") || null
                  : identBase;
              return (
                <LavorazioneMobileCardShell key={row.id}>
                  <LavorazioneMobileCardHeader
                    macchina={macchina}
                    identLine={identLine}
                    ingresso={
                      <div className="text-right [&_div]:text-right">
                        <LavorazioneIngressoDateCell row={row} schedeStore={schedeStore} />
                      </div>
                    }
                    secondaryDate={{ label: "Completamento", value: fmtDay(dataCompletamentoIso(row)) }}
                  />
                  <LavorazioneMobileMetaGrid>
                    <LavorazioneMobileMetaItem label="Cliente" value={clienteLabel(row, schedeStore)} />
                    <LavorazioneMobileMetaItem label="Cantiere" value={cantiereLabel(row, schedeStore)} />
                    <LavorazioneMobileMetaItem label="Ore lavoro" value={oreLavoroLabel(row, schedeStore)} />
                    <LavorazioneMobileMetaItem
                      label="Addetto"
                      value={addettoLabel(row, schedeStore, defaultAddetto)}
                    />
                    {utilizzatore ? (
                      <LavorazioneMobileMetaItem
                        label="Utilizzatore"
                        value={utilizzatore}
                        className="col-span-2"
                      />
                    ) : null}
                  </LavorazioneMobileMetaGrid>
                  <LavorazioneMobileNote text={lavorazioneNoteOperative(row, schedeStore)} />
                  <LavorazioneMobileCardFooter
                    meta={
                      <LavorazioneMobileUltimaModifica
                        info={resolveLavorazioneUltimaModifica(row, schedeStore[row.id])}
                      />
                    }
                  >
                    <button
                      type="button"
                      className={lavTableActionBtnDanger}
                      title="Ripristina lavorazione"
                      aria-label="Ripristina lavorazione"
                      disabled={!canEditWorkOrders || mutPending || loading}
                      onClick={() => submitRipristinaInLavorazione(row)}
                    >
                      <IconRipristinaDaArchivio />
                    </button>
                    <button type="button" className={lavTableActionBtnInfo} title="Apri dettaglio lavorazione" aria-label="Apri dettaglio lavorazione" onClick={() => setSchedeRow({ row, origine: "storico", initialTab: "panoramica" })}>
                      <IconInfo />
                    </button>
                    <button
                      type="button"
                      className={`${lavTableActionBtnPrimary} ${dsTableActionBtnWithBadge}`}
                      title="Apri schede lavorazione"
                      aria-label="Apri schede lavorazione"
                      onClick={() => setSchedeRow({ row, origine: "storico", initialTab: "schede" })}
                    >
                      <IconSchede />
                      <span className={dsTableActionBadge} aria-hidden>
                        {schedeCountForRow(row, schedeStore)}/3
                      </span>
                    </button>
                  </LavorazioneMobileCardFooter>
                </LavorazioneMobileCardShell>
              );
            })
            )}
          </div>

          {showPagerC ? <TablePagination page={pageC} pageCount={pageCountC} onPageChange={setPageC} label={labelC} /> : null}
        </ShellCard>
        ) : null}

      </div>

      <Drawer
        open={lavLogOpen}
        onClose={() => setLavLogOpen(false)}
        title="Log modifiche lavorazioni"
        ariaLabel="Log modifiche lavorazioni"
      >
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-3">
              {lavModificheLogQuery.isError ? (
                <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                  Impossibile caricare il log dal server. Riprova più tardi.
                </p>
              ) : null}
              <div className={`${gestionaleLogScrollEmbeddedClass} min-h-0 flex-1`}>
                {lavModificheLogQuery.isLoading ? (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Caricamento log…</p>
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

      {schedeRow ? (
        <SchedeLavorazioneModal
          open
          onClose={() => setSchedeRow(null)}
          lav={
            schedeRow.origine === "storico"
              ? rowToLegacyArchiviata(schedeRow.row, defaultAddetto)
              : rowToLegacyAttiva(schedeRow.row, defaultAddetto)
          }
          origine={schedeRow.origine}
          initialTab={schedeRow.initialTab}
          bundle={getOrCreateBundle(schedeStore, schedeRow.row.id)}
          onPersist={(next) => {
            persistSchedeAndSync(persistSchedeBundle(next));
          }}
          onIngressoCommitted={async (campi) => {
            if (!schedeRow) return;
            try {
              await syncIngressoToBackend(schedeRow.row, campi);
            } catch {
              window.alert("Scheda ingresso salvata localmente; sincronizzazione anagrafica mezzo non completata.");
            }
          }}
          attive={attiveLegacyRows}
          storico={storicoLegacyRows}
          mezzi={mezziCatalog}
          addetti={globalOpts.lavorazioni.addetti}
          currentUser={authorName}
          schedeStore={schedeStore}
        />
      ) : null}

      <LavorazioneCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        createdBy={createdBy}
        mezzi={mezziCatalog}
        schedeStore={schedeStore}
        attive={attiveLegacyRows}
        storico={storicoLegacyRows}
        onCreated={(id) => {
          invalidateSchedeStore();
          flashRow(id);
        }}
      />

      <LavorazioneConcludiConfirmDialog
        open={concludiConfirmRow != null}
        pending={concludeLav.isPending}
        onCancel={() => {
          if (!concludeLav.isPending) setConcludiConfirmRow(null);
        }}
        onConfirm={confirmConcludiLavorazione}
      />

      <LavorazioneEliminaConfirmDialog
        open={eliminaConfirmRow != null}
        pending={removeLav.isPending}
        onCancel={() => {
          if (!removeLav.isPending) setEliminaConfirmRow(null);
        }}
        onConfirm={confirmEliminaLavorazione}
      />

    </>
  );
}
