import { capitaleImmobilizzato } from "@/lib/magazzino/calculations";
import { sumActualLaborHoursInRange } from "@/lib/analytics/hours/sum-actual-labor-hours-in-range";
import { buildInvoicePeriodKpiExtended } from "@/lib/report/economic-analytics-extended";
import {
  avgCloseDays,
  countCompletedInRange,
  countOpenedInRange,
} from "@/lib/report/lavorazioni-report-selectors";
import {
  countInterventiAperti,
  countInterventiInRitardo,
  sumManodoperaCostFromSchede,
  sumRicambiCostFromMagLog,
  sottoScortaCount,
} from "@/lib/report/kpi-performance/kpi-performance-formulas";
import { aggregateMagazzinoQtyByProductInRange } from "@/lib/report/magazzino-period-aggregate";
import { buildDdtKpi } from "@/lib/ddt/ddt-calculations";
import { roundMoney } from "@/lib/fatturazione/invoice-calculations";
import { computePreventiviWinRate } from "@/lib/report/economic-credit-analytics";
import { isPreventivoCountedInEconomicStats } from "@/lib/preventivi/preventivo-stats-eligibility";
import { isoInRange } from "@/lib/report/date-ranges";
import { countAnnullateInRange } from "@/lib/report/report-domain-analytics";
import { aggregateOrePerDipendente } from "@/lib/report/timesheet-ore-ranking";
import { computeLaborComposition, computeTeamSaturation } from "@/lib/report/labor-analytics";
import { countMezziInOfficinaProxy } from "@/lib/report/kpi-performance/kpi-performance-formulas";
import { uniqueClientiNelPeriodo } from "@/lib/report/lavorazioni-report-selectors";
import {
  computeCrossCostJobMetric,
  computeCrossEfficiencyMetric,
  computeCrossPartsJobMetric,
  computeCrossValueHourMetric,
} from "@/lib/report/analytics-engine/calculators/compute-cross-metrics";
import type {
  AnalyticsCalculatorFn,
  AnalyticsCalculatorContext,
  AnalyticsScalarResult,
} from "@/lib/report/analytics-engine/calculator-context";
import {
  estimatedResult,
  partialResult,
  unavailableResult,
  verifiedResult,
} from "@/lib/report/analytics-engine/calculator-context";

export const computeEcoFatturato: AnalyticsCalculatorFn = ({ bundle, range }) => {
  if (!bundle.invoicesAvailable) {
    return partialResult(0, "invoice_emitted_in_period");
  }
  const kpi = buildInvoicePeriodKpiExtended(bundle.invoices, bundle.invoicePayments, range);
  return verifiedResult(kpi.fatturato, "invoice_emitted_in_period");
};

export const computeEcoIncassato: AnalyticsCalculatorFn = ({ bundle, range }) => {
  if (!bundle.invoicesAvailable) {
    return partialResult(0, "payments_in_period");
  }
  const kpi = buildInvoicePeriodKpiExtended(bundle.invoices, bundle.invoicePayments, range);
  return verifiedResult(kpi.incassato, "payments_in_period");
};

export const computeEcoDaIncassare: AnalyticsCalculatorFn = ({ bundle, range }) => {
  if (!bundle.invoicesAvailable) {
    return partialResult(0, "invoice_residuo_snapshot");
  }
  const kpi = buildInvoicePeriodKpiExtended(bundle.invoices, bundle.invoicePayments, range);
  return verifiedResult(kpi.daIncassare, "invoice_residuo_snapshot");
};

export const computeEcoImportoScaduto: AnalyticsCalculatorFn = ({ bundle, range }) => {
  if (!bundle.invoicesAvailable) {
    return partialResult(0, "invoice_overdue_residuo_snapshot");
  }
  // ponytail: range ignored — overdue uses server today inside buildInvoicePeriodKpiExtended
  const kpi = buildInvoicePeriodKpiExtended(bundle.invoices, bundle.invoicePayments, range);
  return verifiedResult(kpi.importoScaduto, "invoice_overdue_residuo_snapshot");
};

export const computeEcoMargineOperativoStimato: AnalyticsCalculatorFn = ({ bundle, range }) => {
  if (!bundle.invoicesAvailable) {
    return unavailableResult("revenue_minus_labor_minus_parts");
  }
  const kpi = buildInvoicePeriodKpiExtended(bundle.invoices, bundle.invoicePayments, range);
  const manodopera = sumManodoperaCostFromSchede(
    bundle.integrity.completate,
    range,
    bundle.schedeStore,
    bundle.costoOrario,
    bundle.magazzinoRows,
  ).manodopera;
  const movement = sumRicambiCostFromMagLog(
    bundle.integrity.magLog,
    bundle.integrity.magazzino,
    range,
  );
  if (bundle.schedeStore == null) {
    return partialResult(kpi.fatturato - movement, "revenue_minus_labor_minus_parts");
  }
  return estimatedResult(kpi.fatturato - (manodopera + movement), "revenue_minus_labor_minus_parts");
};

export const computeEcoPreventiviCount: AnalyticsCalculatorFn = ({ bundle, range }) => {
  let count = 0;
  for (const p of bundle.preventivi) {
    if (p.statoWorkflow === "bozza") continue;
    const at = p.dataCreazione || p.aggiornatoAt;
    if (!isoInRange(at, range)) continue;
    count += 1;
  }
  return verifiedResult(count, "preventivi_non_bozza_in_period");
};

export const computeEcoPreventiviValore: AnalyticsCalculatorFn = ({ bundle, range }) => {
  let value = 0;
  for (const p of bundle.preventivi) {
    if (p.statoWorkflow === "bozza") continue;
    const at = p.dataCreazione || p.aggiornatoAt;
    if (!isoInRange(at, range)) continue;
    value = roundMoney(value + (p.totaleFinale ?? 0));
  }
  return verifiedResult(value, "preventivi_value_non_bozza_in_period");
};

export const computeWinRatePreventivi: AnalyticsCalculatorFn = ({ bundle, range }) => {
  const rate = computePreventiviWinRate(bundle.preventivi, range);
  if (rate == null) return unavailableResult("preventivi_win_rate");
  return verifiedResult(rate, "preventivi_win_rate");
};

export const computeLavPeriodo: AnalyticsCalculatorFn = ({ bundle, range }) => {
  const v = countOpenedInRange(bundle.integrity.attive, bundle.integrity.storico, range);
  return verifiedResult(v, "openedInPeriod");
};

export const computeLavChiusi: AnalyticsCalculatorFn = ({ bundle, range }) => {
  const v = countCompletedInRange(
    bundle.integrity.completate,
    range,
    bundle.integrity.manualByMonth,
  );
  return verifiedResult(v, "completedInPeriod");
};

export const computeLavAperti: AnalyticsCalculatorFn = ({ bundle }) => {
  const v = countInterventiAperti(bundle.integrity.attive);
  return verifiedResult(v, "openInterventionsSnapshot");
};

export const computeLavTempoMedio: AnalyticsCalculatorFn = ({ bundle, range }) => {
  const v = avgCloseDays(bundle.integrity.completate, range);
  if (v <= 0) return unavailableResult("avgCloseDaysInPeriod");
  return verifiedResult(v, "avgCloseDaysInPeriod");
};

export const computeLavLateSla: AnalyticsCalculatorFn = ({ bundle }) => {
  const v = countInterventiInRitardo(bundle.integrity.attive, new Date());
  return verifiedResult(v, "lateSlaOpenCount");
};

export const computeScorta: AnalyticsCalculatorFn = ({ bundle }) => {
  return verifiedResult(sottoScortaCount(bundle.integrity.magazzino), "sottoScortaCount");
};

export const computeRicUsati: AnalyticsCalculatorFn = ({ bundle, range }) => {
  const agg = aggregateMagazzinoQtyByProductInRange(bundle.integrity.magLog, range);
  let total = 0;
  for (const v of agg.values()) total += v.uscite;
  return verifiedResult(total, "magLogUsciteQtyInPeriod");
};

export const computeCap: AnalyticsCalculatorFn = ({ bundle }) => {
  let s = 0;
  for (const r of bundle.integrity.magazzino) {
    s += capitaleImmobilizzato(r);
  }
  return verifiedResult(Math.round(s * 100) / 100, "capitaleImmobilizzatoSnapshot");
};

export const computePresenceHoursTotal: AnalyticsCalculatorFn = ({ bundle }) => {
  return verifiedResult(bundle.totalHours, "timesheetPresenceHoursInPeriod");
};

export const computeActualLaborHours: AnalyticsCalculatorFn = ({ bundle, range }) => {
  const v = sumActualLaborHoursInRange(
    bundle.integrity.completate,
    range,
    bundle.lavRows,
  );
  return verifiedResult(v, "actualLaborHoursCompletedInPeriod");
};

export const computeLavCancelled: AnalyticsCalculatorFn = ({ bundle, range }) => {
  const v = countAnnullateInRange(bundle.lavRows, range);
  // ponytail: period = data_ingresso, not annullata_at (non esiste su lavorazioni)
  return partialResult(v, "cancelledByIngressDateInPeriod");
};

export const computeClienti: AnalyticsCalculatorFn = ({ bundle, range }) => {
  const v = uniqueClientiNelPeriodo(
    bundle.integrity.attive,
    bundle.integrity.storico,
    bundle.integrity.completate,
    range,
  );
  return verifiedResult(v, "uniqueClientiNelPeriodo");
};

export const computeEcoDdt: AnalyticsCalculatorFn = ({ bundle, range }) => {
  if (!bundle.ddtAvailable) {
    return partialResult(0, "ddt_documents_in_period");
  }
  const inRange = bundle.ddtDocuments.filter((d) => isoInRange(d.data_documento, range));
  const kpi = buildDdtKpi(inRange);
  return partialResult(kpi.totale, "ddt_count_by_data_documento");
};

export const computeEcoPreventiviApprovati: AnalyticsCalculatorFn = ({ bundle, range }) => {
  let count = 0;
  for (const p of bundle.preventivi) {
    if (!isPreventivoCountedInEconomicStats(p)) continue;
    const at = p.dataCreazione || p.aggiornatoAt;
    if (!isoInRange(at, range)) continue;
    count += 1;
  }
  return verifiedResult(count, "preventivi_approvati_in_period");
};

export const computeMagMovementValue: AnalyticsCalculatorFn = ({ bundle, range }) => {
  const v = sumRicambiCostFromMagLog(
    bundle.integrity.magLog,
    bundle.integrity.magazzino,
    range,
  );
  return verifiedResult(Math.round(v * 100) / 100, "magLogMovementValueInPeriod");
};

export const computeCostTot: AnalyticsCalculatorFn = ({ bundle, range }) => {
  const movement = sumRicambiCostFromMagLog(
    bundle.integrity.magLog,
    bundle.integrity.magazzino,
    range,
  );
  const manodopera = sumManodoperaCostFromSchede(
    bundle.integrity.completate,
    range,
    bundle.schedeStore,
    bundle.costoOrario,
    bundle.magazzinoRows,
  ).manodopera;
  const total = Math.round((movement + manodopera) * 100) / 100;
  if (bundle.schedeStore == null) {
    return partialResult(total, "movement_plus_labor_in_period");
  }
  return estimatedResult(total, "movement_plus_labor_in_period");
};

export const computeMagOrders: AnalyticsCalculatorFn = ({ bundle, range }) => {
  if (!bundle.ordiniAvailable) {
    return partialResult(0, "ordini_fornitori_in_period");
  }
  let count = 0;
  for (const o of bundle.ordini) {
    if (o.status === "annullato") continue;
    if (isoInRange(o.dataOrdine, range)) count += 1;
  }
  return verifiedResult(count, "ordini_fornitori_non_annullati_in_period");
};

export const computeOreStraordinari: AnalyticsCalculatorFn = ({ bundle }) => {
  const composition = computeLaborComposition(bundle.timesheetEntries);
  if (composition.oreStraordinarie <= 0) {
    return unavailableResult("timesheet_overtime_in_period");
  }
  return verifiedResult(composition.oreStraordinarie, "timesheet_overtime_in_period");
};

export const computeSaturazioneTeam: AnalyticsCalculatorFn = ({ bundle, range }) => {
  const employeesWithHours = aggregateOrePerDipendente(
    bundle.timesheetEntries,
    bundle.timesheetEmployees,
  ).length;
  const saturation = computeTeamSaturation(bundle.totalHours, employeesWithHours, range);
  if (saturation == null) {
    return unavailableResult("team_saturation_pct");
  }
  return estimatedResult(saturation, "team_saturation_pct");
};

export const computeFlottaOfficina: AnalyticsCalculatorFn = ({ bundle }) => {
  const v = countMezziInOfficinaProxy(bundle.integrity.mezzi, bundle.lavRows);
  return estimatedResult(v, "mezzi_in_officina_proxy");
};

export const ANALYTICS_CALCULATOR_REGISTRY: Record<string, AnalyticsCalculatorFn> = {
  computeEcoFatturato,
  computeEcoIncassato,
  computeEcoDaIncassare,
  computeEcoImportoScaduto,
  computeEcoMargineOperativoStimato,
  computeEcoPreventiviCount,
  computeEcoPreventiviValore,
  computeWinRatePreventivi,
  computeLavPeriodo,
  computeLavChiusi,
  computeLavAperti,
  computeLavTempoMedio,
  computeLavLateSla,
  computeScorta,
  computeRicUsati,
  computeCap,
  computePresenceHoursTotal,
  computeActualLaborHours,
  computeLavCancelled,
  computeClienti,
  computeEcoDdt,
  computeEcoPreventiviApprovati,
  computeMagMovementValue,
  computeCostTot,
  computeMagOrders,
  computeOreStraordinari,
  computeSaturazioneTeam,
  computeFlottaOfficina,
  computeCrossEfficiencyMetric,
  computeCrossPartsJobMetric,
  computeCrossCostJobMetric,
  computeCrossValueHourMetric,
};

export function runCalculator(
  calculatorId: string,
  ctx: AnalyticsCalculatorContext,
): AnalyticsScalarResult {
  const fn = ANALYTICS_CALCULATOR_REGISTRY[calculatorId];
  if (!fn) {
    return unavailableResult(calculatorId);
  }
  return fn(ctx);
}
