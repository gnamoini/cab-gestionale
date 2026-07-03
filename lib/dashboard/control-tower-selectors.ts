import {
  buildLogModificaSummary,
  filterAuditMetadataModifiche,
  modificheToModificaRiga,
} from "@/lib/gestionale-log/log-summary";
import { reconcileLogModificaRows } from "@/lib/gestionale-log/log-event-pipeline";
import { isLogReverted } from "@/lib/gestionale-log/undo";
import type { GestionaleLogViewModel } from "@/lib/gestionale-log/view-model";
import { Q_FOCUS_LAV_ROW, Q_FOCUS_RICAMBIO } from "@/lib/navigation/dashboard-log-links";
import { lavorazioneLogOggettoFromListRow } from "@/lib/lavorazioni/lavorazione-log-oggetto";
import type { StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import { isLavorazioneInCorso } from "@/lib/lavorazioni/archived";
import { lavorazioneAddettoLabel } from "@/lib/lavorazioni/lavorazione-display-helpers";
import {
  lavorazioneClienteLabel,
  lavorazioneMacchinaLabel,
  lavorazioneMezzoIdentParts,
  lavorazioneOggettoLabel,
} from "@/lib/lavorazioni/lavorazioni-list-row-labels";
import {
  buildReportLavorazioniBundle,
  countCompletedInRange,
  countOpenedInRange,
} from "@/lib/report/lavorazioni-report-selectors";
import { splitLavorazioniListRowsForReport } from "@/lib/lavorazioni/lavorazioni-report-adapter";
import {
  countInterventiInRitardo,
  sottoScortaCount,
} from "@/lib/report/kpi-performance/kpi-performance-formulas";
import { filterEntriesForReportTimesheetKpi } from "@/lib/dipendenti/timesheet-report-kpi-filter";
import { computeMonthTotals } from "@/lib/dipendenti/timesheet-totals";
import type { DipendenteTimesheetEntryRow } from "@/lib/dipendenti/types";
import type { TipoAssenzaConfig } from "@/lib/dipendenti/tipi-assenza-model";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { buildRicambiConsumoRanking } from "@/lib/magazzino/ricambio-consumo-from-log";
import {
  CONTROL_TOWER_ACTIVITY_MAX,
  CONTROL_TOWER_CALENDAR_FORWARD_DAYS,
  CONTROL_TOWER_KPI_WINDOW_LABEL,
  CONTROL_TOWER_LATE_INGRESS_DAYS,
  CONTROL_TOWER_STALE_UPDATE_DAYS,
} from "@/lib/dashboard/control-tower-constants";
import {
  CONTROL_TOWER_TIME,
  getControlTowerCurrentWeekRange,
  getControlTowerPreviousWeekSameWindowRange,
} from "@/lib/dashboard/control-tower-time-ranges";
import {
  deltaPct,
  isoInRange,
  resolvePresetRange,
  ymdFromDate,
  type DateRange,
} from "@/lib/report/date-ranges";
import {
  computeDashboardMagSottoScortaRicambi,
  formatDashboardLavWidgetMezzoIdent,
  type DashboardMagMovementRow,
} from "@/lib/view/dashboard-widgets-selectors";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { InvoiceRow, LogModificaRow } from "@/src/types/supabase-tables";
import type { LavorazioneSchedeStore } from "@/types/schede";
import type { DashboardPromemoriaRow } from "@/lib/dashboard/dashboard-promemoria-types";

export type ControlTowerKpiMetric = {
  id: string;
  label: string;
  value: number;
  prevValue: number | null;
  deltaPct: number | null;
  deltaAbs: string | null;
  invert?: boolean;
  snapshot?: boolean;
  unit?: "count" | "hours";
};

export type ControlTowerKpiCluster = {
  id: "lavorazioni" | "ricambi" | "amministrazione" | "dipendenti";
  label: string;
  metrics: ControlTowerKpiMetric[];
};

export type ControlTowerHeaderKpiSlice = {
  windowLabel: typeof CONTROL_TOWER_KPI_WINDOW_LABEL;
  range: DateRange;
  clusters: ControlTowerKpiCluster[];
};

export type ControlTowerAlert = {
  id: string;
  severity: "critical" | "warning";
  title: string;
  detail?: string;
  href?: string;
  lavorazioneId?: string;
};

export type ControlTowerAlertsSlice = {
  items: ControlTowerAlert[];
};

export type ControlTowerWipRow = {
  id: string;
  stato: string;
  macchina: string;
  mezzoIdent: string | null;
  addetto: string | null;
  giorniSenzaUpdate: number;
  giorniDaIngresso: number;
};

export type ControlTowerWipStatoGroup = {
  stato: string;
  rows: ControlTowerWipRow[];
};

export type ControlTowerWipBucket = {
  id: "aperte" | "in_corso" | "bloccate" | "in_ritardo";
  label: string;
  severity: "normal" | "warning" | "critical";
  groups: ControlTowerWipStatoGroup[];
  total: number;
};

export type ControlTowerWipSlice = {
  buckets: ControlTowerWipBucket[];
};

export type ControlTowerAdminBacklogSlice = {
  fattureDaEmettere: number;
  fattureScadute: number;
};

export type ControlTowerMagConsumoRow = {
  id: string;
  label: string;
  totalUscite: number;
};

export type ControlTowerMagazzinoOpsSlice = {
  sottoScortaCount: number;
  sottoScortaPreview: ReturnType<typeof computeDashboardMagSottoScortaRicambi>;
  movimentiSettimana: number;
  topConsumo: ControlTowerMagConsumoRow[];
  anomalie: DashboardMagMovementRow[];
};

export type ControlTowerActivityItem = {
  id: string;
  domain: "lavorazioni" | "ricambi" | "amministrazione";
  at: string;
  vm: GestionaleLogViewModel;
  href: string | null;
};

export type ControlTowerActivityFeedSlice = {
  byDomain: {
    lavorazioni: ControlTowerActivityItem[];
    ricambi: ControlTowerActivityItem[];
    amministrazione: ControlTowerActivityItem[];
  };
};

export type ControlTowerCalendarItem = {
  id: string;
  ymd: string;
  title: string;
  kind: "appuntamento";
};

export type ControlTowerCalendarSlice = {
  items: ControlTowerCalendarItem[];
};

export type ControlTowerBaseInput = {
  anchor?: Date;
  lavRows: readonly LavorazioneListRow[];
  schedeStore?: LavorazioneSchedeStore;
  defaultAddetto?: string;
  ricambi: readonly RicambioMagazzino[];
  magLog?: readonly MagazzinoChangeLogEntry[];
  magMovements?: readonly DashboardMagMovementRow[];
  movimentiLogs?: readonly LogModificaRow[];
  preventivi?: readonly PreventivoRecord[];
  invoices?: readonly InvoiceRow[];
  logLavorazioni?: readonly LogModificaRow[];
  logMagazzino?: readonly LogModificaRow[];
  logMovimenti?: readonly LogModificaRow[];
  logAdmin?: readonly LogModificaRow[];
  promemoria?: readonly DashboardPromemoriaRow[];
  timesheetEntries?: readonly DipendenteTimesheetEntryRow[];
  tipiAssenza?: readonly TipoAssenzaConfig[];
  statiLavorazione?: readonly StatoLavorazioneConfig[];
};

function daysBetween(isoStart: string, end: Date): number {
  const t0 = new Date(isoStart).getTime();
  if (Number.isNaN(t0)) return 0;
  return Math.max(0, (end.getTime() - t0) / 86400000);
}

function lavUpdatedAt(row: LavorazioneListRow): string {
  return row.updated_at ?? row.created_at;
}

function lavIngressIso(row: LavorazioneListRow): string {
  return row.data_ingresso?.trim() || row.created_at;
}

function isActiveLavorazione(row: LavorazioneListRow): boolean {
  if (row.deleted_at) return false;
  return isLavorazioneInCorso(row);
}

function macchinaLabel(row: LavorazioneListRow, schedeStore?: LavorazioneSchedeStore): string {
  const label = lavorazioneMacchinaLabel(row, schedeStore);
  if (label !== "—") return label;
  const oggetto = lavorazioneOggettoLabel(row, schedeStore);
  return oggetto !== "—" ? oggetto : "—";
}

function mezzoIdent(row: LavorazioneListRow, schedeStore?: LavorazioneSchedeStore): string | null {
  const parts = lavorazioneMezzoIdentParts(row, schedeStore);
  const cliente = lavorazioneClienteLabel(row, schedeStore);
  return formatDashboardLavWidgetMezzoIdent({
    cliente: cliente !== "—" ? cliente : undefined,
    matricola: parts.matricola || undefined,
    nScuderia: parts.scuderia || undefined,
    targa: parts.targa || undefined,
  });
}

function toWipRow(
  row: LavorazioneListRow,
  anchor: Date,
  schedeStore: LavorazioneSchedeStore | undefined,
  defaultAddetto: string,
): ControlTowerWipRow {
  const addettoRaw = lavorazioneAddettoLabel(row, schedeStore, defaultAddetto);
  return {
    id: row.id,
    stato: row.stato,
    macchina: macchinaLabel(row, schedeStore),
    mezzoIdent: mezzoIdent(row, schedeStore),
    addetto: addettoRaw || null,
    giorniSenzaUpdate: Math.floor(daysBetween(lavUpdatedAt(row), anchor)),
    giorniDaIngresso: Math.floor(daysBetween(lavIngressIso(row), anchor)),
  };
}

function isStale(row: LavorazioneListRow, anchor: Date): boolean {
  return daysBetween(lavUpdatedAt(row), anchor) > CONTROL_TOWER_STALE_UPDATE_DAYS;
}

function isLateIngress(row: LavorazioneListRow, anchor: Date): boolean {
  return daysBetween(lavIngressIso(row), anchor) > CONTROL_TOWER_LATE_INGRESS_DAYS;
}

function metric(
  id: string,
  label: string,
  cur: number,
  prev: number | null,
  opts?: {
    invert?: boolean;
    snapshot?: boolean;
    unit?: "count" | "hours";
    formatDelta?: (n: number) => string;
  },
): ControlTowerKpiMetric {
  const value = opts?.unit === "hours" ? Math.round(cur * 10) / 10 : cur;
  const prevValue =
    opts?.snapshot || prev == null
      ? null
      : opts?.unit === "hours"
        ? Math.round(prev * 10) / 10
        : prev;
  const delta = prevValue != null ? value - prevValue : null;
  return {
    id,
    label,
    value,
    prevValue,
    deltaPct: prevValue != null && !opts?.snapshot ? deltaPct(prevValue, value) : null,
    deltaAbs:
      opts?.snapshot || delta == null
        ? null
        : opts?.formatDelta
          ? opts.formatDelta(delta)
          : `${delta >= 0 ? "+" : ""}${delta}`,
    invert: opts?.invert,
    snapshot: opts?.snapshot,
    unit: opts?.unit,
  };
}

function filterTimesheetEntriesInYmdRange(
  entries: readonly DipendenteTimesheetEntryRow[],
  range: DateRange,
): DipendenteTimesheetEntryRow[] {
  const from = ymdFromDate(range.start);
  const to = ymdFromDate(range.end);
  return entries.filter((e) => e.work_date >= from && e.work_date <= to);
}

function timesheetTotalsInRange(
  entries: readonly DipendenteTimesheetEntryRow[],
  range: DateRange,
  tipiAssenza?: readonly TipoAssenzaConfig[],
) {
  const inRange = filterTimesheetEntriesInYmdRange(entries, range);
  const filtered = filterEntriesForReportTimesheetKpi(inRange, tipiAssenza);
  return computeMonthTotals(filtered);
}

function countMovimentiInRange(logs: readonly LogModificaRow[] | undefined, range: DateRange): number {
  if (!logs?.length) return 0;
  let n = 0;
  for (const row of logs) {
    if (row.entita !== "movimenti_ricambi") continue;
    if (isoInRange(row.created_at, range)) n += 1;
  }
  return n;
}

function countMagLogMovementsInRange(
  magLog: readonly MagazzinoChangeLogEntry[] | undefined,
  range: DateRange,
): number {
  if (!magLog?.length) return 0;
  let n = 0;
  for (const e of magLog) {
    if (isoInRange(e.at, range)) n += 1;
  }
  return n;
}

function countPreventiviEmessiInRange(records: readonly PreventivoRecord[], range: DateRange): number {
  let n = 0;
  for (const p of records) {
    const at = p.dataCreazione || p.aggiornatoAt;
    if (p.stato === "bozza") continue;
    if (isoInRange(at, range)) n += 1;
  }
  return n;
}

function countInvoicesInRange(
  invoices: readonly InvoiceRow[],
  range: DateRange,
  mode: "emesse" | "pagate",
): number {
  let n = 0;
  for (const inv of invoices) {
    if (inv.status === "annullata") continue;
    if (mode === "emesse") {
      if (inv.status === "bozza" || inv.status === "da_verificare") continue;
      if (isoInRange(inv.data_emissione, range)) n += 1;
    } else if (inv.status === "pagata" && isoInRange(inv.updated_at, range)) {
      n += 1;
    }
  }
  return n;
}

function topConsumoFromMovimentiLogs(
  logs: readonly LogModificaRow[] | undefined,
  ricambiById: ReadonlyMap<string, RicambioMagazzino>,
  range: DateRange,
  limit: number,
): ControlTowerMagConsumoRow[] {
  if (!logs?.length) return [];
  const qtyByRic = new Map<string, number>();
  for (const row of logs) {
    if (row.entita !== "movimenti_ricambi") continue;
    if (!isoInRange(row.created_at, range)) continue;
    const payload = row.payload as Record<string, unknown> | null;
    const snap = (payload?.snapshot ?? payload?.after ?? payload) as Record<string, unknown> | null;
    const tipo = String(snap?.tipo ?? "");
    if (tipo !== "uscita") continue;
    const rid = String(snap?.ricambio_id ?? row.entita_id ?? "").trim();
    if (!rid) continue;
    const q = Math.max(1, Math.round(Number(snap?.quantita) || 1));
    qtyByRic.set(rid, (qtyByRic.get(rid) ?? 0) + q);
  }
  return [...qtyByRic.entries()]
    .map(([id, totalUscite]) => {
      const r = ricambiById.get(id);
      const label = r?.descrizione?.trim() || r?.codiceFornitoreOriginale || id;
      return { id, label, totalUscite };
    })
    .sort((a, b) => b.totalUscite - a.totalUscite)
    .slice(0, limit);
}

function groupWipByStato(rows: ControlTowerWipRow[]): ControlTowerWipStatoGroup[] {
  const map = new Map<string, ControlTowerWipRow[]>();
  for (const r of rows) {
    const list = map.get(r.stato) ?? [];
    list.push(r);
    map.set(r.stato, list);
  }
  return [...map.entries()]
    .map(([stato, groupRows]) => ({
      stato,
      rows: groupRows.sort((a, b) => b.giorniSenzaUpdate - a.giorniSenzaUpdate).slice(0, 5),
    }))
    .sort((a, b) => b.rows.length - a.rows.length);
}

function buildWipBucket(
  id: ControlTowerWipBucket["id"],
  label: string,
  severity: ControlTowerWipBucket["severity"],
  rows: ControlTowerWipRow[],
): ControlTowerWipBucket | null {
  if (rows.length === 0) return null;
  return {
    id,
    label,
    severity,
    groups: groupWipByStato(rows),
    total: rows.length,
  };
}

function classifyLavorazioneAlertIds(
  activeRows: readonly LavorazioneListRow[],
  anchor: Date,
  schedeStore: LavorazioneSchedeStore | undefined,
  defaultAddetto: string,
): Set<string> {
  const ids = new Set<string>();
  for (const row of activeRows) {
    if (isStale(row, anchor) || isLateIngress(row, anchor)) ids.add(row.id);
    else if (schedeStore && Object.keys(schedeStore).length > 0) {
      if (!lavorazioneAddettoLabel(row, schedeStore, defaultAddetto)) ids.add(row.id);
    }
  }
  return ids;
}

/** KPI header — settimana corrente (lun–oggi) vs settimana precedente equivalente. */
export function buildControlTowerHeaderKpiSlice(
  input: ControlTowerBaseInput & {
    includeLavorazioni?: boolean;
    includeMagazzino?: boolean;
    includeAdmin?: boolean;
    includeDipendenti?: boolean;
  },
): ControlTowerHeaderKpiSlice {
  const anchor = input.anchor ?? new Date();
  const range = getControlTowerCurrentWeekRange(anchor);
  const prevRange = getControlTowerPreviousWeekSameWindowRange(anchor);
  const bundle = buildReportLavorazioniBundle([...input.lavRows]);
  const { attive } = splitLavorazioniListRowsForReport([...input.lavRows]);
  const preventivi = input.preventivi ?? [];
  const invoices = input.invoices ?? [];
  const magLog = input.magLog ?? [];
  const timesheetEntries = input.timesheetEntries ?? [];
  const tipiAssenza = input.tipiAssenza;

  const clusters: ControlTowerKpiCluster[] = [];

  if (input.includeLavorazioni !== false) {
    const openedCur = countOpenedInRange(bundle.attive, bundle.storico, range);
    const openedPrev = countOpenedInRange(bundle.attive, bundle.storico, prevRange);
    const completedCur = countCompletedInRange(bundle.completate, range);
    const completedPrev = countCompletedInRange(bundle.completate, prevRange);
    const lateCount = countInterventiInRitardo(attive, anchor, CONTROL_TOWER_LATE_INGRESS_DAYS);
    clusters.push({
      id: "lavorazioni",
      label: "Lavorazioni",
      metrics: [
        metric("lav-aperte", "Aperte settimana", openedCur, openedPrev),
        metric("lav-completate", "Completate settimana", completedCur, completedPrev),
        metric("lav-ritardo", "In ritardo", lateCount, null, { snapshot: true }),
      ],
    });
  }

  if (input.includeDipendenti) {
    const curTotals = timesheetTotalsInRange(timesheetEntries, range, tipiAssenza);
    const prevTotals = timesheetTotalsInRange(timesheetEntries, prevRange, tipiAssenza);
    clusters.push({
      id: "dipendenti",
      label: "Personale",
      metrics: [
        metric("dip-ore", "Ore lavorate", curTotals.totaleLavorato, prevTotals.totaleLavorato, { unit: "hours" }),
        metric("dip-straord", "Straordinari", curTotals.oreStraordinarie, prevTotals.oreStraordinarie, {
          unit: "hours",
        }),
        metric("dip-assenze", "Ore assenza", curTotals.oreAssenza, prevTotals.oreAssenza, {
          unit: "hours",
          invert: true,
        }),
      ],
    });
  }

  if (input.includeMagazzino !== false) {
    const movCur =
      countMovimentiInRange(input.movimentiLogs, range) || countMagLogMovementsInRange(magLog, range);
    const movPrev =
      countMovimentiInRange(input.movimentiLogs, prevRange) ||
      countMagLogMovementsInRange(magLog, prevRange);
    const consumoCur = buildRicambiConsumoRanking([...magLog], [...input.ricambi], range, { limit: 100 });
    const consumoPrev = buildRicambiConsumoRanking([...magLog], [...input.ricambi], prevRange, { limit: 100 });
    const consumoSum = consumoCur.reduce((s, r) => s + r.totalUscite, 0);
    const consumoSumPrev = consumoPrev.reduce((s, r) => s + r.totalUscite, 0);
    const sotto = sottoScortaCount([...input.ricambi]);
    clusters.push({
      id: "ricambi",
      label: "Ricambi",
      metrics: [
        metric("mag-movimenti", "Movimenti settimana", movCur, movPrev),
        metric("mag-consumi", "Consumi settimana", consumoSum, consumoSumPrev),
        metric("mag-sotto-scorta", "Stock critici", sotto, null, { snapshot: true }),
      ],
    });
  }

  if (input.includeAdmin) {
    clusters.push({
      id: "amministrazione",
      label: "Amministrazione",
      metrics: [
        metric(
          "prev-emessi",
          "Preventivi emessi",
          countPreventiviEmessiInRange(preventivi, range),
          countPreventiviEmessiInRange(preventivi, prevRange),
        ),
        metric(
          "fatt-emesse",
          "Fatture emesse",
          countInvoicesInRange(invoices, range, "emesse"),
          countInvoicesInRange(invoices, prevRange, "emesse"),
        ),
        metric(
          "fatt-pagate",
          "Fatture pagate",
          countInvoicesInRange(invoices, range, "pagate"),
          countInvoicesInRange(invoices, prevRange, "pagate"),
        ),
      ],
    });
  }

  return { windowLabel: CONTROL_TOWER_KPI_WINDOW_LABEL, range, clusters };
}

export function buildControlTowerAlertsSlice(input: ControlTowerBaseInput): ControlTowerAlertsSlice {
  const anchor = input.anchor ?? new Date();
  const activeRows = input.lavRows.filter(isActiveLavorazione);
  const schede = input.schedeStore;
  const defaultAddetto = input.defaultAddetto ?? "";
  const items: ControlTowerAlert[] = [];

  const staleRows = activeRows.filter((r) => isStale(r, anchor));
  if (staleRows.length > 0) {
    items.push({
      id: "lav-stale",
      severity: "warning",
      title: `${staleRows.length} lavorazioni ferme oltre ${CONTROL_TOWER_STALE_UPDATE_DAYS} giorni`,
      detail: "Nessun aggiornamento recente.",
      href: "/lavorazioni",
    });
  }

  const lateRows = activeRows.filter((r) => isLateIngress(r, anchor));
  if (lateRows.length > 0) {
    items.push({
      id: "lav-late",
      severity: "warning",
      title: `${lateRows.length} lavorazioni in ritardo`,
      detail: `Oltre ${CONTROL_TOWER_LATE_INGRESS_DAYS} giorni dall'ingresso.`,
      href: "/lavorazioni",
    });
  }

  const sotto = sottoScortaCount([...input.ricambi]);
  if (sotto > 0) {
    items.push({
      id: "mag-sotto-scorta",
      severity: "critical",
      title: `${sotto} ricambi sotto scorta minima`,
      href: "/magazzino",
    });
  }

  if (schede && Object.keys(schede).length > 0) {
    const unassigned = activeRows.filter((r) => !lavorazioneAddettoLabel(r, schede, defaultAddetto));
    if (unassigned.length > 0) {
      items.push({
        id: "lav-unassigned",
        severity: "warning",
        title: `${unassigned.length} lavorazioni senza addetto assegnato`,
        href: "/lavorazioni",
      });
    }
  }

  return { items };
}

export function buildControlTowerWipSlice(input: ControlTowerBaseInput): ControlTowerWipSlice {
  const anchor = input.anchor ?? new Date();
  const activeRows = input.lavRows.filter(isActiveLavorazione);
  const schede = input.schedeStore;
  const defaultAddetto = input.defaultAddetto ?? "";
  const alertLavIds = classifyLavorazioneAlertIds(activeRows, anchor, schede, defaultAddetto);

  const toWip = (rows: LavorazioneListRow[]) =>
    rows
      .filter((r) => !alertLavIds.has(r.id))
      .map((r) => toWipRow(r, anchor, schede, defaultAddetto));

  const buckets: ControlTowerWipBucket[] = [];
  const aperte = activeRows;
  const inCorso = activeRows.filter((r) => !isStale(r, anchor) && !isLateIngress(r, anchor));
  const bloccate = activeRows.filter((r) => isStale(r, anchor));
  const inRitardo = activeRows.filter((r) => isLateIngress(r, anchor));

  for (const b of [
    buildWipBucket("aperte", "Aperte", "normal", toWip(aperte)),
    buildWipBucket("in_corso", "In corso", "normal", toWip(inCorso)),
    buildWipBucket("bloccate", "Bloccate", "critical", toWip(bloccate)),
    buildWipBucket("in_ritardo", "In ritardo", "warning", toWip(inRitardo)),
  ]) {
    if (b) buckets.push(b);
  }

  return { buckets };
}

export function buildControlTowerAdminBacklogSlice(
  input: Pick<ControlTowerBaseInput, "invoices" | "anchor">,
): ControlTowerAdminBacklogSlice {
  const invoices = input.invoices ?? [];
  const anchor = input.anchor ?? new Date();
  const todayYmd = anchor.toISOString().slice(0, 10);
  const scadute = invoices.filter(
    (i) => i.status !== "annullata" && i.residuo > 0 && i.data_scadenza != null && i.data_scadenza < todayYmd,
  ).length;
  return {
    fattureDaEmettere: invoices.filter((i) => i.status === "bozza" || i.status === "da_verificare").length,
    fattureScadute: scadute,
  };
}

export function buildControlTowerMagazzinoOpsSlice(input: ControlTowerBaseInput): ControlTowerMagazzinoOpsSlice {
  const anchor = input.anchor ?? new Date();
  const range = getControlTowerCurrentWeekRange(anchor);
  const ricambiById = new Map(input.ricambi.map((r) => [r.id, r]));
  const movimentiSettimana =
    countMovimentiInRange(input.movimentiLogs, range) ||
    countMagLogMovementsInRange(input.magLog, range);
  const ranking = buildRicambiConsumoRanking([...(input.magLog ?? [])], [...input.ricambi], range, { limit: 5 });
  const topFromLogs = topConsumoFromMovimentiLogs(input.movimentiLogs, ricambiById, range, 5);
  const topConsumo =
    topFromLogs.length > 0
      ? topFromLogs
      : ranking.map((r) => ({ id: r.id, label: r.nome, totalUscite: r.totalUscite }));

  return {
    sottoScortaCount: sottoScortaCount([...input.ricambi]),
    sottoScortaPreview: computeDashboardMagSottoScortaRicambi(input.ricambi, 5),
    movimentiSettimana,
    topConsumo,
    anomalie: (input.magMovements ?? []).slice(0, 3),
  };
}

function logOggettoFromPayload(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return undefined;
  const ctx = (payload as Record<string, unknown>).context;
  if (ctx && typeof ctx === "object" && !Array.isArray(ctx)) {
    const oggetto = (ctx as Record<string, unknown>).oggetto;
    if (typeof oggetto === "string" && oggetto.trim()) return oggetto.trim();
  }
  return undefined;
}

function isGenericLavorazioneOggetto(oggetto: string): boolean {
  const t = oggetto.trim();
  return !t || t === "—" || t === "Lavorazione" || /^Scheda\s·\s/i.test(t);
}

function activityAutoreLabel(
  row: LogModificaRow & { profiles?: { id: string; nome: string } | null },
): string {
  const profileNome = row.profiles?.nome?.trim();
  if (profileNome) return profileNome;
  if (row.autore_id) return `Utente ${row.autore_id.slice(0, 8)}…`;
  return "Sistema";
}

function briefActivityModificaRiga(modificaRiga: string, maxLines = 2): string {
  const lines = filterAuditMetadataModifiche(
    modificaRiga
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => l.replace(/^•\s*/, "")),
  );
  if (lines.length <= maxLines) return lines.map((l) => `• ${l}`).join("\n");
  return `${lines
    .slice(0, maxLines)
    .map((l) => `• ${l}`)
    .join("\n")}\n• …`;
}

function activityFocusHref(row: LogModificaRow): string | null {
  if (row.entita === "lavorazioni" && row.entita_id?.trim()) {
    const sp = new URLSearchParams();
    sp.set(Q_FOCUS_LAV_ROW, row.entita_id.trim());
    return `/lavorazioni?${sp.toString()}`;
  }
  if (row.entita === "magazzino_ricambi" && row.entita_id?.trim()) {
    const sp = new URLSearchParams();
    sp.set(Q_FOCUS_RICAMBIO, row.entita_id.trim());
    return `/magazzino?${sp.toString()}`;
  }
  if (row.entita === "movimenti_ricambi") return "/magazzino";
  if (row.entita === "preventivi") return "/preventivi";
  if (row.entita === "fatturazione") return "/fatturazione";
  if (row.entita === "mezzi") return "/mezzi";
  if (row.entita === "documenti") return "/documenti";
  return null;
}

function resolveActivityOggetto(
  row: LogModificaRow,
  summaryOggetto: string,
  lavById: ReadonlyMap<string, LavorazioneListRow>,
  schedeStore?: LavorazioneSchedeStore,
): string {
  const fromPayload = logOggettoFromPayload(row.payload);
  if (fromPayload && fromPayload !== "—") return fromPayload;
  if (row.entita === "lavorazioni") {
    const lav = lavById.get(row.entita_id);
    if (lav) {
      const label = lavorazioneLogOggettoFromListRow(lav, schedeStore);
      if (label !== "—") return label;
    }
  }
  if (!isGenericLavorazioneOggetto(summaryOggetto)) return summaryOggetto;
  return summaryOggetto;
}

type ActivityMapContext = {
  statiLavorazione?: readonly StatoLavorazioneConfig[];
  lavById: ReadonlyMap<string, LavorazioneListRow>;
  schedeStore?: LavorazioneSchedeStore;
};

function mapLogToActivity(
  rows: readonly LogModificaRow[] | undefined,
  domain: ControlTowerActivityItem["domain"],
  range: DateRange,
  ctx: ActivityMapContext,
): ControlTowerActivityItem[] {
  if (!rows?.length) return [];
  const inRange = rows.filter((row) => isoInRange(row.created_at, range));
  const consolidated = reconcileLogModificaRows(inRange);
  const out: ControlTowerActivityItem[] = [];

  for (const row of consolidated.sort((a, b) => b.created_at.localeCompare(a.created_at))) {
    const reverted = isLogReverted(row);
    const summary = buildLogModificaSummary({
      entita: row.entita,
      entita_id: row.entita_id,
      azione: reverted ? "UNDO" : row.azione,
      payload: row.payload,
      annullato: reverted,
      statiLavorazione: row.entita === "lavorazioni" ? [...(ctx.statiLavorazione ?? [])] : undefined,
    });
    const oggetto = resolveActivityOggetto(row, summary.oggettoRiga, ctx.lavById, ctx.schedeStore);
    const vm: GestionaleLogViewModel = {
      tone: summary.tone,
      tipoRiga: summary.tipoRiga,
      oggettoRiga: oggetto,
      modificaRiga: briefActivityModificaRiga(modificheToModificaRiga(summary.modifiche)),
      autore: activityAutoreLabel(row),
      atIso: row.created_at,
      annullato: reverted,
    };
    out.push({
      id: `${domain}:${row.id}`,
      domain,
      at: row.created_at,
      vm,
      href: activityFocusHref(row),
    });
  }
  return out;
}

/** Activity feed — unico dominio dashboard con `last_7_days`. */
export function buildControlTowerActivityFeedSlice(input: ControlTowerBaseInput): ControlTowerActivityFeedSlice {
  const anchor = input.anchor ?? new Date();
  const range = resolvePresetRange(anchor, "last_7_days");
  const ctx: ActivityMapContext = {
    statiLavorazione: input.statiLavorazione,
    lavById: new Map(input.lavRows.map((r) => [r.id, r])),
    schedeStore: input.schedeStore,
  };
  const perDomainMax = Math.max(6, Math.ceil(CONTROL_TOWER_ACTIVITY_MAX / 3));
  const lavorazioni = mapLogToActivity(input.logLavorazioni, "lavorazioni", range, ctx).slice(0, perDomainMax);
  const ricambi = [
    ...mapLogToActivity(input.logMagazzino, "ricambi", range, ctx),
    ...mapLogToActivity(input.logMovimenti, "ricambi", range, ctx),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, perDomainMax);
  const amministrazione = mapLogToActivity(input.logAdmin, "amministrazione", range, ctx).slice(0, perDomainMax);
  const all = [...lavorazioni, ...ricambi, ...amministrazione]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, CONTROL_TOWER_ACTIVITY_MAX);
  return {
    byDomain: {
      lavorazioni: all.filter((i) => i.domain === "lavorazioni"),
      ricambi: all.filter((i) => i.domain === "ricambi"),
      amministrazione: all.filter((i) => i.domain === "amministrazione"),
    },
  };
}

export function buildControlTowerCalendarSlice(
  input: Pick<ControlTowerBaseInput, "promemoria" | "anchor">,
): ControlTowerCalendarSlice {
  const anchor = input.anchor ?? new Date();
  const promemoria = input.promemoria ?? [];
  const startYmd = ymdFromDate(anchor);
  const end = new Date(anchor);
  end.setDate(end.getDate() + CONTROL_TOWER_CALENDAR_FORWARD_DAYS);
  const endYmd = ymdFromDate(end);
  const items: ControlTowerCalendarItem[] = promemoria
    .filter((p) => !p.deleted_at && p.event_date >= startYmd && p.event_date <= endYmd)
    .sort((a, b) => a.event_date.localeCompare(b.event_date))
    .slice(0, 12)
    .map((p) => ({
      id: p.id,
      ymd: p.event_date,
      title: p.title.trim() || "Promemoria",
      kind: "appuntamento" as const,
    }));
  return { items };
}

export function filterControlTowerKpiClusters(
  slice: ControlTowerHeaderKpiSlice,
  opts: { lavorazioni: boolean; magazzino: boolean; admin: boolean; dipendenti: boolean },
): ControlTowerHeaderKpiSlice {
  const clusters = slice.clusters.filter((c) => {
    if (c.id === "lavorazioni") return opts.lavorazioni;
    if (c.id === "dipendenti") return opts.dipendenti;
    if (c.id === "ricambi") return opts.magazzino;
    if (c.id === "amministrazione") return opts.admin;
    return true;
  });
  return { ...slice, clusters };
}

export function composeControlTowerSlices(
  input: ControlTowerBaseInput & {
    includeLavorazioni?: boolean;
    includeMagazzino?: boolean;
    includeAdmin?: boolean;
    includeDipendenti?: boolean;
  },
) {
  return {
    headerKpi: buildControlTowerHeaderKpiSlice(input),
    alerts: buildControlTowerAlertsSlice(input),
    wip: buildControlTowerWipSlice(input),
    adminBacklog: buildControlTowerAdminBacklogSlice(input),
    magazzinoOps: buildControlTowerMagazzinoOpsSlice(input),
    activityFeed: buildControlTowerActivityFeedSlice(input),
    calendar: buildControlTowerCalendarSlice(input),
  };
}

export { CONTROL_TOWER_TIME };
