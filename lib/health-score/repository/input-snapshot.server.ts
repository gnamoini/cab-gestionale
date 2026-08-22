import { CONTROL_TOWER_LATE_INGRESS_DAYS } from "@/lib/dashboard/control-tower-constants";
import {
  computeInactiveLavorazioniCriticality,
  computeSottoScortaCriticality,
  lateIngressWeight,
} from "@/lib/dashboard/operational-health-criticality";
import { isLavorazioneInCorso } from "@/lib/lavorazioni/archived";
import { filterEntriesForReportTimesheetKpi } from "@/lib/dipendenti/timesheet-report-kpi-filter";
import { computeMonthTotals } from "@/lib/dipendenti/timesheet-totals";
import type { DipendenteTimesheetEntryRow } from "@/lib/dipendenti/types";
import type { TipoAssenzaConfig } from "@/lib/dipendenti/tipi-assenza-model";
import { entrateQtyFromMagazzinoEntry } from "@/lib/magazzino/ricambio-consumo-from-log";
import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import { buildRicambiConsumoRanking } from "@/lib/magazzino/ricambio-consumo-from-log";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import {
  avgCloseDays,
  buildReportLavorazioniBundle,
  countCompletedInRange,
  countOpenedInRange,
} from "@/lib/report/lavorazioni-report-selectors";
import { sottoScortaCount } from "@/lib/report/kpi-performance/kpi-performance-formulas";
import { isoInRange, ymdFromDate, type DateRange } from "@/lib/report/date-ranges";
import { computeUrgentFulfillmentStats } from "@/lib/health-score/lavorazioni-urgent-fulfillment";
import {
  collectInactiveLavorazioneIds,
  collectLateIngressLavorazioneIds,
  collectStockCriticalRicambioIds,
} from "@/lib/health-score/explain/collect-factor-source-ids";
import type { InputSnapshot } from "@/lib/health-score/types";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { InvoiceRow } from "@/src/types/supabase-tables";

function daysBetween(startIso: string, anchor: Date): number {
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return 0;
  return Math.max(0, (anchor.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function lavIngressIso(row: LavorazioneListRow): string {
  return row.data_ingresso?.trim() || row.created_at;
}

function timesheetInRange(entries: readonly DipendenteTimesheetEntryRow[], range: DateRange) {
  const from = ymdFromDate(range.start);
  const to = ymdFromDate(range.end);
  return entries.filter((e) => e.work_date >= from && e.work_date <= to);
}

function timesheetTotals(
  entries: readonly DipendenteTimesheetEntryRow[],
  range: DateRange,
  tipiAssenza?: readonly TipoAssenzaConfig[],
) {
  const filtered = filterEntriesForReportTimesheetKpi(timesheetInRange(entries, range), tipiAssenza);
  return computeMonthTotals(filtered);
}

function countPreventiviEmessi(records: readonly PreventivoRecord[], range: DateRange): number {
  let n = 0;
  for (const p of records) {
    const at = p.dataCreazione || p.aggiornatoAt;
    if (p.stato === "bozza") continue;
    if (isoInRange(at, range)) n += 1;
  }
  return n;
}

function sumInvoiceAmount(invoices: readonly InvoiceRow[], range: DateRange, mode: "emesse" | "pagate"): number {
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

function countMagMovements(magLog: readonly MagazzinoChangeLogEntry[], range: DateRange): number {
  let n = 0;
  for (const e of magLog) {
    if (isoInRange(e.at, range)) n += 1;
  }
  return n;
}

function sumMagEntrate(magLog: readonly MagazzinoChangeLogEntry[], range: DateRange): number {
  let n = 0;
  for (const e of magLog) {
    if (!isoInRange(e.at, range)) continue;
    n += entrateQtyFromMagazzinoEntry(e);
  }
  return n;
}

function computeTimesheetCoverage(
  entries: readonly DipendenteTimesheetEntryRow[],
  range: DateRange,
  dipendentiAttivi: number,
): number {
  if (dipendentiAttivi <= 0) return 0;
  const from = ymdFromDate(range.start);
  const to = ymdFromDate(range.end);
  const msPerDay = 86400000;
  const days = Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / msPerDay) + 1);
  const expected = dipendentiAttivi * days;
  const filled = new Set(entries.map((e) => `${e.dipendente_id}:${e.work_date}`)).size;
  return Math.min(100, Math.round((filled / expected) * 100));
}

export function buildInputSnapshot(input: {
  lavRows: LavorazioneListRow[];
  ricambi: RicambioMagazzino[];
  magLog: MagazzinoChangeLogEntry[];
  timesheetEntries: DipendenteTimesheetEntryRow[];
  tipiAssenza: readonly TipoAssenzaConfig[];
  statiLavorazione: import("@/lib/lavorazioni/types").StatoLavorazioneConfig[];
  preventivi: PreventivoRecord[];
  invoices: InvoiceRow[];
  dipendentiAttivi: number;
  mezziCount: number;
  range: DateRange;
  prevRange: DateRange;
  anchor: Date;
  usePreventiviForMissingFatturazione?: boolean;
}): InputSnapshot {
  const bundle = buildReportLavorazioniBundle([...input.lavRows]);
  const attive = input.lavRows.filter((r) => !r.deleted_at && isLavorazioneInCorso(r));
  const openCount = attive.length;
  const backlog = openCount;

  let backlogAgeSum = 0;
  let lateIngressCount = 0;
  for (const row of attive) {
    const ingressDays = daysBetween(lavIngressIso(row), input.anchor);
    backlogAgeSum += ingressDays;
    if (ingressDays > CONTROL_TOWER_LATE_INGRESS_DAYS) {
      lateIngressCount += lateIngressWeight(row, input.anchor, input.statiLavorazione);
    }
  }
  const backlogAvgAgeDays = openCount > 0 ? Math.round((backlogAgeSum / openCount) * 10) / 10 : 0;
  const slaLatePct = openCount > 0 ? Math.round((lateIngressCount / openCount) * 1000) / 10 : 0;

  const urgentFulfillment = computeUrgentFulfillmentStats({
    lavRows: input.lavRows,
    completate: bundle.completate,
    range: input.range,
    prevRange: input.prevRange,
    anchor: input.anchor,
  });

  const closed = countCompletedInRange(bundle.completate, input.range);
  const closedPrev = countCompletedInRange(bundle.completate, input.prevRange);
  const opened = countOpenedInRange(bundle.attive, bundle.storico, input.range);
  const openedPrev = countOpenedInRange(bundle.attive, bundle.storico, input.prevRange);

  const sottoCrit = computeSottoScortaCriticality(input.ricambi, input.magLog, input.anchor);
  const inactive = computeInactiveLavorazioniCriticality(
    input.lavRows,
    input.anchor,
    input.statiLavorazione,
  );

  const tsCur = timesheetTotals(input.timesheetEntries, input.range, input.tipiAssenza);
  const tsPrev = timesheetTotals(input.timesheetEntries, input.prevRange, input.tipiAssenza);
  const overtimePct =
    tsCur.totaleLavorato > 0
      ? Math.round((tsCur.oreStraordinarie / tsCur.totaleLavorato) * 1000) / 10
      : 0;
  const overtimePctPrev =
    tsPrev.totaleLavorato > 0
      ? Math.round((tsPrev.oreStraordinarie / tsPrev.totaleLavorato) * 1000) / 10
      : 0;

  const consumoCur = buildRicambiConsumoRanking([...input.magLog], [...input.ricambi], input.range, {
    limit: 100,
  });
  const consumoPrev = buildRicambiConsumoRanking([...input.magLog], [...input.ricambi], input.prevRange, {
    limit: 100,
  });

  const coverage = computeTimesheetCoverage(
    input.timesheetEntries,
    input.range,
    input.dipendentiAttivi,
  );
  const flags: string[] = [];
  if (coverage < 70) flags.push(`timesheet_coverage_${Math.round(coverage)}pct`);

  return {
    closed,
    closedPrev,
    opened,
    openedPrev,
    backlog,
    backlogAvgAgeDays,
    avgCloseDays: avgCloseDays(bundle.completate, input.range),
    avgCloseDaysPrev: avgCloseDays(bundle.completate, input.prevRange),
    urgentFulfillmentDays: urgentFulfillment.avgDays,
    urgentFulfillmentDaysPrev: urgentFulfillment.avgDaysPrev,
    urgentSampleSize: urgentFulfillment.sampleSize,
    slaLatePct,
    stockCritical: sottoScortaCount(input.ricambi),
    stockCriticalMaxDays: Math.round(sottoCrit.maxDays),
    magMovements: countMagMovements(input.magLog, input.range),
    magMovementsPrev: countMagMovements(input.magLog, input.prevRange),
    magEntrate: sumMagEntrate(input.magLog, input.range),
    magEntratePrev: sumMagEntrate(input.magLog, input.prevRange),
    magConsumi: consumoCur.reduce((s, r) => s + r.totalUscite, 0),
    magConsumiPrev: consumoPrev.reduce((s, r) => s + r.totalUscite, 0),
    hoursWorked: Math.round(tsCur.totaleLavorato * 10) / 10,
    hoursWorkedPrev: Math.round(tsPrev.totaleLavorato * 10) / 10,
    overtimePct,
    overtimePctPrev,
    absenceHours: Math.round(tsCur.oreAssenza * 10) / 10,
    absenceHoursPrev: Math.round(tsPrev.oreAssenza * 10) / 10,
    dipendentiAttivi: input.dipendentiAttivi,
    timesheetCoveragePct: coverage,
    preventiviEmessi: countPreventiviEmessi(input.preventivi, input.range),
    preventiviEmessiPrev: countPreventiviEmessi(input.preventivi, input.prevRange),
    fatturato: sumInvoiceAmount(input.invoices, input.range, "emesse"),
    fatturatoPrev: sumInvoiceAmount(input.invoices, input.prevRange, "emesse"),
    incassato: sumInvoiceAmount(input.invoices, input.range, "pagate"),
    incassatoPrev: sumInvoiceAmount(input.invoices, input.prevRange, "pagate"),
    inactiveLavorazioniCount: inactive.count,
    inactiveWeightedExcessDays: inactive.weightedExcessDays,
    lateIngressCount,
    openCount,
    mezziCount: input.mezziCount,
    dataQualityFlags: flags,
    lateIngressLavorazioneIds: collectLateIngressLavorazioneIds(attive, input.anchor),
    inactiveLavorazioneIds: collectInactiveLavorazioneIds(
      input.lavRows,
      input.anchor,
      input.statiLavorazione,
    ),
    stockCriticalRicambioIds: collectStockCriticalRicambioIds(
      input.ricambi,
      input.magLog,
      input.anchor,
    ),
  };
}
