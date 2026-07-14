import type { DipendenteTimesheetEntryRow } from "@/lib/dipendenti/types";
import { computeMonthTotals } from "@/lib/dipendenti/timesheet-totals";
import { filterEntriesForReportTimesheetKpi } from "@/lib/dipendenti/timesheet-report-kpi-filter";
import type { TipoAssenzaConfig } from "@/lib/dipendenti/tipi-assenza-model";
import type { DateRange } from "@/lib/report/date-ranges";
import { ymdFromDate } from "@/lib/report/date-ranges";

export type AssenzaRateContext = {
  ratePerDipendente: number;
  prevRatePerDipendente: number | null;
  deltaPct: number | null;
  dipendentiAttivi: number;
  prevDipendentiAttivi: number | null;
};

function filterTimesheetInRange(
  entries: readonly DipendenteTimesheetEntryRow[],
  range: DateRange,
): DipendenteTimesheetEntryRow[] {
  const from = ymdFromDate(range.start);
  const to = ymdFromDate(range.end);
  return entries.filter((e) => e.work_date >= from && e.work_date <= to);
}

function uniqueDipendentiWithOre(entries: readonly DipendenteTimesheetEntryRow[]): number {
  const ids = new Set<string>();
  for (const e of entries) {
    const ore =
      Number(e.ore_ordinarie) + Number(e.ore_straordinarie) + Number(e.ore_assenza) + (e.assenza ? 8 : 0);
    if (ore > 0) ids.add(e.dipendente_id);
  }
  return Math.max(1, ids.size);
}

/** Ore assenza per dipendente attivo — evita falsi allarmi se cresce il team. */
export function computeAssenzaRateContext(
  entries: readonly DipendenteTimesheetEntryRow[],
  range: DateRange,
  prevRange: DateRange | null,
  tipiAssenza?: readonly TipoAssenzaConfig[],
): AssenzaRateContext {
  const curRows = filterEntriesForReportTimesheetKpi(filterTimesheetInRange(entries, range), tipiAssenza);
  const curTotals = computeMonthTotals(curRows);
  const dipendentiAttivi = uniqueDipendentiWithOre(curRows);
  const ratePerDipendente = curTotals.oreAssenza / dipendentiAttivi;

  if (!prevRange) {
    return {
      ratePerDipendente,
      prevRatePerDipendente: null,
      deltaPct: null,
      dipendentiAttivi,
      prevDipendentiAttivi: null,
    };
  }

  const prevRows = filterEntriesForReportTimesheetKpi(filterTimesheetInRange(entries, prevRange), tipiAssenza);
  const prevTotals = computeMonthTotals(prevRows);
  const prevDipendentiAttivi = uniqueDipendentiWithOre(prevRows);
  const prevRatePerDipendente = prevTotals.oreAssenza / prevDipendentiAttivi;
  const deltaPct =
    prevRatePerDipendente > 0
      ? ((ratePerDipendente - prevRatePerDipendente) / prevRatePerDipendente) * 100
      : ratePerDipendente > 0
        ? 100
        : 0;

  return {
    ratePerDipendente,
    prevRatePerDipendente,
    deltaPct,
    dipendentiAttivi,
    prevDipendentiAttivi,
  };
}
