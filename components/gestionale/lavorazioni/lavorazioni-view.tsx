"use client";

import "./lavorazioni-scroll.css";
import "./lavorazioni-select-theme.css";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/gestionale/page-header";
import { ShellCard } from "@/components/gestionale/shell-card";
import { TablePagination } from "@/components/gestionale/table-pagination";
import { GestionaleSearchField } from "@/components/gestionale/gestionale-search-field";
import { LavorazioneCreateModal } from "@/components/gestionale/lavorazioni/lavorazione-create-modal";
import { LavorazioneDetailModal } from "@/components/gestionale/lavorazioni/lavorazione-detail-modal";
import { LavorazioneEditModal } from "@/components/gestionale/lavorazioni/lavorazione-edit-modal";
import { InlineSelectField } from "@/components/gestionale/lavorazioni/lavorazioni-inline-select";
import { buildPreventiviArchivioFilterHref } from "@/lib/preventivi/preventivi-lavorazione-href";
import { labelLavorazioneStatoDb } from "@/lib/mezzi/interventi-from-lavorazioni-db";
import { lavorazioneMatchesMezzo } from "@/lib/mezzi/lavorazioni-sync";
import { lavRowToMatchShape } from "@/lib/mezzi/mezzi-db-ui-adapter";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { Q_FOCUS_LAV_ROW, Q_FOCUS_MEZZO, Q_LAVORAZIONI_MEZZO_ID } from "@/lib/navigation/dashboard-log-links";
import { readablePillStyleFromHex } from "@/lib/lavorazioni/table-pill-readability";
import { prioritaDisplayColor, statoThemeColor } from "@/lib/lavorazioni/lavorazioni-theme";
import type { PrioritaLav } from "@/lib/lavorazioni/types";
import { isStatoLavorazioneChiusoDb } from "@/lib/lavorazioni/lavorazioni-report-adapter";
import { durataMsStorico, formatDurataMs } from "@/lib/lavorazioni/duration";
import { lavRowIngressoInRange, lavRowMatchesGlobalSearch } from "@/lib/lavorazioni/lavorazioni-list-ui-filters";
import { getMezziReportSnapshot, subscribeMezziReportSync } from "@/lib/mezzi/mezzi-report-sync";
import {
  dsBtnNeutral,
  dsInput,
  dsLabel,
  dsPageToolbarBtn,
  dsStackPage,
  dsStickyToolbar,
  dsScrollbar,
  GESTIONALE_SEARCH_PLACEHOLDER,
  dsTable,
  dsTableRow,
  dsTableWrap,
  dsTableThSticky,
  dsTableTdActions,
  dsTableActionsGroup,
  dsTableActionsGroupStart,
  dsTableActionTextBtn,
  dsTableActionTextBtnPrimary,
  dsTableActionTextBtnDanger,
} from "@/lib/ui/design-system";
import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { LAVORAZIONI_MOCK_MODIFICHE_ENTRIES, LAVORAZIONI_MOCK_MODIFICHE_FLAG } from "@/components/gestionale/lavorazioni/lavorazioni-mock-modifiche";
import {
  GestionaleLogEmpty,
  GestionaleLogEntryFourLines,
  GestionaleLogList,
  gestionaleLogPanelAsideClass,
  gestionaleLogPanelHeaderClass,
  gestionaleLogScrollEmbeddedClass,
  IconGestionaleLog,
} from "@/components/gestionale/gestionale-log-ui";
import { useServiceQuery } from "@/src/hooks/use-service-query";
import { logService } from "@/src/services/log.service";
import type { LogModificaRow } from "@/src/types/supabase-tables";
import type { GestionaleLogEventTone, GestionaleLogViewModel } from "@/lib/gestionale-log/view-model";
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import { useResponsiveListPageSize } from "@/lib/ui/use-responsive-list-page-size";
import {
  LAVORAZIONI_STATI_CHIUSE,
  LAVORAZIONI_STATI_IN_CORSO,
  type LavorazioneFilters,
  type LavorazioneListRow,
  type LavorazioneUpdate,
} from "@/src/services/lavorazioni.service";
import { useLavorazioniList } from "@/src/services/domain/lavorazioni-domain.queries";
import { useLavorazioneRemoveMutation, useLavorazioneUpdateMutation } from "@/src/hooks/gestionale/use-lavorazione-mutations";
import type { PrioritaLavorazione, StatoLavorazione } from "@/src/types/supabase-tables";
import { useAuth } from "@/context/auth-context";
import {
  erpBtnAccent,
  erpBtnNeutral,
  erpBtnNuovaLavorazione,
  erpFocus,
  FilterSelectWrap,
  gestionaleSelectFilterClass,
  prioritaLabel,
  prioritaPillShellClass,
  selectLavorazioniFilter,
  statoPillShellClass,
} from "@/components/gestionale/lavorazioni/lavorazioni-shared";

function fmtDay(iso: string | null | undefined): string {
  if (!iso?.trim()) return "—";
  try {
    return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return iso;
  }
}

function fmtDayCompact(iso: string | null | undefined): string {
  if (!iso?.trim()) return "—";
  try {
    return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit" });
  } catch {
    return iso;
  }
}

function logAutoreLabel(r: LogModificaRow, currentUserId: string | null, displayName: string): string {
  if (r.autore_id && currentUserId && r.autore_id === currentUserId) return displayName.trim() || "Tu";
  if (r.autore_id) return `Utente ${r.autore_id.slice(0, 8)}…`;
  return "Sistema";
}

function logPayloadSnippet(payload: unknown): string | null {
  if (payload == null) return null;
  try {
    const s = typeof payload === "string" ? payload : JSON.stringify(payload);
    if (!s.trim()) return null;
    return s.length > 140 ? `${s.slice(0, 137)}…` : s;
  } catch {
    return null;
  }
}

function toneFromLogAzione(azione: string): GestionaleLogEventTone {
  const u = (azione ?? "").toUpperCase();
  if (u === "CREATE") return "create";
  if (u === "DELETE") return "delete";
  return "update";
}

function logModificaRowToGestionaleVm(r: LogModificaRow, autore: string): GestionaleLogViewModel {
  return {
    tone: toneFromLogAzione(r.azione),
    tipoRiga: (r.azione ?? "UPDATE").toUpperCase(),
    oggettoRiga: `Lavorazione · ${r.entita_id}`,
    modificaRiga: logPayloadSnippet(r.payload) ?? "—",
    autore,
    atIso: r.created_at,
  };
}

function mockLavLogToGestionaleVm(r: (typeof LAVORAZIONI_MOCK_MODIFICHE_ENTRIES)[number]): GestionaleLogViewModel {
  const a = (r.azione ?? "").toLowerCase();
  let tone: GestionaleLogEventTone = "update";
  if (a === "create") tone = "create";
  else if (a === "delete") tone = "delete";
  const tipoRiga = a === "create" ? "CREAZIONE" : a === "delete" ? "ELIMINAZIONE" : "AGGIORNAMENTO";
  return {
    tone,
    tipoRiga,
    oggettoRiga: `Lavorazione · ${r.entita_id}`,
    modificaRiga: r.campoModificato === "—" ? "Registrazione iniziale" : `Campo: ${r.campoModificato}`,
    autore: r.utenteLabel,
    atIso: r.created_at,
  };
}

function fmtOreTotaliCell(row: LavorazioneListRow): string {
  const ms = durataMsStorico(
    (row.data_ingresso ?? row.created_at) as string,
    (row.data_uscita ?? row.updated_at) as string,
  );
  if (ms <= 0) return "—";
  return formatDurataMs(ms);
}

function macchinaLabel(row: LavorazioneListRow): string {
  const m = row.mezzo;
  return m ? `${m.marca} ${m.modello}`.trim() : "—";
}

function clienteLabel(row: LavorazioneListRow): string {
  return row.mezzo?.cliente?.trim() || "—";
}

function mezzoIdent(row: LavorazioneListRow): string {
  const m = row.mezzo;
  const t = m?.targa?.trim() || "—";
  const mat = m?.matricola?.trim() || "—";
  const sc = m?.numero_scuderia?.trim() || "—";
  return `${t} · ${mat} · ${sc}`;
}

const PRIORITA_OPTS: PrioritaLavorazione[] = ["bassa", "media", "alta", "urgente"];

/** Stati selezionabili in tabella (in corso + chiusura). */
const STATI_RAPIDI: StatoLavorazione[] = [...LAVORAZIONI_STATI_IN_CORSO, ...LAVORAZIONI_STATI_CHIUSE];

function canDeleteLavorazioneBozza(row: LavorazioneListRow): boolean {
  return row.stato === "bozza";
}

function prioHex(p: PrioritaLavorazione): string {
  if (p === "urgente") return "#b91c1c";
  return prioritaDisplayColor(p as PrioritaLav, null);
}

function ymdEndDayIso(ymd: string): string {
  const t = ymd.trim();
  return t.length <= 10 ? `${t}T23:59:59.999Z` : t;
}

function todayYmd(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

type SortPhase = "asc" | "desc" | "natural";
type SortKeyAtt = "macchina" | "cliente" | "note" | "stato" | "priorita" | "ingresso";
type SortKeyCh = "macchina" | "mezzoIdent" | "cliente" | "ingresso" | "uscita" | "oreTotali";

function cmpStr(a: string, b: string): number {
  return a.localeCompare(b, "it", { sensitivity: "base" });
}

function cmpAtt(a: LavorazioneListRow, b: LavorazioneListRow, k: SortKeyAtt, phase: SortPhase): number {
  const dir = phase === "desc" ? -1 : 1;
  const t = (x: number) => x * dir;
  if (k === "macchina") return t(cmpStr(macchinaLabel(a), macchinaLabel(b)));
  if (k === "cliente") return t(cmpStr(clienteLabel(a), clienteLabel(b)));
  if (k === "note") return t(cmpStr((a.note ?? "").trim(), (b.note ?? "").trim()));
  if (k === "stato") return t(cmpStr(a.stato, b.stato));
  if (k === "priorita") return t(cmpStr(a.priorita, b.priorita));
  const da = new Date(a.data_ingresso ?? a.created_at).getTime();
  const db = new Date(b.data_ingresso ?? b.created_at).getTime();
  return t(da === db ? 0 : da < db ? -1 : 1);
}

function cmpCh(a: LavorazioneListRow, b: LavorazioneListRow, k: SortKeyCh, phase: SortPhase): number {
  const dir = phase === "desc" ? -1 : 1;
  const t = (x: number) => x * dir;
  if (k === "macchina") return t(cmpStr(macchinaLabel(a), macchinaLabel(b)));
  if (k === "mezzoIdent") return t(cmpStr(mezzoIdent(a), mezzoIdent(b)));
  if (k === "cliente") return t(cmpStr(clienteLabel(a), clienteLabel(b)));
  if (k === "ingresso") {
    const da = new Date(a.data_ingresso ?? a.created_at).getTime();
    const db = new Date(b.data_ingresso ?? b.created_at).getTime();
    return t(da === db ? 0 : da < db ? -1 : 1);
  }
  if (k === "oreTotali") {
    const ra = durataMsStorico(
      (a.data_ingresso ?? a.created_at) as string,
      (a.data_uscita ?? a.updated_at) as string,
    );
    const rb = durataMsStorico(
      (b.data_ingresso ?? b.created_at) as string,
      (b.data_uscita ?? b.updated_at) as string,
    );
    return t(ra === rb ? 0 : ra < rb ? -1 : 1);
  }
  const ua = new Date(a.data_uscita ?? a.updated_at).getTime();
  const ub = new Date(b.data_uscita ?? b.updated_at).getTime();
  return t(ua === ub ? 0 : ua < ub ? -1 : 1);
}

function SortTh({
  label,
  columnKey,
  sortColumn,
  sortPhase,
  onSort,
}: {
  label: string;
  columnKey: string;
  sortColumn: string | null;
  sortPhase: SortPhase;
  onSort: (k: any) => void;
}) {
  const on = sortColumn === columnKey;
  const arrow = !on || sortPhase === "natural" ? "" : sortPhase === "asc" ? " ↑" : " ↓";
  return (
    <th className={`${dsTableThSticky} px-2 py-2 text-left text-xs font-semibold uppercase text-[color:var(--cab-text-muted)]`}>
      <button type="button" className={`inline-flex items-center gap-1 ${erpFocus}`} onClick={() => onSort(columnKey)}>
        {label}
        <span className="tabular-nums text-[10px] font-bold text-zinc-400">{arrow}</span>
      </button>
    </th>
  );
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

  const updateLav = useLavorazioneUpdateMutation();
  const removeLav = useLavorazioneRemoveMutation();

  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<LavorazioneListRow | null>(null);
  const [closeRow, setCloseRow] = useState<LavorazioneListRow | null>(null);
  const [closeYmd, setCloseYmd] = useState(() => todayYmd());
  const [closeStato, setCloseStato] = useState<StatoLavorazione>("completata");

  const SEARCH_DEBOUNCE_MS = 320;

  const [searchInput, setSearchInput] = useState("");
  const [searchApplied, setSearchApplied] = useState("");
  const searchInputRef = useRef(searchInput);
  searchInputRef.current = searchInput;

  const [storicoSearchInput, setStoricoSearchInput] = useState("");
  const [storicoSearchApplied, setStoricoSearchApplied] = useState("");
  const storicoSearchInputRef = useRef(storicoSearchInput);
  storicoSearchInputRef.current = storicoSearchInput;

  useEffect(() => {
    const t = window.setTimeout(() => setSearchApplied(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const t = window.setTimeout(() => setStoricoSearchApplied(storicoSearchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [storicoSearchInput]);

  const flushAttiveSearch = useCallback(() => {
    setSearchApplied(searchInputRef.current.trim());
  }, []);

  const flushStoricoSearch = useCallback(() => {
    setStoricoSearchApplied(storicoSearchInputRef.current.trim());
  }, []);

  const [meseYyyyMm, setMeseYyyyMm] = useState("__tutti__");
  const [filtriAttiviEspansi, setFiltriAttiviEspansi] = useState(false);
  const [filtriStoricoEspansi, setFiltriStoricoEspansi] = useState(false);
  const [lavLogOpen, setLavLogOpen] = useState(false);

  const [filtroStatoAttive, setFiltroStatoAttive] = useState<string>("__tutti__");
  const [filtroPrioritaAttive, setFiltroPrioritaAttive] = useState<string>("__tutti__");
  const [filtroIngressoDa, setFiltroIngressoDa] = useState("");
  const [filtroIngressoA, setFiltroIngressoA] = useState("");

  const [filtroStatoArchivio, setFiltroStatoArchivio] = useState<string>("__tutti__");

  const [mezziSnap, setMezziSnap] = useState<MezzoGestito[]>(() => getMezziReportSnapshot());
  useEffect(() => subscribeMezziReportSync(() => setMezziSnap(getMezziReportSnapshot())), []);

  const [sortColA, setSortColA] = useState<SortKeyAtt | null>(null);
  const [sortPhaseA, setSortPhaseA] = useState<SortPhase>("natural");

  const [sortColC, setSortColC] = useState<SortKeyCh | null>(null);
  const [sortPhaseC, setSortPhaseC] = useState<SortPhase>("natural");

  const [hubOpenId, setHubOpenId] = useState<string | null>(null);
  const [flashRowId, setFlashRowId] = useState<string | null>(null);
  const flashClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [navMezzoFilter, setNavMezzoFilter] = useState<MezzoGestito | null>(null);
  const [navBulkFlashIds, setNavBulkFlashIds] = useState<Set<string>>(() => new Set());
  const navFlashClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const uscitaRange = useMemo((): Pick<LavorazioneFilters, "data_uscita_da" | "data_uscita_a"> => {
    if (meseYyyyMm === "__tutti__") return {};
    const [yStr, mStr] = meseYyyyMm.split("-");
    const y = Number(yStr);
    const m = Number(mStr);
    if (!Number.isFinite(y) || !Number.isFinite(m)) return {};
    const last = new Date(y, m, 0).getDate();
    const mm = String(m).padStart(2, "0");
    return {
      data_uscita_da: `${y}-${mm}-01`,
      data_uscita_a: `${y}-${mm}-${String(last).padStart(2, "0")}`,
    };
  }, [meseYyyyMm]);

  const mezzoFilterPart = useMemo((): Pick<LavorazioneFilters, "mezzo_id"> | Record<string, never> => {
    return navMezzoFilter?.id ? { mezzo_id: navMezzoFilter.id } : {};
  }, [navMezzoFilter?.id]);

  const filtersAttive = useMemo(
    (): LavorazioneFilters => ({
      includeMezzo: true,
      ...mezzoFilterPart,
      stati_in: [...LAVORAZIONI_STATI_IN_CORSO],
    }),
    [mezzoFilterPart],
  );

  const filtersChiuse = useMemo(
    (): LavorazioneFilters => ({
      includeMezzo: true,
      ...mezzoFilterPart,
      stati_in: [...LAVORAZIONI_STATI_CHIUSE],
      ...uscitaRange,
    }),
    [mezzoFilterPart, uscitaRange],
  );

  const attiveQuery = useLavorazioniList(filtersAttive, { staleTime: 30_000 });
  const chiuseQuery = useLavorazioniList(filtersChiuse, { staleTime: 30_000 });

  const lavModificheLogQuery = useServiceQuery(
    ["gestionale", "lavorazioni", "pagina", "logModifiche"],
    () => logService.getAll({ entita: "lavorazioni", limit: 120 }),
    { staleTime: 45_000, retry: 1 },
  );

  const attiveRows = attiveQuery.data ?? [];
  const chiuseRows = chiuseQuery.data ?? [];

  const attiveRowsFiltered = useMemo(() => {
    return attiveRows.filter((row) => {
      if (!lavRowMatchesGlobalSearch(row, searchApplied)) return false;
      if (filtroStatoAttive !== "__tutti__" && row.stato !== filtroStatoAttive) return false;
      if (filtroPrioritaAttive !== "__tutti__" && row.priorita !== filtroPrioritaAttive) return false;
      if (filtroIngressoDa.trim() || filtroIngressoA.trim()) {
        if (!lavRowIngressoInRange(row, filtroIngressoDa, filtroIngressoA)) return false;
      }
      return true;
    });
  }, [attiveRows, searchApplied, filtroStatoAttive, filtroPrioritaAttive, filtroIngressoDa, filtroIngressoA]);

  const chiuseRowsFiltered = useMemo(() => {
    return chiuseRows.filter((row) => {
      if (!lavRowMatchesGlobalSearch(row, storicoSearchApplied)) return false;
      if (filtroStatoArchivio !== "__tutti__" && row.stato !== filtroStatoArchivio) return false;
      return true;
    });
  }, [chiuseRows, storicoSearchApplied, filtroStatoArchivio]);

  const mesiChiuse = useMemo(() => {
    const s = new Set<string>();
    for (const r of chiuseRows) {
      const du = r.data_uscita?.trim();
      if (du && du.length >= 7) s.add(du.slice(0, 7));
    }
    return [...s].sort((a, b) => b.localeCompare(a, "it"));
  }, [chiuseRows]);

  const flashRow = useCallback((id: string) => {
    if (flashClearRef.current) clearTimeout(flashClearRef.current);
    setFlashRowId(id);
    flashClearRef.current = setTimeout(() => {
      setFlashRowId(null);
      flashClearRef.current = null;
    }, 1400);
  }, []);

  const createdBy = user?.id ?? null;

  useEffect(() => {
    if (!closeRow) return;
    setCloseYmd(todayYmd());
    setCloseStato("completata");
  }, [closeRow?.id]);

  const mutErr = updateLav.isError ? updateLav.error?.message : removeLav.isError ? removeLav.error?.message : null;
  const mutPending = updateLav.isPending || removeLav.isPending;

  const onStatoRow = useCallback(
    (row: LavorazioneListRow, next: string) => {
      const nuovo = next as StatoLavorazione;
      const data: LavorazioneUpdate = { stato: nuovo };
      if (LAVORAZIONI_STATI_CHIUSE.includes(nuovo)) {
        data.data_uscita = row.data_uscita?.trim() || ymdEndDayIso(todayYmd());
      } else {
        data.data_uscita = null;
      }
      updateLav.mutate(
        { id: row.id, data },
        {
          onSuccess: () => flashRow(row.id),
        },
      );
    },
    [updateLav, flashRow],
  );

  const onPrioritaRow = useCallback(
    (row: LavorazioneListRow, next: string) => {
      updateLav.mutate(
        { id: row.id, data: { priorita: next as PrioritaLavorazione } },
        { onSuccess: () => flashRow(row.id) },
      );
    },
    [updateLav, flashRow],
  );

  const onDeleteRow = useCallback(
    (row: LavorazioneListRow) => {
      const ok = window.confirm(
        `Eliminare definitivamente la lavorazione «${macchinaLabel(row)}»? L’operazione non è annullabile.`,
      );
      if (!ok) return;
      removeLav.mutate(row.id, {
        onSuccess: () => {
          setHubOpenId((cur) => (cur === row.id ? null : cur));
        },
      });
    },
    [removeLav],
  );

  function submitCloseLavorazione() {
    if (!closeRow) return;
    updateLav.mutate(
      { id: closeRow.id, data: { stato: closeStato, data_uscita: ymdEndDayIso(closeYmd) } },
      {
        onSuccess: () => {
          flashRow(closeRow.id);
          setCloseRow(null);
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
    const id = searchParams.get(Q_FOCUS_LAV_ROW)?.trim();
    if (!id) return;
    const t = window.setTimeout(() => {
      setHubOpenId(id);
      flashRow(id);
      router.replace(pathname, { scroll: false });
    }, 80);
    return () => window.clearTimeout(t);
  }, [searchParams, pathname, router, flashRow]);

  useEffect(() => {
    const rawFocus = searchParams.get(Q_FOCUS_MEZZO)?.trim();
    if (rawFocus?.startsWith("hub-lav-")) {
      const t = window.setTimeout(() => {
        const lavId = rawFocus.slice("hub-lav-".length);
        setHubOpenId(lavId);
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
      const mezzi = getMezziReportSnapshot();
      const mezzo = mezzi.find((m) => m.id === rawMezzo);
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
  }, [searchParams, pathname, router, flashRow, attiveRows, chiuseRows]);

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
      const p = cmpAtt(a, b, sortColA, sortPhaseA);
      if (p !== 0) return p;
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      if (tb !== ta) return tb - ta;
      return b.id.localeCompare(a.id);
    });
    return rows;
  }, [attiveRowsFiltered, sortColA, sortPhaseA]);

  const sortedChiuse = useMemo(() => {
    const rows = [...chiuseRowsFiltered];
    rows.sort((a, b) => {
      if (sortPhaseC === "natural" || sortColC === null) {
        const ta = new Date(a.data_uscita ?? a.updated_at).getTime();
        const tb = new Date(b.data_uscita ?? b.updated_at).getTime();
        if (tb !== ta) return tb - ta;
        return b.id.localeCompare(a.id);
      }
      const p = cmpCh(a, b, sortColC, sortPhaseC);
      if (p !== 0) return p;
      const ta = new Date(a.data_uscita ?? a.updated_at).getTime();
      const tb = new Date(b.data_uscita ?? b.updated_at).getTime();
      if (tb !== ta) return tb - ta;
      return b.id.localeCompare(a.id);
    });
    return rows;
  }, [chiuseRowsFiltered, sortColC, sortPhaseC]);

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
  }, [
    filtersAttive,
    attiveRowsFiltered.length,
    searchApplied,
    filtroStatoAttive,
    filtroPrioritaAttive,
    filtroIngressoDa,
    filtroIngressoA,
    listPageSize,
    resetPageA,
  ]);
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
  }, [filtersChiuse, chiuseRowsFiltered.length, storicoSearchApplied, filtroStatoArchivio, listPageSize, resetPageC]);
  const pagedChiuse = useMemo(() => sliceC(sortedChiuse), [sortedChiuse, sliceC, pageC]);

  function resetStoricoFilters() {
    setStoricoSearchInput("");
    setStoricoSearchApplied("");
    setMeseYyyyMm("__tutti__");
    setFiltroStatoArchivio("__tutti__");
    setFiltriStoricoEspansi(false);
  }

  function resetRicercaAttive() {
    setSearchInput("");
    setSearchApplied("");
  }

  function resetFiltriAttive() {
    setFiltroStatoAttive("__tutti__");
    setFiltroPrioritaAttive("__tutti__");
    setFiltroIngressoDa("");
    setFiltroIngressoA("");
    setNavMezzoFilter(null);
    setFiltriAttiviEspansi(false);
    resetRicercaAttive();
  }

  type LavLogPanelItem =
    | { kind: "real"; id: string; row: LogModificaRow }
    | { kind: "mock"; id: string; row: (typeof LAVORAZIONI_MOCK_MODIFICHE_ENTRIES)[number] };

  const logPanelItems = useMemo((): LavLogPanelItem[] => {
    const real = lavModificheLogQuery.data ?? [];
    if (real.length > 0) {
      return real.map((row) => ({ kind: "real", id: row.id, row }));
    }
    if (LAVORAZIONI_MOCK_MODIFICHE_FLAG) {
      return LAVORAZIONI_MOCK_MODIFICHE_ENTRIES.map((row) => ({ kind: "mock", id: row.id, row }));
    }
    return [];
  }, [lavModificheLogQuery.data]);

  const logVmList = useMemo((): GestionaleLogViewModel[] => {
    return logPanelItems.map((item) => {
      if (item.kind === "mock") return mockLavLogToGestionaleVm(item.row);
      return logModificaRowToGestionaleVm(item.row, logAutoreLabel(item.row, user?.id ?? null, authorName));
    });
  }, [logPanelItems, user?.id, authorName]);

  const hasAttiveClientFilters =
    searchApplied.trim().length > 0 ||
    filtroStatoAttive !== "__tutti__" ||
    filtroPrioritaAttive !== "__tutti__" ||
    Boolean(filtroIngressoDa.trim()) ||
    Boolean(filtroIngressoA.trim());

  const hasStoricoClientFilters =
    storicoSearchApplied.trim().length > 0 || filtroStatoArchivio !== "__tutti__" || meseYyyyMm !== "__tutti__";

  const loading = attiveQuery.isLoading || chiuseQuery.isLoading;
  const loadErr = attiveQuery.isError ? attiveQuery.error?.message : chiuseQuery.isError ? chiuseQuery.error?.message : null;

  return (
    <>
      <PageHeader
        title="Lavorazioni"
        actions={
          <div className="flex min-w-0 shrink-0 flex-nowrap items-center justify-end gap-2 overflow-x-auto pb-0.5">
            <button
              type="button"
              onClick={() => setLavLogOpen(true)}
              className={`${dsPageToolbarBtn} shrink-0 px-2.5 sm:px-3`}
              title="Storico modifiche lavorazioni"
            >
              <IconGestionaleLog />
              <span className="sr-only">Log modifiche</span>
            </button>
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

        <ShellCard title="Lavorazioni in corso">
          <div className={`${dsStickyToolbar} -mx-1`}>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className={`${erpBtnNuovaLavorazione} h-11 shrink-0`}
                  disabled={mutPending || !createdBy}
                  title={!createdBy ? "Accedi per creare una lavorazione." : undefined}
                >
                  + Nuova lavorazione
                </button>
                <GestionaleSearchField
                  id="lavorazioni-search-attive"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      flushAttiveSearch();
                    }
                  }}
                  placeholder={GESTIONALE_SEARCH_PLACEHOLDER}
                  aria-label="Cerca tra lavorazioni in corso"
                  wrapperClassName="flex-1 sm:min-w-[12rem]"
                />
                <button
                  type="button"
                  onClick={() => setFiltriAttiviEspansi((o) => !o)}
                  className={`${dsPageToolbarBtn} relative h-11 min-w-[8.25rem] shrink-0 gap-2 px-3 text-sm sm:ml-auto`}
                  aria-expanded={filtriAttiviEspansi}
                >
                  Filtri
                  <svg
                    className={`h-4 w-4 shrink-0 text-[color:var(--cab-primary)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${filtriAttiviEspansi ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                  {hasAttiveClientFilters || navMezzoFilter ? (
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
                  {mutPending ? <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Salvataggio in corso…</span> : null}
                  {!createdBy ? (
                    <span className="text-xs text-amber-800 dark:text-amber-200">Accedi per registrare nuove lavorazioni.</span>
                  ) : null}
                  <span className="inline-flex items-baseline gap-1 rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-border-strong)_85%,var(--cab-border))] bg-[var(--cab-surface)] px-2.5 py-1 text-xs text-[color:var(--cab-text-muted)] shadow-[var(--cab-shadow-sm)]">
                    <span className="tabular-nums text-sm font-semibold text-[color:var(--cab-text)]">{sortedAttive.length}</span>
                    <span>risultat{sortedAttive.length === 1 ? "o" : "i"}</span>
                  </span>
                  {hasAttiveClientFilters || navMezzoFilter ? (
                    <span className="rounded-md bg-[color:color-mix(in_srgb,var(--cab-primary)_14%,var(--cab-surface))] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text)] ring-1 ring-[color:color-mix(in_srgb,var(--cab-primary)_35%,var(--cab-border))]">
                      Filtri attivi
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <button type="button" className={dsPageToolbarBtn} onClick={resetRicercaAttive}>
                    Pulisci ricerca
                  </button>
                  <button type="button" className={dsPageToolbarBtn} onClick={resetFiltriAttive}>
                    Reimposta filtri
                  </button>
                </div>
              </div>
            </div>

            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                filtriAttiviEspansi ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="border-t border-[color:var(--cab-border)] pt-3" aria-label="Filtri lavorazioni in corso">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    <label className="flex min-w-0 flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                      Mezzo
                      <FilterSelectWrap>
                        <select
                          className={gestionaleSelectFilterClass}
                          value={navMezzoFilter?.id ?? "__tutti__"}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === "__tutti__") setNavMezzoFilter(null);
                            else {
                              const hit = mezziSnap.find((m) => m.id === v);
                              if (hit) setNavMezzoFilter(hit);
                            }
                          }}
                          aria-label="Filtra per mezzo"
                        >
                          <option value="__tutti__">Tutti i mezzi</option>
                          {navMezzoFilter?.id && !mezziSnap.some((m) => m.id === navMezzoFilter.id) ? (
                            <option value={navMezzoFilter.id}>
                              {navMezzoFilterBadgeLabel(navMezzoFilter)} (da collegamento)
                            </option>
                          ) : null}
                          {mezziSnap.map((m) => (
                            <option key={m.id} value={m.id}>
                              {navMezzoFilterBadgeLabel(m)} — {m.marca} {m.modello}
                            </option>
                          ))}
                        </select>
                      </FilterSelectWrap>
                    </label>
                    <label className="flex min-w-0 flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                      Stato
                      <FilterSelectWrap>
                        <select
                          className={selectLavorazioniFilter}
                          value={filtroStatoAttive}
                          onChange={(e) => setFiltroStatoAttive(e.target.value)}
                          aria-label="Filtra per stato"
                        >
                          <option value="__tutti__">Tutti gli stati</option>
                          {LAVORAZIONI_STATI_IN_CORSO.map((s) => (
                            <option key={s} value={s}>
                              {labelLavorazioneStatoDb(s)}
                            </option>
                          ))}
                        </select>
                      </FilterSelectWrap>
                    </label>
                    <label className="flex min-w-0 flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                      Priorità
                      <FilterSelectWrap>
                        <select
                          className={selectLavorazioniFilter}
                          value={filtroPrioritaAttive}
                          onChange={(e) => setFiltroPrioritaAttive(e.target.value)}
                          aria-label="Filtra per priorità"
                        >
                          <option value="__tutti__">Tutte</option>
                          {PRIORITA_OPTS.map((p) => (
                            <option key={p} value={p}>
                              {prioritaLabel(p)}
                            </option>
                          ))}
                        </select>
                      </FilterSelectWrap>
                    </label>
                    <label className="flex min-w-0 flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                      Ingresso da
                      <input
                        type="date"
                        className={dsInput}
                        value={filtroIngressoDa}
                        onChange={(e) => setFiltroIngressoDa(e.target.value)}
                        aria-label="Data ingresso da"
                      />
                    </label>
                    <label className="flex min-w-0 flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                      Ingresso a
                      <input
                        type="date"
                        className={dsInput}
                        value={filtroIngressoA}
                        onChange={(e) => setFiltroIngressoA(e.target.value)}
                        aria-label="Data ingresso a"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {loading ? <p className="text-sm text-zinc-500">Caricamento…</p> : null}

          <div className={`lavorazioni-scroll-scope ${dsTableWrap} ${dsScrollbar} hidden max-w-full overflow-x-hidden md:block`}>
            <table className={`${dsTable} w-full min-w-0 table-fixed`}>
              <colgroup>
                <col className="w-[17%]" />
                <col className="w-[13%]" />
                <col className="w-[19%]" />
                <col className="w-[12%]" />
                <col className="w-[11%]" />
                <col className="w-[9%]" />
                <col className="w-[19%]" />
              </colgroup>
              <thead className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
                <tr>
                  <SortTh
                    label="Macchina"
                    columnKey="macchina"
                    sortColumn={sortColA}
                    sortPhase={sortPhaseA}
                    onSort={(k) => cycleSort(sortColA, setSortColA, setSortPhaseA, k as SortKeyAtt)}
                  />
                  <SortTh
                    label="Cliente"
                    columnKey="cliente"
                    sortColumn={sortColA}
                    sortPhase={sortPhaseA}
                    onSort={(k) => cycleSort(sortColA, setSortColA, setSortPhaseA, k as SortKeyAtt)}
                  />
                  <SortTh
                    label="Note"
                    columnKey="note"
                    sortColumn={sortColA}
                    sortPhase={sortPhaseA}
                    onSort={(k) => cycleSort(sortColA, setSortColA, setSortPhaseA, k as SortKeyAtt)}
                  />
                  <SortTh
                    label="Stato"
                    columnKey="stato"
                    sortColumn={sortColA}
                    sortPhase={sortPhaseA}
                    onSort={(k) => cycleSort(sortColA, setSortColA, setSortPhaseA, k as SortKeyAtt)}
                  />
                  <SortTh
                    label="Priorità"
                    columnKey="priorita"
                    sortColumn={sortColA}
                    sortPhase={sortPhaseA}
                    onSort={(k) => cycleSort(sortColA, setSortColA, setSortPhaseA, k as SortKeyAtt)}
                  />
                  <SortTh
                    label="Ingresso"
                    columnKey="ingresso"
                    sortColumn={sortColA}
                    sortPhase={sortPhaseA}
                    onSort={(k) => cycleSort(sortColA, setSortColA, setSortPhaseA, k as SortKeyAtt)}
                  />
                  <th className={`${dsTableThSticky} px-2 py-2 text-right text-xs font-semibold uppercase text-[color:var(--cab-text-muted)]`}>
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagedAttive.length === 0 ? (
                  <tr className={dsTableRow}>
                    <td colSpan={7} className="px-3 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                      {hasAttiveClientFilters
                        ? "Nessuna lavorazione corrisponde alla ricerca o ai filtri selezionati."
                        : navMezzoFilter
                          ? "Nessuna lavorazione in corso per il mezzo filtrato."
                          : "Nessuna lavorazione in corso."}
                    </td>
                  </tr>
                ) : (
                  pagedAttive.map((row) => {
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
                        <td className="min-w-0 px-2 align-middle">
                          <div className="truncate text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100">{macchinaLabel(row)}</div>
                          <div className="truncate text-[11px] leading-tight text-zinc-500 dark:text-zinc-400">{mezzoIdent(row)}</div>
                        </td>
                        <td className="min-w-0 px-2 align-middle text-sm text-zinc-800 dark:text-zinc-100">
                          <span className="line-clamp-2 break-words">{clienteLabel(row)}</span>
                        </td>
                        <td className="min-w-0 px-2 align-middle text-sm text-zinc-600 dark:text-zinc-300">
                          <span className="line-clamp-2">{(row.note ?? "").trim() || "—"}</span>
                        </td>
                        <td className="px-2 align-middle text-sm">
                          <InlineSelectField
                            shellClass={statoPillShellClass()}
                            shellStyle={readablePillStyleFromHex(statoThemeColor(row.stato))}
                            value={row.stato}
                            onChange={(v) => onStatoRow(row, v)}
                            ariaLabel={`Stato — ${macchinaLabel(row)}`}
                            disabled={mutPending || loading}
                            title={labelLavorazioneStatoDb(row.stato)}
                          >
                            {STATI_RAPIDI.map((s) => (
                              <option key={s} value={s}>
                                {labelLavorazioneStatoDb(s)}
                              </option>
                            ))}
                          </InlineSelectField>
                        </td>
                        <td className="px-2 align-middle text-sm">
                          <InlineSelectField
                            shellClass={prioritaPillShellClass()}
                            shellStyle={readablePillStyleFromHex(prioHex(row.priorita))}
                            value={row.priorita}
                            onChange={(v) => onPrioritaRow(row, v)}
                            ariaLabel={`Priorità — ${macchinaLabel(row)}`}
                            disabled={mutPending || loading}
                            title={prioritaLabel(row.priorita)}
                          >
                            {PRIORITA_OPTS.map((p) => (
                              <option key={p} value={p}>
                                {prioritaLabel(p)}
                              </option>
                            ))}
                          </InlineSelectField>
                        </td>
                        <td className="whitespace-nowrap px-2 align-middle text-xs tabular-nums text-zinc-700 dark:text-zinc-300">
                          {fmtDay(row.data_ingresso ?? row.created_at)}
                        </td>
                        <td className={dsTableTdActions}>
                          <div className={dsTableActionsGroup}>
                            <button
                              type="button"
                              className={dsTableActionTextBtnPrimary}
                              title="Modifica note e data ingresso"
                              disabled={mutPending || loading}
                              onClick={() => setEditRow(row)}
                            >
                              Modifica
                            </button>
                            <button
                              type="button"
                              className={dsTableActionTextBtn}
                              title="Chiudi con data uscita"
                              disabled={mutPending || loading}
                              onClick={() => setCloseRow(row)}
                            >
                              Chiudi
                            </button>
                            {canDeleteLavorazioneBozza(row) ? (
                              <button
                                type="button"
                                className={dsTableActionTextBtnDanger}
                                title="Elimina bozza"
                                disabled={mutPending || loading}
                                onClick={() => onDeleteRow(row)}
                              >
                                Elimina
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className={dsTableActionTextBtnPrimary}
                              title="Apri hub lavorazione"
                              disabled={mutPending}
                              onClick={() => setHubOpenId(row.id)}
                            >
                              Hub
                            </button>
                            <Link
                              href={buildPreventiviArchivioFilterHref(row.id, "attiva")}
                              className={`${dsTableActionTextBtn} no-underline`}
                              title="Preventivi"
                            >
                              Prev.
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 space-y-3 md:hidden">
            {pagedAttive.length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                {hasAttiveClientFilters
                  ? "Nessuna lavorazione corrisponde alla ricerca o ai filtri selezionati."
                  : navMezzoFilter
                    ? "Nessuna lavorazione in corso per il mezzo filtrato."
                    : "Nessuna lavorazione in corso."}
              </p>
            ) : (
              pagedAttive.map((row) => (
                <div key={row.id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/90">
                  <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{macchinaLabel(row)}</p>
                  <p className="text-xs text-zinc-500">{mezzoIdent(row)}</p>
                  <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-200">{clienteLabel(row)}</p>
                  <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{(row.note ?? "").trim() || "—"}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Stato</span>
                    <InlineSelectField
                      shellClass={statoPillShellClass()}
                      shellStyle={readablePillStyleFromHex(statoThemeColor(row.stato))}
                      value={row.stato}
                      onChange={(v) => onStatoRow(row, v)}
                      ariaLabel={`Stato — ${macchinaLabel(row)}`}
                      disabled={mutPending || loading}
                    >
                      {STATI_RAPIDI.map((s) => (
                        <option key={s} value={s}>
                          {labelLavorazioneStatoDb(s)}
                        </option>
                      ))}
                    </InlineSelectField>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Priorità</span>
                    <InlineSelectField
                      shellClass={prioritaPillShellClass()}
                      shellStyle={readablePillStyleFromHex(prioHex(row.priorita))}
                      value={row.priorita}
                      onChange={(v) => onPrioritaRow(row, v)}
                      ariaLabel={`Priorità — ${macchinaLabel(row)}`}
                      disabled={mutPending || loading}
                    >
                      {PRIORITA_OPTS.map((p) => (
                        <option key={p} value={p}>
                          {prioritaLabel(p)}
                        </option>
                      ))}
                    </InlineSelectField>
                  </div>
                  <p className="mt-2 text-xs tabular-nums text-zinc-500">
                    Ingresso: {fmtDay(row.data_ingresso ?? row.created_at)}
                  </p>
                  <div className={`mt-3 w-full min-w-0 ${dsTableActionsGroupStart}`}>
                    <button type="button" className={dsTableActionTextBtnPrimary} disabled={mutPending || loading} onClick={() => setEditRow(row)}>
                      Modifica
                    </button>
                    <button type="button" className={dsTableActionTextBtn} disabled={mutPending || loading} onClick={() => setCloseRow(row)}>
                      Chiudi
                    </button>
                    {canDeleteLavorazioneBozza(row) ? (
                      <button
                        type="button"
                        className={dsTableActionTextBtnDanger}
                        disabled={mutPending || loading}
                        onClick={() => onDeleteRow(row)}
                      >
                        Elimina
                      </button>
                    ) : null}
                    <button type="button" className={dsTableActionTextBtnPrimary} disabled={mutPending} onClick={() => setHubOpenId(row.id)}>
                      Hub
                    </button>
                    <Link href={buildPreventiviArchivioFilterHref(row.id, "attiva")} className={`${dsTableActionTextBtn} no-underline`}>
                      Preventivi
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>

          {showPagerA ? <TablePagination page={pageA} pageCount={pageCountA} onPageChange={setPageA} label={labelA} /> : null}
        </ShellCard>

        <ShellCard title="Archivio lavorazioni">
          <div className={`${dsStickyToolbar} -mx-1`}>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className={`${erpBtnNuovaLavorazione} h-11 shrink-0`}
                  disabled={mutPending || !createdBy}
                  title={!createdBy ? "Accedi per creare una lavorazione." : undefined}
                >
                  + Nuova lavorazione
                </button>
                <GestionaleSearchField
                  id="lavorazioni-storico-search"
                  value={storicoSearchInput}
                  onChange={(e) => setStoricoSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      flushStoricoSearch();
                    }
                  }}
                  placeholder={GESTIONALE_SEARCH_PLACEHOLDER}
                  aria-label="Cerca in archivio lavorazioni"
                  wrapperClassName="flex-1 sm:min-w-[12rem]"
                />
                <button
                  type="button"
                  onClick={() => setFiltriStoricoEspansi((o) => !o)}
                  className={`${dsPageToolbarBtn} relative h-11 min-w-[8.25rem] shrink-0 gap-2 px-3 text-sm sm:ml-auto`}
                  aria-expanded={filtriStoricoEspansi}
                >
                  Filtri
                  <svg
                    className={`h-4 w-4 shrink-0 text-[color:var(--cab-primary)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${filtriStoricoEspansi ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                  {hasStoricoClientFilters ? (
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
                    <span className="tabular-nums text-sm font-semibold text-[color:var(--cab-text)]">{sortedChiuse.length}</span>
                    <span>risultat{sortedChiuse.length === 1 ? "o" : "i"}</span>
                  </span>
                  {hasStoricoClientFilters ? (
                    <span className="rounded-md bg-[color:color-mix(in_srgb,var(--cab-primary)_14%,var(--cab-surface))] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text)] ring-1 ring-[color:color-mix(in_srgb,var(--cab-primary)_35%,var(--cab-border))]">
                      Filtri attivi
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <button
                    type="button"
                    className={dsPageToolbarBtn}
                    onClick={() => {
                      setStoricoSearchInput("");
                      setStoricoSearchApplied("");
                    }}
                  >
                    Pulisci ricerca
                  </button>
                  <button type="button" className={dsPageToolbarBtn} onClick={resetStoricoFilters}>
                    Reimposta filtri
                  </button>
                </div>
              </div>
            </div>

            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                filtriStoricoEspansi ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="border-t border-[color:var(--cab-border)] pt-3" aria-label="Filtri archivio lavorazioni">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <label className="flex min-w-0 flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                      Stato archivio
                      <FilterSelectWrap>
                        <select
                          className={selectLavorazioniFilter}
                          value={filtroStatoArchivio}
                          onChange={(e) => setFiltroStatoArchivio(e.target.value)}
                          aria-label="Filtra archivio per stato"
                        >
                          <option value="__tutti__">Tutti gli stati</option>
                          {LAVORAZIONI_STATI_CHIUSE.map((s) => (
                            <option key={s} value={s}>
                              {labelLavorazioneStatoDb(s)}
                            </option>
                          ))}
                        </select>
                      </FilterSelectWrap>
                    </label>
                    <label className="flex min-w-0 flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                      Mese uscita
                      <FilterSelectWrap>
                        <select className={selectLavorazioniFilter} value={meseYyyyMm} onChange={(e) => setMeseYyyyMm(e.target.value)}>
                          <option value="__tutti__">Tutti</option>
                          {mesiChiuse.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </FilterSelectWrap>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={`lavorazioni-scroll-scope ${dsTableWrap} ${dsScrollbar} hidden max-w-full overflow-x-hidden md:block`}>
            <table className={`${dsTable} w-full min-w-0 table-fixed`}>
              <colgroup>
                <col className="w-[18%]" />
                <col className="w-[16%]" />
                <col className="w-[22%]" />
                <col className="w-[8.5rem]" />
                <col className="w-[8.5rem]" />
                <col className="w-[6.5rem]" />
                <col className="w-[11rem]" />
              </colgroup>
              <thead className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
                <tr>
                  <SortTh
                    label="Macchina"
                    columnKey="macchina"
                    sortColumn={sortColC}
                    sortPhase={sortPhaseC}
                    onSort={(k) => cycleSort(sortColC, setSortColC, setSortPhaseC, k as SortKeyCh)}
                  />
                  <SortTh
                    label="Ident. mezzo"
                    columnKey="mezzoIdent"
                    sortColumn={sortColC}
                    sortPhase={sortPhaseC}
                    onSort={(k) => cycleSort(sortColC, setSortColC, setSortPhaseC, k as SortKeyCh)}
                  />
                  <SortTh
                    label="Cliente"
                    columnKey="cliente"
                    sortColumn={sortColC}
                    sortPhase={sortPhaseC}
                    onSort={(k) => cycleSort(sortColC, setSortColC, setSortPhaseC, k as SortKeyCh)}
                  />
                  <SortTh
                    label="Ingresso"
                    columnKey="ingresso"
                    sortColumn={sortColC}
                    sortPhase={sortPhaseC}
                    onSort={(k) => cycleSort(sortColC, setSortColC, setSortPhaseC, k as SortKeyCh)}
                  />
                  <SortTh
                    label="Uscita"
                    columnKey="uscita"
                    sortColumn={sortColC}
                    sortPhase={sortPhaseC}
                    onSort={(k) => cycleSort(sortColC, setSortColC, setSortPhaseC, k as SortKeyCh)}
                  />
                  <SortTh
                    label="Ore"
                    columnKey="oreTotali"
                    sortColumn={sortColC}
                    sortPhase={sortPhaseC}
                    onSort={(k) => cycleSort(sortColC, setSortColC, setSortPhaseC, k as SortKeyCh)}
                  />
                  <th className={`${dsTableThSticky} px-2 py-2 text-right text-xs font-semibold uppercase text-[color:var(--cab-text-muted)]`}>
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagedChiuse.length === 0 ? (
                  <tr className={dsTableRow}>
                    <td colSpan={7} className="px-3 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                      {hasStoricoClientFilters
                        ? "Nessun record corrisponde alla ricerca o allo stato selezionato (nel periodo scelto)."
                        : "Nessun record in archivio con i filtri correnti."}
                    </td>
                  </tr>
                ) : (
                  pagedChiuse.map((row) => {
                    const flash = flashRowId === row.id || navBulkFlashIds.has(row.id);
                    const orig = isStatoLavorazioneChiusoDb(row.stato) ? "storico" : "attiva";
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
                        <td className="min-w-0 px-2 align-middle text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100">
                          <span className="line-clamp-2 break-words">{macchinaLabel(row)}</span>
                        </td>
                        <td className="min-w-0 px-2 align-middle text-[11px] leading-tight text-zinc-600 dark:text-zinc-300">
                          <span className="line-clamp-2 break-all">{mezzoIdent(row)}</span>
                        </td>
                        <td className="min-w-0 px-2 align-middle text-sm text-zinc-800 dark:text-zinc-100">
                          <span className="line-clamp-2 break-words">{clienteLabel(row)}</span>
                        </td>
                        <td className="whitespace-nowrap px-2 align-middle text-xs tabular-nums text-zinc-700 dark:text-zinc-300">
                          {fmtDayCompact(row.data_ingresso ?? row.created_at)}
                        </td>
                        <td className="whitespace-nowrap px-2 align-middle text-xs tabular-nums text-zinc-700 dark:text-zinc-300">
                          {fmtDayCompact(row.data_uscita)}
                        </td>
                        <td className="whitespace-nowrap px-2 align-middle text-xs tabular-nums text-zinc-700 dark:text-zinc-300">
                          {fmtOreTotaliCell(row)}
                        </td>
                        <td className={dsTableTdActions}>
                          <div className={dsTableActionsGroup}>
                            <button type="button" className={dsTableActionTextBtnPrimary} onClick={() => setHubOpenId(row.id)}>
                              Hub
                            </button>
                            <Link href={buildPreventiviArchivioFilterHref(row.id, orig)} className={`${dsTableActionTextBtn} no-underline`}>
                              Prev.
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 space-y-3 md:hidden">
            {pagedChiuse.length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                {hasStoricoClientFilters
                  ? "Nessun record corrisponde alla ricerca o allo stato selezionato (nel periodo scelto)."
                  : "Nessun record in archivio con i filtri correnti."}
              </p>
            ) : (
              pagedChiuse.map((row) => {
              const orig = isStatoLavorazioneChiusoDb(row.stato) ? "storico" : "attiva";
              return (
                <div key={row.id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/90">
                  <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{macchinaLabel(row)}</p>
                  <p className="text-xs text-zinc-500">{mezzoIdent(row)}</p>
                  <p className="mt-2 text-sm">{clienteLabel(row)}</p>
                  <p className="mt-1 text-xs tabular-nums text-zinc-500">
                    {fmtDay(row.data_ingresso ?? row.created_at)} → {fmtDay(row.data_uscita)}
                  </p>
                  <div className={`mt-3 w-full min-w-0 ${dsTableActionsGroupStart}`}>
                    <button type="button" className={dsTableActionTextBtnPrimary} onClick={() => setHubOpenId(row.id)}>
                      Hub
                    </button>
                    <Link href={buildPreventiviArchivioFilterHref(row.id, orig)} className={`${dsTableActionTextBtn} no-underline`}>
                      Preventivi
                    </Link>
                  </div>
                </div>
              );
            })
            )}
          </div>

          {showPagerC ? <TablePagination page={pageC} pageCount={pageCountC} onPageChange={setPageC} label={labelC} /> : null}
        </ShellCard>

      </div>

      {lavLogOpen ? (
        <div
          className="fixed inset-0 z-[55] flex items-stretch justify-end bg-black/30"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
              setLavLogOpen(false);
            }
          }}
        >
          <aside
            className={gestionaleLogPanelAsideClass}
            aria-label="Log modifiche lavorazioni"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className={gestionaleLogPanelHeaderClass}>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Log modifiche lavorazioni</h2>
              <button type="button" onClick={() => setLavLogOpen(false)} className={dsBtnNeutral}>
                Chiudi
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                <IconGestionaleLog className="h-4 w-4 shrink-0" aria-hidden />
                {lavModificheLogQuery.isError ? (
                  <span className="font-medium text-amber-800 dark:text-amber-200">
                    Impossibile caricare il log dal server: mostra dati dimostrativi isolati (nessuna scrittura su DB).
                  </span>
                ) : null}
                {logPanelItems.length > 0 && logPanelItems[0].kind === "mock" ? (
                  <span className="rounded-md border border-dashed border-amber-300/80 bg-amber-50/90 px-2 py-0.5 font-semibold text-amber-950 dark:border-amber-700/55 dark:bg-amber-950/35 dark:text-amber-100">
                    Dati dimostrativi (mock frontend, isMockData)
                  </span>
                ) : null}
              </div>
              <div className={`${gestionaleLogScrollEmbeddedClass} min-h-0 flex-1`}>
                {lavModificheLogQuery.isLoading ? (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Caricamento log…</p>
                ) : logVmList.length === 0 ? (
                  <GestionaleLogEmpty message="Nessuna voce di log da mostrare." />
                ) : (
                  <GestionaleLogList>
                    {logPanelItems.map((item, i) => (
                      <li key={item.id} className="list-none">
                        <GestionaleLogEntryFourLines vm={logVmList[i]!} />
                      </li>
                    ))}
                  </GestionaleLogList>
                )}
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      {hubOpenId ? <LavorazioneDetailModal lavorazioneId={hubOpenId} onClose={() => setHubOpenId(null)} /> : null}

      <LavorazioneCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        createdBy={createdBy}
        onCreated={(id) => {
          flashRow(id);
          setHubOpenId(id);
        }}
      />

      {editRow ? <LavorazioneEditModal row={editRow} onClose={() => setEditRow(null)} /> : null}

      {closeRow ? (
        <LavorazioniModalShell onRequestClose={() => { if (!mutPending) setCloseRow(null); }}>
          <div className="flex max-h-[min(88dvh,480px)] flex-col overflow-hidden">
            <header className="shrink-0 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Chiudi lavorazione</h2>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                {macchinaLabel(closeRow)} — imposta data uscita e stato archivio.
              </p>
            </header>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              <label className="block">
                <span className={dsLabel}>Data uscita</span>
                <input
                  type="date"
                  className={`${dsInput} mt-1 w-full`}
                  value={closeYmd}
                  onChange={(e) => setCloseYmd(e.target.value)}
                  disabled={mutPending}
                />
              </label>
              <label className="block">
                <span className={dsLabel}>Stato finale</span>
                <select
                  className={`${dsInput} mt-1 w-full capitalize`}
                  value={closeStato}
                  onChange={(e) => setCloseStato(e.target.value as StatoLavorazione)}
                  disabled={mutPending}
                >
                  {LAVORAZIONI_STATI_CHIUSE.map((s) => (
                    <option key={s} value={s}>
                      {labelLavorazioneStatoDb(s)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
              <button type="button" className={erpBtnNeutral} disabled={mutPending} onClick={() => setCloseRow(null)}>
                Annulla
              </button>
              <button type="button" className={erpBtnAccent} disabled={mutPending || !closeYmd.trim()} onClick={() => submitCloseLavorazione()}>
                {mutPending ? "Salvataggio…" : "Conferma chiusura"}
              </button>
            </footer>
          </div>
        </LavorazioniModalShell>
      ) : null}
    </>
  );
}
