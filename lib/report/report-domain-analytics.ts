import { buildDdtKpi } from "@/lib/ddt/ddt-calculations";
import type { OrdineFornitoreRecord } from "@/lib/ordini-fornitori/types";
import type { PreventivoRecord } from "@/lib/preventivi/types";
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
import { aggregateMagazzinoQtyByProductInRange } from "@/lib/report/magazzino-period-aggregate";
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
import type { DdtDocumentRow, InvoiceRow, MagazzinoRicambioRow } from "@/src/types/supabase-tables";
import type { LavorazioneSchedeStore } from "@/types/schede";

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
): { emesse: number; fatturato: number; scadute: number; daIncassare: number } {
  const todayYmd = new Date().toISOString().slice(0, 10);
  let emesse = 0;
  let fatturato = 0;
  let scadute = 0;
  let daIncassare = 0;
  for (const inv of invoices) {
    if (inv.status === "annullata") continue;
    if (inv.status !== "bozza" && inv.status !== "da_verificare" && isoInRange(inv.data_emissione, range)) {
      emesse += 1;
      fatturato = roundMoney(fatturato + inv.totale);
    }
    if (inv.residuo > 0) {
      daIncassare = roundMoney(daIncassare + inv.residuo);
      if (inv.data_scadenza != null && inv.data_scadenza < todayYmd) scadute += 1;
    }
  }
  return { emesse, fatturato, scadute, daIncassare };
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
    availableMetric("lav_open", "Aperte", fmtN(countInterventiAperti(attive))),
    comparedN("lav_completed", "Completate", completed, completedPrev, fmtN, cmpCtx),
    availableMetric("lav_archived", "Archiviate", fmtN(storico.length)),
    comparedN("lav_cancelled", "Annullate", cancelled, cancelledPrev, fmtN, cmpCtx),
    availableMetric("lav_backlog", "Backlog", fmtN(backlog)),
    avgClose > 0
      ? comparedN(
          "lav_avg_close",
          "Tempo medio chiusura",
          avgClose,
          avgClosePrev != null && avgClosePrev > 0 ? avgClosePrev : null,
          (n) => `${n} gg`,
          cmpCtx,
        )
      : metric("lav_avg_close", "Tempo medio chiusura", {
          status: "not_available",
          reason: "Non disponibile nel periodo selezionato",
        }),
    availableMetric("lav_late_sla", "Oltre SLA", fmtN(late)),
    comparedN("lav_clients", "Clienti serviti", clients, clientsPrev, fmtN, cmpCtx),
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
    comparedN("mag_parts_qty", "Ricambi utilizzati", partsUsedQty, partsUsedQtyPrev, fmtN, cmpCtx),
    comparedN("mag_movement_value", "Valore movimentato", movementValue, movementValuePrev, fmtEur, cmpCtx),
    availableMetric("mag_critical", "Sotto scorta", fmtN(critical)),
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
  totalHours: number;
  compareTotalHours?: number | null;
  costoOrario: number;
  magazzinoRows: readonly MagazzinoRicambioRow[];
};

export function buildLaborAnalytics(input: LaborAnalyticsBuildInput): LaborAnalyticsDto {
  const {
    range,
    compareRange,
    compareMode,
    completate,
    schedeStore,
    totalHours,
    compareTotalHours,
    costoOrario,
    magazzinoRows,
  } = input;
  const cmpCtx: CompareCtx = { range, compareRange, compareMode };
  const completed = countCompletedInRange(completate, range);
  const avgHours = completed > 0 && totalHours > 0 ? Math.round((totalHours / completed) * 10) / 10 : null;
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

  const metrics: ReportDomainMetric[] = [
    totalHours > 0
      ? comparedN(
          "ore_total",
          "Ore totali",
          totalHours,
          hoursPrev,
          (n) => `${n.toLocaleString("it-IT", { maximumFractionDigits: 1 })} h`,
          cmpCtx,
        )
      : metric("ore_total", "Ore totali", { status: "not_available", reason: "Non disponibile nel periodo selezionato" }),
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
  ];

  return { metrics, totalHours, completedJobs: completed, avgHoursPerJob: avgHours, manodoperaCost: manodopera };
}

export type EconomicDerivedHints = {
  completedInPeriod?: number | null;
  completedInPeriodPrev?: number | null;
  manodoperaCost?: number | null;
  movementValue?: number | null;
};

export type EconomicAnalyticsBuildInput = AnalyticsPublishBase & {
  range: DateRange;
  compareRange?: DateRange | null;
  compareMode?: ReportCompareMode;
  preventivi: readonly PreventivoRecord[];
  invoices: readonly InvoiceRow[];
  ddtDocuments: readonly DdtDocumentRow[];
  derivedHints?: EconomicDerivedHints;
};

function countPreventiviInRange(preventivi: readonly PreventivoRecord[], range: DateRange): { count: number; value: number } {
  let count = 0;
  let value = 0;
  for (const p of preventivi) {
    if (p.stato === "bozza") continue;
    const at = p.dataCreazione || p.aggiornatoAt;
    if (!isoInRange(at, range)) continue;
    count += 1;
    value = roundMoney(value + (p.totaleFinale ?? 0));
  }
  return { count, value };
}

function countPreventiviApprovatiInRange(
  preventivi: readonly PreventivoRecord[],
  range: DateRange,
): number {
  let count = 0;
  for (const p of preventivi) {
    if (p.stato !== "approvato" && p.stato !== "convertito") continue;
    const at = p.dataCreazione || p.aggiornatoAt;
    if (!isoInRange(at, range)) continue;
    count += 1;
  }
  return count;
}

export function buildEconomicAnalytics(input: EconomicAnalyticsBuildInput): EconomicAnalyticsDto {
  const { range, compareRange, compareMode, preventivi, invoices, ddtDocuments, derivedHints } = input;
  const cmpCtx: CompareCtx = { range, compareRange, compareMode };
  const prev = compareRange ? countPreventiviInRange(preventivi, compareRange) : null;
  const curPrev = countPreventiviInRange(preventivi, range);
  const preventiviCount = curPrev.count;
  const preventiviValue = curPrev.value;
  const inv = buildInvoicePeriodKpi(invoices, range);
  const ddtInRange = ddtDocuments.filter((d) => isoInRange(d.data_documento, range));
  const ddtKpi = buildDdtKpi(ddtInRange);
  const invPrev = compareRange ? buildInvoicePeriodKpi(invoices, compareRange) : null;
  const ddtPrev = compareRange
    ? buildDdtKpi(ddtDocuments.filter((d) => isoInRange(d.data_documento, compareRange)))
    : null;
  const approvati = countPreventiviApprovatiInRange(preventivi, range);
  const approvatiPrev = compareRange ? countPreventiviApprovatiInRange(preventivi, compareRange) : null;

  const metrics: ReportDomainMetric[] = [
    preventiviCount > 0
      ? (() => {
          const value = `${fmtN(preventiviCount)} · ${fmtEur(preventiviValue)}`;
          if (!prev || !compareRange || !compareMode || compareMode === "none") {
            return metric("eco_preventivi", "Preventivi", { status: "available", value });
          }
          const base = buildReportMetricCompare(
            preventiviCount,
            prev.count,
            range,
            compareRange,
            compareMode,
            fmtN,
          );
          return metric("eco_preventivi", "Preventivi", {
            status: "available",
            value,
            compare: { ...base, value: `${fmtN(prev.count)} · ${fmtEur(prev.value)}` },
          });
        })()
      : metric("eco_preventivi", "Preventivi", { status: "not_available", reason: "Non disponibile nel periodo selezionato" }),
    inv.fatturato > 0 || inv.emesse > 0
      ? (() => {
          const value = `${fmtN(inv.emesse)} · ${fmtEur(inv.fatturato)}`;
          if (!invPrev || !compareRange || !compareMode || compareMode === "none") {
            return metric("eco_invoices", "Fatturato", { status: "available", value });
          }
          const base = buildReportMetricCompare(
            inv.fatturato,
            invPrev.fatturato,
            range,
            compareRange,
            compareMode,
            fmtEur,
          );
          return metric("eco_invoices", "Fatturato", {
            status: "available",
            value,
            compare: { ...base, value: `${fmtN(invPrev.emesse)} · ${fmtEur(invPrev.fatturato)}` },
          });
        })()
      : metric("eco_invoices", "Fatturato", { status: "not_available", reason: "Non disponibile nel periodo selezionato" }),
    ddtKpi.totale > 0
      ? comparedN("eco_ddt", "DDT", ddtKpi.totale, ddtPrev?.totale ?? null, fmtN, cmpCtx)
      : metric("eco_ddt", "DDT", { status: "not_available", reason: "Non disponibile nel periodo selezionato" }),
    approvati > 0
      ? comparedN("eco_preventivi_approvati", "Preventivi approvati", approvati, approvatiPrev, fmtN, cmpCtx)
      : metric("eco_preventivi_approvati", "Preventivi approvati", {
          status: "not_available",
          reason: "Non disponibile nel periodo selezionato",
        }),
  ];

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
        hint: "Apri Lavorazioni per calcolare",
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

  const manodopera = derivedHints?.manodoperaCost ?? null;
  const movement = derivedHints?.movementValue ?? null;
  if (inv.fatturato > 0 && manodopera != null && movement != null) {
    const margine = roundMoney(inv.fatturato - (manodopera + movement));
    metrics.push(availableMetric("eco_margine_operativo_stimato", "Margine operativo stimato", fmtEur(margine)));
  } else if (manodopera == null || movement == null) {
    metrics.push(
      metric("eco_margine_operativo_stimato", "Margine operativo stimato", {
        status: "not_loaded",
        hint: "Apri Lavorazioni, Ore e Magazzino per calcolare",
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

export function buildCrossAnalytics(derived: ReportAnalyticsDerivedSnapshot): CrossAnalyticsDto {
  const op = derived.operational?.data;
  const wh = derived.warehouse?.data;
  const lab = derived.labor?.data;
  const eco = derived.economic?.data;

  const metrics: ReportDomainMetric[] = [];

  if (!op || !lab) {
    metrics.push(
      metric("cross_efficiency", "Efficienza", {
        status: "not_loaded",
        hint: "Apri Lavorazioni e Ore lavorate per calcolare",
      }),
    );
  } else if (lab.totalHours <= 0 || op.completedInPeriod <= 0) {
    metrics.push(
      metric("cross_efficiency", "Efficienza", {
        status: "not_available",
        reason: "Dati insufficienti per il calcolo",
      }),
    );
  } else {
    const eff = Math.round((op.completedInPeriod / lab.totalHours) * 100) / 100;
    metrics.push(availableMetric("cross_efficiency", "Efficienza (interventi/ore)", fmtN(eff)));
  }

  if (!wh || !op) {
    metrics.push(
      metric("cross_parts_job", "Ricambi/intervento", {
        status: "not_loaded",
        hint: "Apri Magazzino e Lavorazioni per calcolare",
      }),
    );
  } else if (op.completedInPeriod <= 0) {
    metrics.push(
      metric("cross_parts_job", "Ricambi/intervento", {
        status: "not_available",
        reason: "Nessuna lavorazione completata nel periodo",
      }),
    );
  } else {
    const perJob = Math.round((wh.partsUsedQty / op.completedInPeriod) * 10) / 10;
    metrics.push(availableMetric("cross_parts_job", "Ricambi/intervento", fmtN(perJob)));
  }

  const ricambiCost = wh?.movementValue ?? 0;
  const manodoperaCost = lab?.manodoperaCost ?? 0;
  if (!op || op.completedInPeriod <= 0) {
    metrics.push(
      metric("cross_cost_job", "Costo medio lavorazione", op
        ? { status: "not_available", reason: "Nessuna lavorazione completata nel periodo" }
        : { status: "not_loaded", hint: "Apri Lavorazioni per calcolare" }),
    );
  } else {
    const costPerJob = Math.round(((ricambiCost + manodoperaCost) / op.completedInPeriod) * 100) / 100;
    metrics.push(availableMetric("cross_cost_job", "Costo medio lavorazione", fmtEur(costPerJob)));
  }

  if (!eco || !lab) {
    metrics.push(
      metric("cross_value_hour", "Valore/ora", {
        status: "not_loaded",
        hint: "Apri Dati economici e Ore lavorate per calcolare",
      }),
    );
  } else if (lab.totalHours <= 0 || eco.invoicesBilled <= 0) {
    metrics.push(
      metric("cross_value_hour", "Valore/ora", {
        status: "not_available",
        reason: "Non disponibile nel periodo selezionato",
      }),
    );
  } else {
    const vph = Math.round((eco.invoicesBilled / lab.totalHours) * 100) / 100;
    metrics.push(availableMetric("cross_value_hour", "Valore/ora", fmtEur(vph)));
  }

  return { metrics };
}
