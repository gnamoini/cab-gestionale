import { buildDdtKpi } from "@/lib/ddt/ddt-calculations";
import type { OrdineFornitoreRecord } from "@/lib/ordini-fornitori/types";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import { isPreventivoCountedInEconomicStats } from "@/lib/preventivi/preventivo-stats-eligibility";
import { roundMoney } from "@/lib/fatturazione/invoice-calculations";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import {
  avgCloseDays,
  countCompletedInRange,
  countOpenedInRange,
  uniqueClientiNelPeriodo,
} from "@/lib/report/lavorazioni-report-selectors";
import { isoInRange, type DateRange, type ReportCompareMode } from "@/lib/report/date-ranges";
import { metricComparedNumber, buildReportMetricCompare } from "@/lib/report/report-metric-compare";
import {
  countInterventiAperti,
  countInterventiInRitardo,
  sottoScortaCount,
  sumManodoperaCostFromSchede,
  sumRicambiCostFromMagLog,
} from "@/lib/report/kpi-performance/kpi-performance-formulas";
import {
  buildInvoicePeriodKpiExtended,
  buildResiduoDaFatturare,
} from "@/lib/report/economic-analytics-extended";
import { aggregateMagazzinoQtyByProductInRange } from "@/lib/report/magazzino-period-aggregate";
import { crossDtoToLegacyCrossAnalytics } from "@/lib/report/cross-analysis/cross-legacy-adapter";
import type {
  AnalyticsPublishBase,
  CrossAnalyticsDto,
  EconomicAnalyticsDto,
  LaborAnalyticsDto,
  OperationalAnalyticsDto,
  ReportAnalyticsDerivedSnapshot,
  ReportDomainMetric,
  ReportMetricState,
  WarehouseAnalyticsDto,
} from "@/lib/report/report-domain-types";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { DdtDocumentRow, InvoicePaymentRow, InvoiceRow, MagazzinoRicambioRow, PreventivoBillingStatusRow } from "@/src/types/supabase-tables";
import { aggregateOrePerDipendente } from "@/lib/report/timesheet-ore-ranking";
import { sumActualLaborHoursInRange } from "@/lib/analytics/hours/sum-actual-labor-hours-in-range";
import type { DipendenteTimesheetEmployeeRow, DipendenteTimesheetEntryRow } from "@/lib/dipendenti/types";
import type { LavorazioneSchedeStore } from "@/types/schede";
import {
  computeGapSchedeTimesheetPct,
  computeLaborComposition,
  computeTeamSaturation,
  countEmployeesWithoutHours,
  sumOreFromSchedeInRange,
} from "@/lib/report/labor-analytics";
import {
  computeCrossEfficiency,
  computeCrossValueHour,
} from "@/lib/report/cross-analysis/build-report-cross-dto";
import type { CrossFormulaInput } from "@/lib/report/cross-analysis/types";

function fmtN(n: number): string {
  return n.toLocaleString("it-IT");
}

function fmtEur(n: number): string {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function metric(id: string, label: string, state: ReportMetricState): ReportDomainMetric {
  return { id, label, state };
}

function availableMetric(id: string, label: string, value: string): ReportDomainMetric {
  return metric(id, label, { status: "available", value });
}

type CompareCtx = {
  range: DateRange;
  compareRange?: DateRange | null;
  compareMode?: ReportCompareMode;
};

function comparedN(
  id: string,
  label: string,
  cur: number,
  prev: number | null,
  fmt: (n: number) => string,
  ctx: CompareCtx,
): ReportDomainMetric {
  return metricComparedNumber(
    id,
    label,
    cur,
    prev,
    fmt,
    ctx.range,
    ctx.compareRange,
    ctx.compareMode,
  );
}

export function countAnnullateInRange(rows: readonly LavorazioneListRow[], range: DateRange): number {
  let n = 0;
  for (const r of rows) {
    if (r.stato !== "annullata") continue;
    const at = r.data_ingresso?.trim() || r.created_at;
    if (isoInRange(at, range)) n += 1;
  }
  return n;
}

export function buildInvoicePeriodKpi(
  invoices: readonly InvoiceRow[],
  range: DateRange,
  payments: readonly InvoicePaymentRow[] = [],
): {
  emesse: number;
  fatturato: number;
  incassato: number;
  scadute: number;
  importoScaduto: number;
  daIncassare: number;
} {
  return buildInvoicePeriodKpiExtended(invoices, payments, range);
}

export type OperationalAnalyticsBuildInput = AnalyticsPublishBase & {
  range: DateRange;
  compareRange?: DateRange | null;
  compareMode?: ReportCompareMode;
  attive: LavorazioneAttiva[];
  storico: LavorazioneArchiviata[];
  completate: LavorazioneArchiviata[];
  lavRows: readonly LavorazioneListRow[];
  manualByMonth?: Map<string, number>;
};

export function buildOperationalAnalytics(input: OperationalAnalyticsBuildInput): OperationalAnalyticsDto {
  const { range, compareRange, compareMode, attive, storico, completate, lavRows, manualByMonth } = input;
  const cmpCtx: CompareCtx = { range, compareRange, compareMode };
  const completed = countCompletedInRange(completate, range, manualByMonth);
  const opened = countOpenedInRange(attive, storico, range);
  const cancelled = countAnnullateInRange(lavRows, range);
  const backlog = countInterventiAperti(attive);
  const avgClose = avgCloseDays(completate, range);
  const late = countInterventiInRitardo(attive, new Date());
  const clients = uniqueClientiNelPeriodo(attive, storico, completate, range);

  const prevRange = compareRange ?? null;
  const completedPrev = prevRange ? countCompletedInRange(completate, prevRange, manualByMonth) : null;
  const openedPrev = prevRange ? countOpenedInRange(attive, storico, prevRange) : null;
  const cancelledPrev = prevRange ? countAnnullateInRange(lavRows, prevRange) : null;
  const clientsPrev = prevRange ? uniqueClientiNelPeriodo(attive, storico, completate, prevRange) : null;
  const avgClosePrev = prevRange ? avgCloseDays(completate, prevRange) : null;

  const metrics: ReportDomainMetric[] = [
    comparedN("lav-chiusi", "Chiusure periodo", completed, completedPrev, fmtN, cmpCtx),
    comparedN("lav-periodo", "Carico periodo (ingressi)", opened, openedPrev, fmtN, cmpCtx),
    availableMetric("lav-aperti", "Interventi aperti", fmtN(backlog)),
    avgClose > 0
      ? comparedN(
          "lav-tempo",
          "Tempo medio chiusura",
          avgClose,
          avgClosePrev != null && avgClosePrev > 0 ? avgClosePrev : null,
          (n) => `${n} gg`,
          cmpCtx,
        )
      : metric("lav-tempo", "Tempo medio chiusura", {
          status: "not_available",
          reason: "Non disponibile nel periodo selezionato",
        }),
    availableMetric("lav_late_sla", "Oltre SLA", fmtN(late)),
    comparedN("clienti", "Clienti nel periodo", clients, clientsPrev, fmtN, cmpCtx),
    comparedN("lav_cancelled", "Annullate", cancelled, cancelledPrev, fmtN, cmpCtx),
  ];

  return {
    metrics,
    openedInPeriod: opened,
    completedInPeriod: completed,
    archivedTotal: storico.length,
    cancelledInPeriod: cancelled,
    backlog,
    avgCloseDays: avgClose > 0 ? avgClose : null,
    lateCount: late,
    clientsServed: clients,
  };
}

export type WarehouseAnalyticsBuildInput = AnalyticsPublishBase & {
  range: DateRange;
  compareRange?: DateRange | null;
  compareMode?: ReportCompareMode;
  magLog: MagazzinoChangeLogEntry[];
  magazzino: RicambioMagazzino[];
  magazzinoRows: MagazzinoRicambioRow[];
  ordini?: readonly OrdineFornitoreRecord[];
};

export function buildWarehouseAnalytics(input: WarehouseAnalyticsBuildInput): WarehouseAnalyticsDto {
  const { range, compareRange, compareMode, magLog, magazzino, magazzinoRows, ordini = [] } = input;
  const cmpCtx: CompareCtx = { range, compareRange, compareMode };
  const agg = aggregateMagazzinoQtyByProductInRange(magLog, range);
  let partsUsedQty = 0;
  for (const v of agg.values()) partsUsedQty += v.uscite;
  const movementValue = sumRicambiCostFromMagLog(magLog, magazzino, range);
  const critical = sottoScortaCount(magazzino);
  let ordersCount = 0;
  for (const o of ordini) {
    if (isoInRange(o.dataOrdine, range) && o.status !== "annullato") ordersCount += 1;
  }

  const prevRange = compareRange ?? null;
  let partsUsedQtyPrev: number | null = null;
  let movementValuePrev: number | null = null;
  let ordersCountPrev: number | null = null;
  if (prevRange) {
    const aggPrev = aggregateMagazzinoQtyByProductInRange(magLog, prevRange);
    partsUsedQtyPrev = 0;
    for (const v of aggPrev.values()) partsUsedQtyPrev += v.uscite;
    movementValuePrev = sumRicambiCostFromMagLog(magLog, magazzino, prevRange);
    ordersCountPrev = 0;
    for (const o of ordini) {
      if (isoInRange(o.dataOrdine, prevRange) && o.status !== "annullato") ordersCountPrev += 1;
    }
  }

  const metrics: ReportDomainMetric[] = [
    comparedN("mag_movement_value", "Valore movimentato", movementValue, movementValuePrev, fmtEur, cmpCtx),
    comparedN("mag_orders", "Ordini fornitori", ordersCount, ordersCountPrev, fmtN, cmpCtx),
  ];

  return { metrics, partsUsedQty, movementValue, criticalStockCount: critical, ordersCount };
}

export type LaborAnalyticsBuildInput = AnalyticsPublishBase & {
  range: DateRange;
  compareRange?: DateRange | null;
  compareMode?: ReportCompareMode;
  completate: LavorazioneArchiviata[];
  schedeStore: LavorazioneSchedeStore | null;
  lavListRows?: readonly LavorazioneListRow[];
  totalHours: number;
  compareTotalHours?: number | null;
  costoOrario: number;
  magazzinoRows: readonly MagazzinoRicambioRow[];
  timesheetEntries?: readonly DipendenteTimesheetEntryRow[];
  timesheetEmployees?: readonly DipendenteTimesheetEmployeeRow[];
  invoicesBilled?: number;
  partsUsedQty?: number;
  movementValue?: number;
};

export function buildLaborAnalytics(input: LaborAnalyticsBuildInput): LaborAnalyticsDto {
  const {
    range,
    compareRange,
    compareMode,
    completate,
    schedeStore,
    lavListRows = [],
    totalHours,
    compareTotalHours,
    costoOrario,
    magazzinoRows,
    timesheetEntries = [],
    timesheetEmployees = [],
    invoicesBilled = 0,
    partsUsedQty = 0,
    movementValue = 0,
  } = input;
  const cmpCtx: CompareCtx = { range, compareRange, compareMode };
  const completed = countCompletedInRange(completate, range);
  const avgHours = completed > 0 && totalHours > 0 ? Math.round((totalHours / completed) * 10) / 10 : null;
  const composition = computeLaborComposition(timesheetEntries);
  const employeesWithHours = aggregateOrePerDipendente(timesheetEntries, timesheetEmployees).length;
  const saturation = computeTeamSaturation(totalHours, employeesWithHours, range);
  const schedeHours = sumOreFromSchedeInRange(completate, range, schedeStore);
  const actualLaborHours = sumActualLaborHoursInRange(completate, range, lavListRows);
  const gapPct = computeGapSchedeTimesheetPct(totalHours, actualLaborHours > 0 ? actualLaborHours : schedeHours);
  const missingEmployees = countEmployeesWithoutHours(timesheetEmployees, timesheetEntries);
  const { manodopera } = sumManodoperaCostFromSchede(
    completate,
    range,
    schedeStore,
    costoOrario,
    magazzinoRows,
  );

  const prevRange = compareRange ?? null;
  const completedPrev = prevRange ? countCompletedInRange(completate, prevRange) : null;
  const hoursPrev = prevRange && compareTotalHours != null ? compareTotalHours : null;
  const avgHoursPrev =
    completedPrev != null && completedPrev > 0 && hoursPrev != null && hoursPrev > 0
      ? Math.round((hoursPrev / completedPrev) * 10) / 10
      : null;

  const avgActualHours =
    completed > 0 && actualLaborHours > 0
      ? Math.round((actualLaborHours / completed) * 10) / 10
      : null;

  const metrics: ReportDomainMetric[] = [
    totalHours > 0
      ? comparedN(
          "presence_hours_total",
          "Ore presenza",
          totalHours,
          hoursPrev,
          (n) => `${n.toLocaleString("it-IT", { maximumFractionDigits: 1 })} h`,
          cmpCtx,
        )
      : metric("presence_hours_total", "Ore presenza", {
          status: "not_available",
          reason: "Non disponibile nel periodo selezionato",
        }),
    actualLaborHours > 0
      ? availableMetric(
          "actual_labor_hours_total",
          "Ore consuntive",
          `${actualLaborHours.toLocaleString("it-IT", { maximumFractionDigits: 1 })} h`,
        )
      : metric("actual_labor_hours_total", "Ore consuntive", {
          status: "not_available",
          reason: "Nessun consuntivo nel periodo",
        }),
    avgHours != null
      ? comparedN(
          "ore_per_job",
          "Media ore/intervento",
          avgHours,
          avgHoursPrev,
          (n) => `${n} h`,
          cmpCtx,
        )
      : metric("ore_per_job", "Media ore/intervento", {
          status: "not_available",
          reason: "Dati insufficienti per il calcolo",
        }),
    avgActualHours != null
      ? availableMetric(
          "actual_hours_per_job",
          "Media ore consuntive/intervento",
          `${avgActualHours} h`,
        )
      : metric("actual_hours_per_job", "Media ore consuntive/intervento", {
          status: "not_available",
          reason: "Dati insufficienti per il calcolo",
        }),
  ];

  if (composition.oreStraordinarie > 0) {
    metrics.push(
      availableMetric(
        "ore_straordinari",
        "Ore straordinarie",
        `${composition.oreStraordinarie.toLocaleString("it-IT", { maximumFractionDigits: 1 })} h`,
      ),
    );
  }
  if (composition.overtimePct != null) {
    metrics.push(availableMetric("ore_straordinari_pct", "% Straordinari", `${composition.overtimePct}%`));
  }
  if (composition.oreAssenza > 0) {
    metrics.push(
      availableMetric(
        "ore_assenze",
        "Ore assenza",
        `${composition.oreAssenza.toLocaleString("it-IT", { maximumFractionDigits: 1 })} h`,
      ),
    );
  }

  if (manodopera > 0) {
    metrics.push(availableMetric("manodopera_cost", "Costo manodopera", fmtEur(manodopera)));
  } else if (!schedeStore) {
    metrics.push(
      metric("manodopera_cost", "Costo manodopera", {
        status: "not_loaded",
        hint: "Schede in caricamento",
      }),
    );
  } else {
    metrics.push(
      metric("manodopera_cost", "Costo manodopera", {
        status: "not_available",
        reason: "Non disponibile nel periodo selezionato",
      }),
    );
  }

  if (saturation != null) {
    metrics.push(availableMetric("saturazione_team", "Saturazione team", `${saturation}%`));
  }
  if (gapPct != null) {
    metrics.push(availableMetric("gap_schede_timesheet", "Gap consuntivo/presenza", `${gapPct}%`));
  }

  const crossInput: CrossFormulaInput = {
    operational: { completedInPeriod: completed },
    warehouse: { partsUsedQty, movementValue },
    labor: { totalHours, actualLaborHours, manodoperaCost: manodopera },
    economic: { invoicesBilled },
  };
  const efficiencyResult = computeCrossEfficiency(crossInput);
  const valueHourResult = computeCrossValueHour(crossInput);
  if (efficiencyResult.status === "available" && efficiencyResult.value > 0) {
    metrics.push(availableMetric("cross_efficiency", "Efficienza officina", fmtN(efficiencyResult.value)));
  }
  if (valueHourResult.status === "available" && valueHourResult.value > 0) {
    metrics.push(availableMetric("cross_value_hour", "Valore per ora", fmtEur(valueHourResult.value)));
  }

  void missingEmployees;

  return {
    metrics,
    totalHours,
    actualLaborHours,
    completedJobs: completed,
    avgHoursPerJob: avgHours,
    actualHoursPerJob: avgActualHours,
    manodoperaCost: manodopera,
  };
}

export type EconomicDerivedHints = {
  completedInPeriod?: number | null;
  completedInPeriodPrev?: number | null;
  manodoperaCost?: number | null;
  movementValue?: number | null;
  billingResiduo?: number | null;
};

export type EconomicAnalyticsBuildInput = AnalyticsPublishBase & {
  range: DateRange;
  compareRange?: DateRange | null;
  compareMode?: ReportCompareMode;
  preventivi: readonly PreventivoRecord[];
  invoices: readonly InvoiceRow[];
  invoicePayments?: readonly InvoicePaymentRow[];
  preventiviBilling?: readonly PreventivoBillingStatusRow[];
  ddtDocuments: readonly DdtDocumentRow[];
  derivedHints?: EconomicDerivedHints;
};

function countPreventiviInRange(preventivi: readonly PreventivoRecord[], range: DateRange): { count: number; value: number } {
  let count = 0;
  let value = 0;
  for (const p of preventivi) {
    if (p.statoWorkflow === "bozza") continue;
    const at = p.dataCreazione || p.aggiornatoAt;
    if (!isoInRange(at, range)) continue;
    count += 1;
    if (isPreventivoCountedInEconomicStats(p)) {
      value = roundMoney(value + (p.totaleFinale ?? 0));
    }
  }
  return { count, value };
}

function countPreventiviApprovatiInRange(
  preventivi: readonly PreventivoRecord[],
  range: DateRange,
): number {
  let count = 0;
  for (const p of preventivi) {
    if (!isPreventivoCountedInEconomicStats(p)) continue;
    const at = p.dataCreazione || p.aggiornatoAt;
    if (!isoInRange(at, range)) continue;
    count += 1;
  }
  return count;
}

export function buildEconomicAnalytics(input: EconomicAnalyticsBuildInput): EconomicAnalyticsDto {
  const {
    range,
    compareRange,
    compareMode,
    preventivi,
    invoices,
    invoicePayments = [],
    preventiviBilling = [],
    ddtDocuments,
    derivedHints,
  } = input;
  const cmpCtx: CompareCtx = { range, compareRange, compareMode };
  const prev = compareRange ? countPreventiviInRange(preventivi, compareRange) : null;
  const curPrev = countPreventiviInRange(preventivi, range);
  const preventiviCount = curPrev.count;
  const preventiviValue = curPrev.value;
  const inv = buildInvoicePeriodKpi(invoices, range, invoicePayments);
  const invPrev = compareRange ? buildInvoicePeriodKpi(invoices, compareRange, invoicePayments) : null;
  const ddtInRange = ddtDocuments.filter((d) => isoInRange(d.data_documento, range));
  const ddtKpi = buildDdtKpi(ddtInRange);

  const tassoIncasso =
    inv.fatturato > 0 ? Math.round((inv.incassato / inv.fatturato) * 1000) / 10 : null;
  const tassoIncassoPrev =
    invPrev && invPrev.fatturato > 0
      ? Math.round((invPrev.incassato / invPrev.fatturato) * 1000) / 10
      : null;

  const manodopera = derivedHints?.manodoperaCost ?? null;
  const movement = derivedHints?.movementValue ?? null;
  const marginePct =
    inv.fatturato > 0 && manodopera != null && movement != null
      ? Math.round(((inv.fatturato - (manodopera + movement)) / inv.fatturato) * 1000) / 10
      : null;

  const billingResiduo =
    derivedHints?.billingResiduo ?? (preventiviBilling.length > 0 ? buildResiduoDaFatturare(preventiviBilling) : null);

  const metrics: ReportDomainMetric[] = [];

  if (inv.fatturato > 0 || inv.emesse > 0) {
    const value = fmtEur(inv.fatturato);
    if (!invPrev || !compareRange || !compareMode || compareMode === "none") {
      metrics.push(metric("eco_invoices", "Fatturato", { status: "available", value }));
    } else {
      const base = buildReportMetricCompare(
        inv.fatturato,
        invPrev.fatturato,
        range,
        compareRange,
        compareMode,
        fmtEur,
      );
      metrics.push(
        metric("eco_invoices", "Fatturato", {
          status: "available",
          value,
          compare: { ...base, value: fmtEur(invPrev.fatturato) },
        }),
      );
    }
  } else {
    metrics.push(
      metric("eco_invoices", "Fatturato", {
        status: "not_available",
        reason: "Non disponibile nel periodo selezionato",
      }),
    );
  }

  if (inv.incassato > 0) {
    metrics.push(
      invPrev
        ? comparedN("eco_incassato", "Incassato", inv.incassato, invPrev.incassato, fmtEur, cmpCtx)
        : availableMetric("eco_incassato", "Incassato", fmtEur(inv.incassato)),
    );
  } else {
    metrics.push(availableMetric("eco_incassato", "Incassato", fmtEur(0)));
  }

  metrics.push(
    inv.daIncassare > 0
      ? availableMetric("eco_da_incassare", "Da incassare", fmtEur(inv.daIncassare))
      : metric("eco_da_incassare", "Da incassare", { status: "available", value: fmtEur(0) }),
  );

  if (marginePct != null) {
    metrics.push(availableMetric("eco_margine_pct", "Margine %", `${marginePct}%`));
  } else if (manodopera == null || movement == null) {
    metrics.push(
      metric("eco_margine_pct", "Margine %", {
        status: "not_loaded",
        hint: "Calcolo costi in corso…",
      }),
    );
  } else {
    metrics.push(
      metric("eco_margine_pct", "Margine %", {
        status: "not_available",
        reason: "Non disponibile nel periodo selezionato",
      }),
    );
  }

  if (tassoIncasso != null) {
    metrics.push(
      comparedN(
        "eco_tasso_incasso",
        "Tasso incasso",
        tassoIncasso,
        tassoIncassoPrev,
        (n) => `${n}%`,
        cmpCtx,
      ),
    );
  }

  if (preventiviCount > 0) {
    const value = `${fmtN(preventiviCount)} · ${fmtEur(preventiviValue)}`;
    if (!prev || !compareRange || !compareMode || compareMode === "none") {
      metrics.push(metric("eco_preventivi", "Preventivi", { status: "available", value }));
    } else {
      const base = buildReportMetricCompare(
        preventiviCount,
        prev.count,
        range,
        compareRange,
        compareMode,
        fmtN,
      );
      metrics.push(
        metric("eco_preventivi", "Preventivi", {
          status: "available",
          value,
          compare: { ...base, value: `${fmtN(prev.count)} · ${fmtEur(prev.value)}` },
        }),
      );
    }
  } else {
    metrics.push(
      metric("eco_preventivi", "Preventivi", {
        status: "not_available",
        reason: "Non disponibile nel periodo selezionato",
      }),
    );
  }

  const scaduteValue =
    inv.scadute > 0 ? `${fmtN(inv.scadute)} · ${fmtEur(inv.importoScaduto)}` : "0";
  metrics.push(availableMetric("eco_scadute", "Fatture scadute", scaduteValue));

  if (billingResiduo != null && billingResiduo > 0) {
    metrics.push(availableMetric("eco_residuo_da_fatturare", "Residuo da fatturare", fmtEur(billingResiduo)));
  } else if (billingResiduo === null) {
    metrics.push(
      metric("eco_residuo_da_fatturare", "Residuo da fatturare", {
        status: "not_loaded",
        hint: "Caricamento pipeline fatturazione…",
      }),
    );
  } else {
    metrics.push(availableMetric("eco_residuo_da_fatturare", "Residuo da fatturare", fmtEur(0)));
  }

  const completed = derivedHints?.completedInPeriod ?? null;
  const completedPrev = derivedHints?.completedInPeriodPrev ?? null;
  if (completed != null && completed > 0 && inv.fatturato > 0) {
    const avg = Math.round((inv.fatturato / completed) * 100) / 100;
    const avgPrev =
      completedPrev != null && completedPrev > 0 && invPrev
        ? Math.round((invPrev.fatturato / completedPrev) * 100) / 100
        : null;
    metrics.push(
      comparedN("eco_valore_medio_intervento", "Valore medio intervento", avg, avgPrev, fmtEur, cmpCtx),
    );
  } else if (completed == null) {
    metrics.push(
      metric("eco_valore_medio_intervento", "Valore medio intervento", {
        status: "not_loaded",
        hint: "Calcolo in corso…",
      }),
    );
  } else {
    metrics.push(
      metric("eco_valore_medio_intervento", "Valore medio intervento", {
        status: "not_available",
        reason: "Non disponibile nel periodo selezionato",
      }),
    );
  }

  if (inv.fatturato > 0 && manodopera != null && movement != null) {
    const margine = roundMoney(inv.fatturato - (manodopera + movement));
    metrics.push(availableMetric("eco_margine_operativo_stimato", "Margine operativo stimato", fmtEur(margine)));
  } else if (manodopera == null || movement == null) {
    metrics.push(
      metric("eco_margine_operativo_stimato", "Margine operativo stimato", {
        status: "not_loaded",
        hint: "Calcolo costi in corso…",
      }),
    );
  } else {
    metrics.push(
      metric("eco_margine_operativo_stimato", "Margine operativo stimato", {
        status: "not_available",
        reason: "Non disponibile nel periodo selezionato",
      }),
    );
  }

  return {
    metrics,
    preventiviCount,
    preventiviValue,
    invoicesBilled: inv.fatturato,
    ddtCount: ddtKpi.totale,
  };
}

/**
 * @deprecated Use buildReportCrossDto via analytics bundle. Removal Sprint 4+.
 */
export function buildCrossAnalytics(derived: ReportAnalyticsDerivedSnapshot): CrossAnalyticsDto {
  return crossDtoToLegacyCrossAnalytics(derived);
}
