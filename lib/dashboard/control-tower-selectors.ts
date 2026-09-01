import {
  buildLogModificaSummary,
  extractPayloadFieldChanges,
  filterAuditMetadataModifiche,
  isAuditMetadataFieldKey,
  isTechnicalAuditOggetto,
  modificheToModificaRiga,
} from "@/lib/gestionale-log/log-summary";
import { LOG_AGGREGATION_WINDOW_MS, reconcileLogModificaRows } from "@/lib/gestionale-log/log-event-pipeline";
import {
  buildLogModificheFocusHref,
  lavorazioneIdFromLogRow,
  logAutoreLabel,
} from "@/lib/gestionale-log/log-modifiche-view-model";
import { auditPayload, isLogReverted } from "@/lib/gestionale-log/undo";
import type { GestionaleLogViewModel } from "@/lib/gestionale-log/view-model";
import { activityFeedEventLabelFromGroup } from "@/lib/gestionale-log/view-model";
import { lavorazioneLogOggettoFromListRow } from "@/lib/lavorazioni/lavorazione-log-oggetto";
import type { StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import { isLavorazioneInCorso } from "@/lib/lavorazioni/archived";
import { resolveAddettoDisplayLabel } from "@/lib/lavorazioni/resolve-addetto-display";
import {
  lavorazioneClienteLabel,
  lavorazioneMacchinaLabel,
  lavorazioneMezzoIdentParts,
  lavorazioneOggettoLabel,
} from "@/lib/lavorazioni/lavorazioni-list-row-labels";
import {
  buildReportLavorazioniBundle,
  avgCloseDays,
  countCompletedInRange,
  countOpenedInRange,
} from "@/lib/report/lavorazioni-report-selectors";
import { splitLavorazioniListRowsForReport } from "@/lib/lavorazioni/lavorazioni-report-adapter";
import { entrateQtyFromMagazzinoEntry } from "@/lib/magazzino/ricambio-consumo-from-log";
import {
  entityLabelFromPayload,
  isMagazzinoLogEntita,
  resolveRicambioOggettoForLogRow,
  ricambioIdFromLogRow,
} from "@/lib/magazzino/ricambio-log-label";
import {
  sottoScortaCount,
} from "@/lib/report/kpi-performance/kpi-performance-formulas";
import { filterEntriesForReportTimesheetKpi } from "@/lib/dipendenti/timesheet-report-kpi-filter";
import { computeMonthTotals } from "@/lib/dipendenti/timesheet-totals";
import type { DipendenteTimesheetEntryRow } from "@/lib/dipendenti/types";
import type { TipoAssenzaConfig } from "@/lib/dipendenti/tipi-assenza-model";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { displayRicambioCodice } from "@/lib/magazzino/ricambio-codice";
import { buildRicambiConsumoRanking } from "@/lib/magazzino/ricambio-consumo-from-log";
import {
  CONTROL_TOWER_ACTIVITY_PER_CARD,
  CONTROL_TOWER_CALENDAR_FORWARD_DAYS,
  CONTROL_TOWER_KPI_DAY_WINDOW_LABEL,
  CONTROL_TOWER_KPI_MONTH_WINDOW_LABEL,
  CONTROL_TOWER_KPI_WINDOW_LABEL,
  CONTROL_TOWER_LATE_INGRESS_DAYS,
  CONTROL_TOWER_STALE_UPDATE_DAYS,
} from "@/lib/dashboard/control-tower-constants";
import {
  CONTROL_TOWER_TIME,
  getControlTowerCurrentDayRange,
  getControlTowerCurrentMonthRange,
  getControlTowerCurrentWeekRange,
  getControlTowerPreviousMonthRange,
  getControlTowerPreviousWeekRange,
} from "@/lib/dashboard/control-tower-time-ranges";
import {
  deltaPct,
  isoInRange,

  ymdFromDate,
  type DateRange,
} from "@/lib/report/date-ranges";
import {
  computeDashboardLavWidgetStats,
  computeDashboardMagSottoScortaRicambi,
  formatDashboardLavWidgetMezzoIdent,
  type DashboardMagMovementRow,
} from "@/lib/view/dashboard-widgets-selectors";
import { scoreActivity } from "@/lib/audit/score-activity";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { InvoiceRow, LogModificaRow } from "@/src/types/supabase-tables";
import type { LavorazioneSchedeStore } from "@/types/schede";
import type { DashboardPromemoriaRow } from "@/lib/dashboard/dashboard-promemoria-types";
import type { WorkshopScheduleSessionView } from "@/lib/workshop-schedule/types";
import { computeDayCapacity } from "@/lib/workshop-schedule/day-capacity";
import { sessionDurationMinutes, ymdFromIso } from "@/lib/workshop-schedule/datetime";

export type ControlTowerKpiMetric = {
  id: string;
  label: string;
  value: number;
  prevValue: number | null;
  deltaPct: number | null;
  deltaAbs: string | null;
  invert?: boolean;
  snapshot?: boolean;
  unit?: "count" | "hours" | "days" | "currency";
  /** Breve spiegazione sotto il valore (metriche istantanee). */
  hint?: string;
};

export type ControlTowerKpiCluster = {
  id: "lavorazioni" | "ricambi" | "amministrazione" | "dipendenti";
  label: string;
  metrics: ControlTowerKpiMetric[];
};

export type ControlTowerBriefMode = "day" | "week" | "month";

export type ControlTowerHeaderKpiSlice = {
  windowLabel: string;
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

export type ControlTowerActivityDomain = "lavorazioni" | "magazzino" | "preventiviDdt" | "fatturazione";

export type ControlTowerActivityItem = {
  id: string;
  domain: ControlTowerActivityDomain;
  at: string;
  vm: GestionaleLogViewModel;
  href: string | null;
  /** Numero di eventi log aggregati nella riga (stessa entità). */
  eventCount: number;
  /** Etichetta evento per UI (derivata dal gruppo log). */
  eventLabel: string;
};

export type ControlTowerActivityFeedSlice = {
  byDomain: {
    lavorazioni: ControlTowerActivityItem[];
    magazzino: ControlTowerActivityItem[];
    preventiviDdt: ControlTowerActivityItem[];
    fatturazione: ControlTowerActivityItem[];
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
  ricambi: readonly RicambioMagazzino[];
  magLog?: readonly MagazzinoChangeLogEntry[];
  magMovements?: readonly DashboardMagMovementRow[];
  movimentiLogs?: readonly LogModificaRow[];
  preventivi?: readonly PreventivoRecord[];
  invoices?: readonly InvoiceRow[];
  logLavorazioni?: readonly LogModificaRow[];
  logMagazzino?: readonly LogModificaRow[];
  logMovimenti?: readonly LogModificaRow[];
  logPreventivi?: readonly LogModificaRow[];
  logDdt?: readonly LogModificaRow[];
  logFatturazione?: readonly LogModificaRow[];
  promemoria?: readonly DashboardPromemoriaRow[];
  agendaSessions?: readonly WorkshopScheduleSessionView[];
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
): ControlTowerWipRow {
  const addettoRaw = resolveAddettoDisplayLabel(row, { schedeStore });
  return {
    id: row.id,
    stato: row.stato,
    macchina: macchinaLabel(row, schedeStore),
    mezzoIdent: mezzoIdent(row, schedeStore),
    addetto: addettoRaw === "—" ? null : addettoRaw,
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
    unit?: "count" | "hours" | "days" | "currency";
    formatDelta?: (n: number) => string;
    hint?: string;
  },
): ControlTowerKpiMetric {
  const value =
    opts?.unit === "hours" || opts?.unit === "days"
      ? Math.round(cur * 10) / 10
      : opts?.unit === "currency"
        ? Math.round(cur * 100) / 100
        : cur;
  const prevValue =
    opts?.snapshot || prev == null
      ? null
      : opts?.unit === "hours" || opts?.unit === "days"
        ? Math.round(prev * 10) / 10
        : opts?.unit === "currency"
          ? Math.round(prev * 100) / 100
          : prev;
  const delta = prevValue != null ? value - prevValue : null;
  return {
    id,
    label,
    value,
    prevValue,
    deltaPct: prevValue != null && !opts?.snapshot ? deltaPct(value, prevValue) : null,
    deltaAbs:
      opts?.snapshot || delta == null
        ? null
        : opts?.formatDelta
          ? opts.formatDelta(delta)
          : `${delta >= 0 ? "+" : ""}${delta}`,
    invert: opts?.invert,
    snapshot: opts?.snapshot,
    unit: opts?.unit,
    hint: opts?.hint,
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

function sumInvoiceAmountInRange(
  invoices: readonly InvoiceRow[],
  range: DateRange,
  mode: "emesse" | "pagate",
): number {
  let sum = 0;
  for (const inv of invoices) {
    if (inv.status === "annullata") continue;
    if (mode === "emesse") {
      if (inv.status === "bozza" || inv.status === "da_verificare") continue;
      if (isoInRange(inv.data_emissione, range)) sum += inv.totale;
    } else if (inv.status === "pagata" && isoInRange(inv.updated_at, range)) {
      sum += inv.pagato > 0 ? inv.pagato : inv.totale;
    }
  }
  return Math.round(sum * 100) / 100;
}

function sumMagEntrateInRange(magLog: readonly MagazzinoChangeLogEntry[] | undefined, range: DateRange): number {
  if (!magLog?.length) return 0;
  let n = 0;
  for (const e of magLog) {
    if (!isoInRange(e.at, range)) continue;
    n += entrateQtyFromMagazzinoEntry(e);
  }
  return n;
}

function formatCurrencyDelta(n: number): string {
  const abs = Math.abs(n).toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
  return `${n >= 0 ? "+" : "-"}${abs}`;
}

function formatDaysDelta(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return `${rounded >= 0 ? "+" : ""}${rounded} gg`;
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
      const label = r?.descrizione?.trim() || displayRicambioCodice(r?.codiceFornitoreOriginale ?? "") || id;
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
): Set<string> {
  const ids = new Set<string>();
  for (const row of activeRows) {
    if (isStale(row, anchor) || isLateIngress(row, anchor)) ids.add(row.id);
  }
  return ids;
}

/** KPI header — giorno, settimana o mese corrente; confronto su settimana e mese. */
export function buildControlTowerHeaderKpiSlice(
  input: ControlTowerBaseInput & {
    includeLavorazioni?: boolean;
    includeMagazzino?: boolean;
    includeAdmin?: boolean;
    includeDipendenti?: boolean;
    briefMode?: ControlTowerBriefMode;
    range?: DateRange;
    prevRange?: DateRange | null;
  },
): ControlTowerHeaderKpiSlice {
  const anchor = input.anchor ?? new Date();
  const briefMode = input.briefMode ?? "week";
  const comparePrevious = briefMode === "week" || briefMode === "month";
  const range =
    input.range ??
    (briefMode === "day"
      ? getControlTowerCurrentDayRange(anchor)
      : briefMode === "month"
        ? getControlTowerCurrentMonthRange(anchor)
        : getControlTowerCurrentWeekRange(anchor));
  const prevRange = comparePrevious
    ? (input.prevRange ??
      (briefMode === "month"
        ? getControlTowerPreviousMonthRange(anchor)
        : getControlTowerPreviousWeekRange(anchor)))
    : null;
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
    const openedPrev = prevRange ? countOpenedInRange(bundle.attive, bundle.storico, prevRange) : null;
    const completedCur = countCompletedInRange(bundle.completate, range);
    const completedPrev = prevRange ? countCompletedInRange(bundle.completate, prevRange) : null;
    const avgCloseCur = avgCloseDays(bundle.completate, range);
    const avgClosePrev = prevRange ? avgCloseDays(bundle.completate, prevRange) : null;
    const urgentCount = computeDashboardLavWidgetStats(attive as unknown as LavorazioneListRow[]).urgenti;
    clusters.push({
      id: "lavorazioni",
      label: "Lavorazioni",
      metrics: [
        metric("lav-aperte", "Nuove lavorazioni aperte", openedCur, openedPrev),
        metric("lav-completate", "Lavorazioni chiuse", completedCur, completedPrev),
        metric("lav-tempo-chiusura", "Tempo medio chiusura", avgCloseCur, avgClosePrev, {
          unit: "days",
          invert: true,
          formatDelta: formatDaysDelta,
        }),
        metric("lav-urgenti", "Lavorazioni urgenti", urgentCount, null, {
          snapshot: true,
          hint: "Aperte con priorità urgente",
        }),
      ],
    });
  }

  if (input.includeDipendenti) {
    const curTotals = timesheetTotalsInRange(timesheetEntries, range, tipiAssenza);
    const prevTotals = prevRange ? timesheetTotalsInRange(timesheetEntries, prevRange, tipiAssenza) : null;
    clusters.push({
      id: "dipendenti",
      label: "Personale",
      metrics: [
        metric("dip-ore", "Ore di lavoro", curTotals.totaleLavorato, prevTotals?.totaleLavorato ?? null, {
          unit: "hours",
        }),
        metric("dip-straord", "Ore straordinarie", curTotals.oreStraordinarie, prevTotals?.oreStraordinarie ?? null, {
          unit: "hours",
        }),
        metric("dip-assenze", "Ore di assenza", curTotals.oreAssenza, prevTotals?.oreAssenza ?? null, {
          unit: "hours",
          invert: true,
        }),
      ],
    });
  }

  if (input.includeMagazzino !== false) {
    const movCur =
      countMovimentiInRange(input.movimentiLogs, range) || countMagLogMovementsInRange(magLog, range);
    const movPrev = prevRange
      ? countMovimentiInRange(input.movimentiLogs, prevRange) ||
        countMagLogMovementsInRange(magLog, prevRange)
      : null;
    const consumoCur = buildRicambiConsumoRanking([...magLog], [...input.ricambi], range, { limit: 100 });
    const consumoPrev = prevRange
      ? buildRicambiConsumoRanking([...magLog], [...input.ricambi], prevRange, { limit: 100 })
      : [];
    const consumoSum = consumoCur.reduce((s, r) => s + r.totalUscite, 0);
    const consumoSumPrev = prevRange ? consumoPrev.reduce((s, r) => s + r.totalUscite, 0) : null;
    const entrateCur = sumMagEntrateInRange(magLog, range);
    const entratePrev = prevRange ? sumMagEntrateInRange(magLog, prevRange) : null;
    const sotto = sottoScortaCount([...input.ricambi]);
    clusters.push({
      id: "ricambi",
      label: "Ricambi",
      metrics: [
        metric("mag-movimenti", "Movimenti di magazzino", movCur, movPrev),
        metric("mag-entrate", "Pezzi in ingresso", entrateCur, entratePrev),
        metric("mag-consumi", "Pezzi in uscita", consumoSum, consumoSumPrev),
        metric("mag-sotto-scorta", "Articoli sotto scorta", sotto, null, {
          snapshot: true,
          hint: "Quantità sotto la scorta minima",
        }),
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
          "Preventivi creati",
          countPreventiviEmessiInRange(preventivi, range),
          prevRange ? countPreventiviEmessiInRange(preventivi, prevRange) : null,
        ),
        metric(
          "fatt-emesse",
          "Fatture emesse",
          countInvoicesInRange(invoices, range, "emesse"),
          prevRange ? countInvoicesInRange(invoices, prevRange, "emesse") : null,
        ),
        metric(
          "fatt-pagate",
          "Fatture incassate",
          countInvoicesInRange(invoices, range, "pagate"),
          prevRange ? countInvoicesInRange(invoices, prevRange, "pagate") : null,
        ),
        metric(
          "fatt-fatturato",
          "Fatturato emesso",
          sumInvoiceAmountInRange(invoices, range, "emesse"),
          prevRange ? sumInvoiceAmountInRange(invoices, prevRange, "emesse") : null,
          { unit: "currency", formatDelta: formatCurrencyDelta },
        ),
        metric(
          "fatt-incassato",
          "Incassi",
          sumInvoiceAmountInRange(invoices, range, "pagate"),
          prevRange ? sumInvoiceAmountInRange(invoices, prevRange, "pagate") : null,
          { unit: "currency", formatDelta: formatCurrencyDelta },
        ),
      ],
    });
  }

  const windowLabel =
    briefMode === "day"
      ? CONTROL_TOWER_KPI_DAY_WINDOW_LABEL
      : briefMode === "month"
        ? CONTROL_TOWER_KPI_MONTH_WINDOW_LABEL
        : CONTROL_TOWER_KPI_WINDOW_LABEL;

  return { windowLabel, range, clusters };
}

export function buildControlTowerAlertsSlice(input: ControlTowerBaseInput): ControlTowerAlertsSlice {
  const anchor = input.anchor ?? new Date();
  const activeRows = input.lavRows.filter(isActiveLavorazione);
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

  return { items };
}

export function buildControlTowerWipSlice(input: ControlTowerBaseInput): ControlTowerWipSlice {
  const anchor = input.anchor ?? new Date();
  const activeRows = input.lavRows.filter(isActiveLavorazione);
  const schede = input.schedeStore;
  const alertLavIds = classifyLavorazioneAlertIds(activeRows, anchor);

  const toWip = (rows: LavorazioneListRow[]) =>
    rows
      .filter((r) => !alertLavIds.has(r.id))
      .map((r) => toWipRow(r, anchor, schede));

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
  const fromLabel = entityLabelFromPayload(payload);
  if (fromLabel && fromLabel !== "—" && !isTechnicalAuditOggetto(fromLabel)) return fromLabel;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return undefined;
  const ctx = (payload as Record<string, unknown>).context;
  if (ctx && typeof ctx === "object" && !Array.isArray(ctx)) {
    const oggetto = (ctx as Record<string, unknown>).oggetto;
    if (typeof oggetto === "string" && oggetto.trim() && !isTechnicalAuditOggetto(oggetto)) return oggetto.trim();
  }
  return undefined;
}

function isGenericLavorazioneOggetto(oggetto: string): boolean {
  const t = oggetto.trim();
  return !t || t === "—" || t === "Lavorazione" || /^Scheda\s·\s/i.test(t);
}

function activityAutoreLabel(
  row: LogModificaRow & { profiles?: { id: string; nome: string; cognome?: string | null } | null },
): string {
  return logAutoreLabel(row, null, "");
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

function resolveActivityOggetto(
  row: LogModificaRow,
  summaryOggetto: string,
  ctx: ActivityMapContext,
): string {
  const fromPayload = logOggettoFromPayload(row.payload);
  if (fromPayload && fromPayload !== "—") return fromPayload;
  if (isMagazzinoLogEntita(row.entita)) {
    return resolveRicambioOggettoForLogRow(row, ctx.ricambiById);
  }
  const lavId = lavorazioneIdFromLogRow(row);
  if (lavId) {
    const lav = ctx.lavById.get(lavId);
    if (lav) {
      const label = lavorazioneLogOggettoFromListRow(lav, ctx.schedeStore);
      if (label !== "—") return label;
    }
  }
  if (!isGenericLavorazioneOggetto(summaryOggetto)) return summaryOggetto;
  return summaryOggetto;
}

type ActivityMapContext = {
  statiLavorazione?: readonly StatoLavorazioneConfig[];
  lavById: ReadonlyMap<string, LavorazioneListRow>;
  ricambiById: ReadonlyMap<string, RicambioMagazzino>;
  schedeStore?: LavorazioneSchedeStore;
};

/** Chiave di raggruppamento feed — stessa lavorazione/ricambio anche con entità log diverse. */
function activityGroupKey(row: LogModificaRow): string {
  const lavId = lavorazioneIdFromLogRow(row);
  if (lavId) return `lavorazione:${lavId}`;
  const ricId = ricambioIdFromLogRow(row);
  if (ricId) return `ricambio:${ricId}`;
  return `${row.entita}:${row.entita_id ?? ""}`;
}

/** Unisce più log sulla stessa entità in un solo evento (stato netto del periodo). */
function mergeEntityActivityRows(groupAsc: readonly LogModificaRow[]): { row: LogModificaRow; eventCount: number } {
  if (groupAsc.length === 1) return { row: groupAsc[0]!, eventCount: 1 };
  const oldest = groupAsc[0]!;
  const newest = groupAsc[groupAsc.length - 1]!;
  const beforeObj: Record<string, unknown> = {};
  const afterObj: Record<string, unknown> = {};

  const oldestBase = auditPayload(oldest);
  if (oldestBase.before && typeof oldestBase.before === "object" && !Array.isArray(oldestBase.before)) {
    Object.assign(beforeObj, oldestBase.before);
  }
  const newestBase = auditPayload(newest);
  if (newestBase.after && typeof newestBase.after === "object" && !Array.isArray(newestBase.after)) {
    Object.assign(afterObj, newestBase.after);
  }

  for (const row of groupAsc) {
    for (const ch of extractPayloadFieldChanges(row.payload)) {
      if (isAuditMetadataFieldKey(ch.key)) continue;
      if (!(ch.key in beforeObj)) beforeObj[ch.key] = ch.before;
      afterObj[ch.key] = ch.after;
    }
  }

  const mergedRaw = { ...auditPayload(newest), before: beforeObj, after: afterObj };
  return {
    row: { ...newest, created_at: newest.created_at, payload: mergedRaw },
    eventCount: groupAsc.length,
  };
}

/** Spezza log ordinati ASC in burst temporali (gap > windowMs = burst separato). */
export function splitLogsIntoTimeBursts(
  rowsAsc: readonly LogModificaRow[],
  windowMs: number = LOG_AGGREGATION_WINDOW_MS,
): LogModificaRow[][] {
  if (rowsAsc.length === 0) return [];
  const bursts: LogModificaRow[][] = [];
  let current: LogModificaRow[] = [rowsAsc[0]!];
  for (let i = 1; i < rowsAsc.length; i++) {
    const prev = rowsAsc[i - 1]!;
    const row = rowsAsc[i]!;
    const tPrev = new Date(prev.created_at).getTime();
    const tRow = new Date(row.created_at).getTime();
    if (!Number.isNaN(tPrev) && !Number.isNaN(tRow) && tRow - tPrev <= windowMs) {
      current.push(row);
    } else {
      bursts.push(current);
      current = [row];
    }
  }
  bursts.push(current);
  return bursts;
}

function groupLogsByEntity(
  rows: readonly LogModificaRow[],
  windowMs: number = LOG_AGGREGATION_WINDOW_MS,
): { row: LogModificaRow; eventCount: number; sourceRows: LogModificaRow[] }[] {
  const buckets = new Map<string, LogModificaRow[]>();
  for (const row of rows) {
    const key = activityGroupKey(row);
    const list = buckets.get(key) ?? [];
    list.push(row);
    buckets.set(key, list);
  }
  const merged: { row: LogModificaRow; eventCount: number; sourceRows: LogModificaRow[] }[] = [];
  for (const list of buckets.values()) {
    const asc = [...list].sort((a, b) => a.created_at.localeCompare(b.created_at));
    for (const burst of splitLogsIntoTimeBursts(asc, windowMs)) {
      const { row, eventCount } = mergeEntityActivityRows(burst);
      merged.push({ row, eventCount, sourceRows: burst });
    }
  }
  return merged.sort((a, b) => b.row.created_at.localeCompare(a.row.created_at));
}

function mapLogToActivity(
  rows: readonly LogModificaRow[] | undefined,
  domain: ControlTowerActivityDomain,
  ctx: ActivityMapContext,
): ControlTowerActivityItem[] {
  if (!rows?.length) return [];
  const reconciled = reconcileLogModificaRows(rows);
  const byEntity = groupLogsByEntity(reconciled);
  const out: ControlTowerActivityItem[] = [];

  for (const { row, eventCount, sourceRows } of byEntity) {
    const reverted = isLogReverted(row);
    const summary = buildLogModificaSummary({
      entita: row.entita,
      entita_id: row.entita_id,
      azione: reverted ? "UNDO" : row.azione,
      payload: row.payload,
      annullato: reverted,
      statiLavorazione: row.entita === "lavorazioni" ? [...(ctx.statiLavorazione ?? [])] : undefined,
    });
    const oggetto = resolveActivityOggetto(row, summary.oggettoRiga, ctx);
    const modificaBase = briefActivityModificaRiga(modificheToModificaRiga(summary.modifiche));
    const modificaRiga =
      eventCount > 1 && modificaBase !== "—"
        ? `${modificaBase}\n• ${eventCount} aggiornamenti nel periodo`
        : modificaBase;
    const vm: GestionaleLogViewModel = {
      tone: summary.tone,
      tipoRiga: summary.tipoRiga,
      oggettoRiga: oggetto,
      modificaRiga,
      autore: activityAutoreLabel(row),
      atIso: row.created_at,
      annullato: reverted,
    };
    const groupKey = activityGroupKey(row);
    out.push({
      id: `${domain}:${groupKey}:${row.created_at}`,
      domain,
      at: row.created_at,
      vm,
      href: buildLogModificheFocusHref(row),
      eventCount,
      eventLabel: activityFeedEventLabelFromGroup(vm, sourceRows),
    });
  }
  return out;
}

/** Activity feed — ultimi N aggiornamenti per macchina (raggruppo per lavorazione), ordinati per data. */
export function pickLavorazioneIdsFromActivityLogs(
  logs: readonly LogModificaRow[],
  limit: number,
): string[] {
  const latestAtByLav = new Map<string, string>();
  for (const row of logs) {
    const lavId = lavorazioneIdFromLogRow(row);
    if (!lavId) continue;
    const prev = latestAtByLav.get(lavId);
    if (!prev || row.created_at.localeCompare(prev) > 0) latestAtByLav.set(lavId, row.created_at);
  }
  return [...latestAtByLav.entries()]
    .sort((a, b) => b[1].localeCompare(a[1]))
    .slice(0, limit)
    .map(([id]) => id);
}

/** Activity feed — ultimi log per entità/macchina (limit query server + slice card). */
export function buildControlTowerActivityFeedSlice(input: ControlTowerBaseInput): ControlTowerActivityFeedSlice {
  const ctx: ActivityMapContext = {
    statiLavorazione: input.statiLavorazione,
    lavById: new Map(input.lavRows.map((r) => [r.id, r])),
    ricambiById: new Map(input.ricambi.map((r) => [r.id, r])),
    schedeStore: input.schedeStore,
  };
  const limit = CONTROL_TOWER_ACTIVITY_PER_CARD;

  const sortByScore = (rows: readonly LogModificaRow[] | undefined) =>
    [...(rows ?? [])].sort((a, b) => scoreActivity(b) - scoreActivity(a));

  const lavorazioni = mapLogToActivity(sortByScore(input.logLavorazioni), "lavorazioni", ctx).slice(
    0,
    limit,
  );
  const magazzino = mapLogToActivity(
    sortByScore([...(input.logMagazzino ?? []), ...(input.logMovimenti ?? [])]),
    "magazzino",
    ctx,
  ).slice(0, limit);
  const preventiviDdt = mapLogToActivity(
    sortByScore([...(input.logPreventivi ?? []), ...(input.logDdt ?? [])]),
    "preventiviDdt",
    ctx,
  ).slice(0, limit);
  const fatturazione = mapLogToActivity(sortByScore(input.logFatturazione), "fatturazione", ctx).slice(
    0,
    limit,
  );

  return {
    byDomain: {
      lavorazioni,
      magazzino,
      preventiviDdt,
      fatturazione,
    },
  };
}

export type ControlTowerAgendaKpiSlice = {
  plannedHoursToday: number;
  eventsToday: number;
  overdueCount: number;
  scheduledCount: number;
  saturationPct: number;
};

export function buildControlTowerAgendaKpiSlice(
  input: Pick<ControlTowerBaseInput, "agendaSessions" | "anchor">,
): ControlTowerAgendaKpiSlice {
  const anchor = input.anchor ?? new Date();
  const todayYmd = ymdFromIso(anchor.toISOString());
  const now = anchor.getTime();
  const sessions = (input.agendaSessions ?? []).filter(
    (s) => ymdFromIso(s.startAt) === todayYmd && s.planningStatus !== "cancelled",
  );
  const plannedMinutes = sessions.reduce((acc, s) => acc + sessionDurationMinutes(s.startAt, s.endAt), 0);
  const capacity = computeDayCapacity(todayYmd, sessions);
  return {
    plannedHoursToday: Math.round((plannedMinutes / 60) * 10) / 10,
    eventsToday: sessions.length,
    overdueCount: sessions.filter(
      (s) => !["completed", "cancelled"].includes(s.planningStatus) && Date.parse(s.endAt) < now,
    ).length,
    scheduledCount: sessions.filter((s) => s.planningStatus === "scheduled").length,
    saturationPct: capacity.saturationPct,
  };
}

export function buildControlTowerCalendarSlice(
  input: Pick<ControlTowerBaseInput, "promemoria" | "agendaSessions" | "anchor">,
): ControlTowerCalendarSlice {
  const anchor = input.anchor ?? new Date();
  const agenda = input.agendaSessions ?? [];
  if (agenda.length > 0) {
    const startYmd = ymdFromDate(anchor);
    const end = new Date(anchor);
    end.setDate(end.getDate() + CONTROL_TOWER_CALENDAR_FORWARD_DAYS);
    const endYmd = ymdFromDate(end);
    const items: ControlTowerCalendarItem[] = agenda
      .filter((s) => {
        const ymd = ymdFromIso(s.startAt);
        return ymd >= startYmd && ymd <= endYmd && s.planningStatus !== "cancelled";
      })
      .sort((a, b) => a.startAt.localeCompare(b.startAt))
      .slice(0, 12)
      .map((s) => ({
        id: s.id,
        ymd: ymdFromIso(s.startAt),
        title: s.title.trim() || "Sessione",
        kind: "appuntamento" as const,
      }));
    return { items };
  }
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
    agendaKpi: buildControlTowerAgendaKpiSlice(input),
  };
}

export { CONTROL_TOWER_TIME };
