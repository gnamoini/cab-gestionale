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
import { isoInRange, type DateRange } from "@/lib/report/date-ranges";
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
  attive: LavorazioneAttiva[];
  storico: LavorazioneArchiviata[];
  completate: LavorazioneArchiviata[];
  lavRows: readonly LavorazioneListRow[];
  manualByMonth?: Map<string, number>;
};

export function buildOperationalAnalytics(input: OperationalAnalyticsBuildInput): OperationalAnalyticsDto {
  const { range, attive, storico, completate, lavRows, manualByMonth } = input;
  const completed = countCompletedInRange(completate, range, manualByMonth);
  const opened = countOpenedInRange(attive, storico, range);
  const cancelled = countAnnullateInRange(lavRows, range);
  const backlog = countInterventiAperti(attive);
  const avgClose = avgCloseDays(completate, range);
  const late = countInterventiInRitardo(attive, new Date());
  const clients = uniqueClientiNelPeriodo(attive, storico, completate, range);

  const metrics: ReportDomainMetric[] = [
    availableMetric("lav_open", "Aperte", fmtN(countInterventiAperti(attive))),
    availableMetric("lav_completed", "Completate", fmtN(completed)),
    availableMetric("lav_archived", "Archiviate", fmtN(storico.length)),
    availableMetric("lav_cancelled", "Annullate", fmtN(cancelled)),
    availableMetric("lav_backlog", "Backlog", fmtN(backlog)),
    avgClose > 0
      ? availableMetric("lav_avg_close", "Tempo medio chiusura", `${avgClose} gg`)
      : metric("lav_avg_close", "Tempo medio chiusura", {
          status: "not_available",
          reason: "Non disponibile nel periodo selezionato",
        }),
    availableMetric("lav_late_sla", "Oltre SLA", fmtN(late)),
    availableMetric("lav_clients", "Clienti serviti", fmtN(clients)),
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
  magLog: MagazzinoChangeLogEntry[];
  magazzino: RicambioMagazzino[];
  magazzinoRows: MagazzinoRicambioRow[];
  ordini?: readonly OrdineFornitoreRecord[];
};

export function buildWarehouseAnalytics(input: WarehouseAnalyticsBuildInput): WarehouseAnalyticsDto {
  const { range, magLog, magazzino, magazzinoRows, ordini = [] } = input;
  const agg = aggregateMagazzinoQtyByProductInRange(magLog, range);
  let partsUsedQty = 0;
  for (const v of agg.values()) partsUsedQty += v.uscite;
  const movementValue = sumRicambiCostFromMagLog(magLog, magazzino, range);
  const critical = sottoScortaCount(magazzino);
  let ordersCount = 0;
  for (const o of ordini) {
    if (isoInRange(o.dataOrdine, range) && o.status !== "annullato") ordersCount += 1;
  }

  const metrics: ReportDomainMetric[] = [
    availableMetric("mag_parts_qty", "Ricambi utilizzati", fmtN(partsUsedQty)),
    availableMetric("mag_movement_value", "Valore movimentato", fmtEur(movementValue)),
    availableMetric("mag_critical", "Sotto scorta", fmtN(critical)),
    availableMetric("mag_orders", "Ordini fornitori", fmtN(ordersCount)),
  ];

  return { metrics, partsUsedQty, movementValue, criticalStockCount: critical, ordersCount };
}

export type LaborAnalyticsBuildInput = AnalyticsPublishBase & {
  range: DateRange;
  completate: LavorazioneArchiviata[];
  schedeStore: LavorazioneSchedeStore | null;
  totalHours: number;
  costoOrario: number;
  magazzinoRows: readonly MagazzinoRicambioRow[];
};

export function buildLaborAnalytics(input: LaborAnalyticsBuildInput): LaborAnalyticsDto {
  const { range, completate, schedeStore, totalHours, costoOrario, magazzinoRows } = input;
  const completed = countCompletedInRange(completate, range);
  const avgHours = completed > 0 && totalHours > 0 ? Math.round((totalHours / completed) * 10) / 10 : null;
  const { manodopera } = sumManodoperaCostFromSchede(
    completate,
    range,
    schedeStore,
    costoOrario,
    magazzinoRows,
  );

  const metrics: ReportDomainMetric[] = [
    totalHours > 0
      ? availableMetric("ore_total", "Ore totali", `${totalHours.toLocaleString("it-IT", { maximumFractionDigits: 1 })} h`)
      : metric("ore_total", "Ore totali", { status: "not_available", reason: "Non disponibile nel periodo selezionato" }),
    avgHours != null
      ? availableMetric("ore_per_job", "Media ore/intervento", `${avgHours} h`)
      : metric("ore_per_job", "Media ore/intervento", {
          status: "not_available",
          reason: "Dati insufficienti per il calcolo",
        }),
  ];

  return { metrics, totalHours, completedJobs: completed, avgHoursPerJob: avgHours, manodoperaCost: manodopera };
}

export type EconomicAnalyticsBuildInput = AnalyticsPublishBase & {
  range: DateRange;
  preventivi: readonly PreventivoRecord[];
  invoices: readonly InvoiceRow[];
  ddtDocuments: readonly DdtDocumentRow[];
};

export function buildEconomicAnalytics(input: EconomicAnalyticsBuildInput): EconomicAnalyticsDto {
  const { range, preventivi, invoices, ddtDocuments } = input;
  let preventiviCount = 0;
  let preventiviValue = 0;
  for (const p of preventivi) {
    if (p.stato === "bozza") continue;
    const at = p.dataCreazione || p.aggiornatoAt;
    if (!isoInRange(at, range)) continue;
    preventiviCount += 1;
    preventiviValue = roundMoney(preventiviValue + (p.totaleFinale ?? 0));
  }
  const inv = buildInvoicePeriodKpi(invoices, range);
  const ddtInRange = ddtDocuments.filter((d) => isoInRange(d.data_documento, range));
  const ddtKpi = buildDdtKpi(ddtInRange);

  const metrics: ReportDomainMetric[] = [
    preventiviCount > 0
      ? availableMetric("eco_preventivi", "Preventivi", `${fmtN(preventiviCount)} · ${fmtEur(preventiviValue)}`)
      : metric("eco_preventivi", "Preventivi", { status: "not_available", reason: "Non disponibile nel periodo selezionato" }),
    inv.fatturato > 0 || inv.emesse > 0
      ? availableMetric("eco_invoices", "Fatturato", `${fmtN(inv.emesse)} · ${fmtEur(inv.fatturato)}`)
      : metric("eco_invoices", "Fatturato", { status: "not_available", reason: "Non disponibile nel periodo selezionato" }),
    ddtKpi.totale > 0
      ? availableMetric("eco_ddt", "DDT", fmtN(ddtKpi.totale))
      : metric("eco_ddt", "DDT", { status: "not_available", reason: "Non disponibile nel periodo selezionato" }),
  ];

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
