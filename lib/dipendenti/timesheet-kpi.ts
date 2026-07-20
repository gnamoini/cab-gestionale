import { computeMonthTotals } from "@/lib/dipendenti/timesheet-totals";
import type {
  DipendenteTimesheetEmployeeRow,
  DipendenteTimesheetEntryRow,
  TimesheetMonthTotals,
} from "@/lib/dipendenti/types";

export type DipendentiPanoramaKpi = {
  dipendentiAttivi: number;
  oreOrdinarie: number;
  oreStraordinarie: number;
  oreAssenza: number;
  totaleLavorato: number;
  mediaOrePerDipendente: number;
  giorniAssenzaTotali: number;
  topOreDipendente: { id: string; displayName: string; totaleLavorato: number } | null;
  topStraordinariDipendente: { id: string; displayName: string; oreStraordinarie: number } | null;
};

export type TopDipendenteRow = {
  rank: number;
  id: string;
  displayName: string;
  totaleLavorato: number;
  oreOrdinarie: number;
  oreStraordinarie: number;
  oreAssenza: number;
};

function employeeMonthTotals(
  employees: readonly DipendenteTimesheetEmployeeRow[],
  entries: readonly DipendenteTimesheetEntryRow[],
): Map<string, TimesheetMonthTotals & { displayName: string }> {
  const map = new Map<string, TimesheetMonthTotals & { displayName: string }>();
  for (const emp of employees) {
    const empEntries = entries.filter((e) => e.dipendente_id === emp.id);
    map.set(emp.id, { displayName: emp.display_name, ...computeMonthTotals(empEntries) });
  }
  return map;
}

export function computePanoramaKpi(
  employees: readonly DipendenteTimesheetEmployeeRow[],
  entries: readonly DipendenteTimesheetEntryRow[],
): DipendentiPanoramaKpi {
  const global = computeMonthTotals(entries);
  const perEmployee = employeeMonthTotals(employees, entries);
  const withHours = [...perEmployee.values()].filter((t) => t.totaleLavorato > 0);
  const mediaOrePerDipendente =
    withHours.length > 0
      ? Math.round((withHours.reduce((s, t) => s + t.totaleLavorato, 0) / withHours.length) * 100) / 100
      : 0;

  let topOre: DipendentiPanoramaKpi["topOreDipendente"] = null;
  let topStr: DipendentiPanoramaKpi["topStraordinariDipendente"] = null;

  for (const [id, t] of perEmployee) {
    if (t.totaleLavorato > 0 && (!topOre || t.totaleLavorato > topOre.totaleLavorato)) {
      topOre = { id, displayName: t.displayName, totaleLavorato: t.totaleLavorato };
    }
    if (t.oreStraordinarie > 0 && (!topStr || t.oreStraordinarie > topStr.oreStraordinarie)) {
      topStr = { id, displayName: t.displayName, oreStraordinarie: t.oreStraordinarie };
    }
  }

  return {
    dipendentiAttivi: withHours.length,
    oreOrdinarie: global.oreOrdinarie,
    oreStraordinarie: global.oreStraordinarie,
    oreAssenza: global.oreAssenza,
    totaleLavorato: global.totaleLavorato,
    mediaOrePerDipendente,
    giorniAssenzaTotali: global.giorniAssenza,
    topOreDipendente: topOre,
    topStraordinariDipendente: topStr,
  };
}

export function computeTopDipendenti(
  employees: readonly DipendenteTimesheetEmployeeRow[],
  entries: readonly DipendenteTimesheetEntryRow[],
  limit = 5,
): TopDipendenteRow[] {
  const rows: Omit<TopDipendenteRow, "rank">[] = employees.map((emp) => {
    const empEntries = entries.filter((e) => e.dipendente_id === emp.id);
    const totals = computeMonthTotals(empEntries);
    return {
      id: emp.id,
      displayName: emp.display_name,
      totaleLavorato: totals.totaleLavorato,
      oreOrdinarie: totals.oreOrdinarie,
      oreStraordinarie: totals.oreStraordinarie,
      oreAssenza: totals.oreAssenza,
    };
  });
  rows.sort((a, b) => b.totaleLavorato - a.totaleLavorato || a.displayName.localeCompare(b.displayName, "it"));
  return rows.slice(0, limit).map((r, i) => ({ ...r, rank: i + 1 }));
}

export type TimesheetKpiWithDelta = DipendentiPanoramaKpi & {
  prevMonth: {
    oreOrdinarie: number;
    oreStraordinarie: number;
    oreAssenza: number;
    totaleLavorato: number;
  };
  delta: {
    totaleLavoratoPct: number | null;
    assenzeDelta: number;
    overtimeDelta: number;
  };
};

function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function computePanoramaKpiWithDelta(
  employees: readonly DipendenteTimesheetEmployeeRow[],
  entries: readonly DipendenteTimesheetEntryRow[],
  previousEntries: readonly DipendenteTimesheetEntryRow[],
): TimesheetKpiWithDelta {
  const current = computePanoramaKpi(employees, entries);
  const prevTotals = computeMonthTotals(previousEntries);
  return {
    ...current,
    prevMonth: {
      oreOrdinarie: prevTotals.oreOrdinarie,
      oreStraordinarie: prevTotals.oreStraordinarie,
      oreAssenza: prevTotals.oreAssenza,
      totaleLavorato: prevTotals.totaleLavorato,
    },
    delta: {
      totaleLavoratoPct: pctDelta(current.totaleLavorato, prevTotals.totaleLavorato),
      assenzeDelta: Math.round((current.oreAssenza - prevTotals.oreAssenza) * 100) / 100,
      overtimeDelta: Math.round((current.oreStraordinarie - prevTotals.oreStraordinarie) * 100) / 100,
    },
  };
}

export function sumMonthTotalsList(totals: readonly TimesheetMonthTotals[]): TimesheetMonthTotals {
  let oreOrdinarie = 0;
  let oreStraordinarie = 0;
  let oreAssenza = 0;
  let giorniAssenza = 0;
  for (const t of totals) {
    oreOrdinarie += t.oreOrdinarie;
    oreStraordinarie += t.oreStraordinarie;
    oreAssenza += t.oreAssenza;
    giorniAssenza += t.giorniAssenza;
  }
  return {
    oreOrdinarie: Math.round(oreOrdinarie * 100) / 100,
    oreStraordinarie: Math.round(oreStraordinarie * 100) / 100,
    oreAssenza: Math.round(oreAssenza * 100) / 100,
    totaleLavorato: Math.round((oreOrdinarie + oreStraordinarie) * 100) / 100,
    giorniAssenza,
  };
}
