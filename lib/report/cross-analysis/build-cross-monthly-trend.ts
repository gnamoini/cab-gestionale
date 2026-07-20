import type { DipendenteTimesheetEntryRow } from "@/lib/dipendenti/types";
import type { LavorazioneArchiviata } from "@/lib/lavorazioni/types";
import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import { isoInRange, type DateRange } from "@/lib/report/date-ranges";
import {
  computeCrossCostJob,
  computeCrossEfficiency,
  computeCrossPartsJob,
  computeCrossValueHour,
} from "@/lib/report/cross-analysis/build-report-cross-dto";
import type { CrossP0MetricId } from "@/lib/report/cross-analysis/cross-metric-registry";
import type { CrossFormulaInput } from "@/lib/report/cross-analysis/types";
import { monthKeysOverlappingRange } from "@/lib/report/month-keys";
import { countCompletedInRange } from "@/lib/report/lavorazioni-report-selectors";
import { sumMagazzinoUsciteQtyInRange } from "@/lib/report/magazzino-period-aggregate";
import type { InvoiceRow } from "@/src/types/supabase-tables";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";
import type { LavorazioneSchedeStore } from "@/types/schede";
import { sumManodoperaCostFromSchede } from "@/lib/report/kpi-performance/kpi-performance-formulas";
import { aggregateMagazzinoQtyByProductInRange } from "@/lib/report/magazzino-period-aggregate";

export type CrossMonthlyPoint = {
  monthKey: string;
  label: string;
  efficiency: number | null;
  partsPerJob: number | null;
  costPerJob: number | null;
  valuePerHour: number | null;
};

function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("it-IT", { month: "short", year: "2-digit" });
}

function monthRange(monthKey: string): DateRange {
  const [y, m] = monthKey.split("-").map(Number);
  const start = new Date(y!, m! - 1, 1);
  const end = new Date(y!, m!, 0, 23, 59, 59, 999);
  return { start, end };
}

function sumTimesheetHoursInRange(entries: readonly DipendenteTimesheetEntryRow[], range: DateRange): number {
  let total = 0;
  for (const e of entries) {
    if (!isoInRange(e.work_date, range)) continue;
    total += (e.ore_ordinarie ?? 0) + (e.ore_straordinarie ?? 0);
  }
  return Math.round(total * 10) / 10;
}

function movementValueInRange(
  magLog: readonly MagazzinoChangeLogEntry[],
  magazzinoRows: readonly MagazzinoRicambioRow[],
  range: DateRange,
): number {
  const costMap = new Map(magazzinoRows.map((r) => [r.id, r.costo ?? 0]));
  const byId = aggregateMagazzinoQtyByProductInRange([...magLog], range);
  let sum = 0;
  for (const [id, agg] of byId) {
    sum += agg.uscite * (costMap.get(id) ?? 0);
  }
  return Math.round(sum * 100) / 100;
}

function invoicesBilledInRange(invoices: readonly InvoiceRow[], range: DateRange): number {
  let sum = 0;
  for (const inv of invoices) {
    const iso = inv.data_emissione ?? inv.created_at;
    if (!iso || !isoInRange(iso, range)) continue;
    if (inv.status === "bozza" || inv.status === "da_verificare") continue;
    sum += inv.totale ?? 0;
  }
  return Math.round(sum * 100) / 100;
}

function metricFromInput(
  metricId: CrossP0MetricId,
  input: CrossFormulaInput,
): number | null {
  const compute =
    metricId === "cross_efficiency"
      ? computeCrossEfficiency
      : metricId === "cross_parts_job"
        ? computeCrossPartsJob
        : metricId === "cross_cost_job"
          ? computeCrossCostJob
          : computeCrossValueHour;
  const r = compute(input);
  return r.status === "available" ? r.value : null;
}

export type BuildCrossMonthlyTrendInput = {
  range: DateRange;
  completate: readonly LavorazioneArchiviata[];
  manualByMonth: Map<string, number>;
  magLog: readonly MagazzinoChangeLogEntry[];
  magazzinoRows: readonly MagazzinoRicambioRow[];
  timesheetEntries: readonly DipendenteTimesheetEntryRow[];
  schedeStore: LavorazioneSchedeStore | null;
  costoOrario: number;
  invoices: readonly InvoiceRow[];
};

export function buildCrossMonthlyTrend(input: BuildCrossMonthlyTrendInput): CrossMonthlyPoint[] {
  return monthKeysOverlappingRange(input.range).map((monthKey) => {
    const mr = monthRange(monthKey);
    const completed = countCompletedInRange(input.completate, mr, input.manualByMonth);
    const totalHours = sumTimesheetHoursInRange(input.timesheetEntries, mr);
    const partsUsed = sumMagazzinoUsciteQtyInRange([...input.magLog], mr);
    const movementValue = movementValueInRange(input.magLog, input.magazzinoRows, mr);
    const { manodopera } = sumManodoperaCostFromSchede(
      input.completate,
      mr,
      input.schedeStore,
      input.costoOrario,
      input.magazzinoRows,
    );
    const invoicesBilled = invoicesBilledInRange(input.invoices, mr);

    const formula: CrossFormulaInput = {
      operational: { completedInPeriod: completed },
      warehouse: { partsUsedQty: partsUsed, movementValue },
      labor: { totalHours, manodoperaCost: manodopera },
      economic: invoicesBilled > 0 ? { invoicesBilled } : undefined,
    };

    return {
      monthKey,
      label: monthLabel(monthKey),
      efficiency: metricFromInput("cross_efficiency", formula),
      partsPerJob: metricFromInput("cross_parts_job", formula),
      costPerJob: metricFromInput("cross_cost_job", formula),
      valuePerHour: metricFromInput("cross_value_hour", formula),
    };
  });
}

export function crossMetricSparkline(
  points: readonly CrossMonthlyPoint[],
  metricId: CrossP0MetricId,
): number[] {
  const key =
    metricId === "cross_efficiency"
      ? "efficiency"
      : metricId === "cross_parts_job"
        ? "partsPerJob"
        : metricId === "cross_cost_job"
          ? "costPerJob"
          : "valuePerHour";
  return points.map((p) => p[key] ?? 0);
}

/** ponytail: indexed base-100 per confronto trend multi-metrica. */
export function crossTrendIndexedSeries(
  points: readonly CrossMonthlyPoint[],
): { label: string; efficiency: number; partsPerJob: number; costPerJob: number; valuePerHour: number }[] {
  const base = points.find(
    (p) =>
      p.efficiency != null ||
      p.partsPerJob != null ||
      p.costPerJob != null ||
      p.valuePerHour != null,
  );
  const idx = (v: number | null, b: number | null) =>
    v != null && b != null && b > 0 ? Math.round((v / b) * 100) : 0;

  return points.map((p) => ({
    label: p.label,
    efficiency: idx(p.efficiency, base?.efficiency ?? null),
    partsPerJob: idx(p.partsPerJob, base?.partsPerJob ?? null),
    costPerJob: idx(p.costPerJob, base?.costPerJob ?? null),
    valuePerHour: idx(p.valuePerHour, base?.valuePerHour ?? null),
  }));
}
