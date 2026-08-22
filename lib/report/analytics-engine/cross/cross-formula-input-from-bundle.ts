import { buildInvoicePeriodKpiExtended } from "@/lib/report/economic-analytics-extended";
import type { CrossFormulaInput } from "@/lib/report/cross-analysis/types";
import { countCompletedInRange } from "@/lib/report/lavorazioni-report-selectors";
import { aggregateMagazzinoQtyByProductInRange } from "@/lib/report/magazzino-period-aggregate";
import {
  sumManodoperaCostFromSchede,
  sumRicambiCostFromMagLog,
} from "@/lib/report/kpi-performance/kpi-performance-formulas";
import { sumActualLaborHoursInRange } from "@/lib/analytics/hours/sum-actual-labor-hours-in-range";
import type { ReportAnalyticsSourceBundle } from "@/lib/report/analytics-engine/source-bundle";

/** Build CrossFormulaInput from Analytics Engine bundle — SSOT fields only. */
export function crossFormulaInputFromBundle(bundle: ReportAnalyticsSourceBundle): CrossFormulaInput {
  const completedInPeriod = countCompletedInRange(
    bundle.integrity.completate,
    bundle.range,
    bundle.integrity.manualByMonth,
  );

  const agg = aggregateMagazzinoQtyByProductInRange(bundle.integrity.magLog, bundle.range);
  let partsUsedQty = 0;
  for (const v of agg.values()) partsUsedQty += v.uscite;

  const movementValue = sumRicambiCostFromMagLog(
    bundle.integrity.magLog,
    bundle.integrity.magazzino,
    bundle.range,
  );

  const manodoperaCost = sumManodoperaCostFromSchede(
    bundle.integrity.completate,
    bundle.range,
    bundle.schedeStore,
    bundle.costoOrario,
    bundle.magazzinoRows,
  ).manodopera;

  const actualLaborHours = sumActualLaborHoursInRange(
    bundle.integrity.completate,
    bundle.range,
    bundle.lavRows,
  );

  const invoicesBilled = bundle.invoicesAvailable
    ? buildInvoicePeriodKpiExtended(bundle.invoices, bundle.invoicePayments, bundle.range).fatturato
    : undefined;

  return {
    operational: { completedInPeriod },
    warehouse: { partsUsedQty, movementValue },
    labor: {
      totalHours: bundle.totalHours,
      actualLaborHours: actualLaborHours > 0 ? actualLaborHours : undefined,
      manodoperaCost,
    },
    economic: invoicesBilled != null ? { invoicesBilled } : undefined,
  };
}
