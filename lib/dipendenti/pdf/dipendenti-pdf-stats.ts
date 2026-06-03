import { computeDipendenteSchedaStats } from "@/lib/dipendenti/timesheet-scheda-stats";
import { computeMonthTotals } from "@/lib/dipendenti/timesheet-totals";
import type { TipoAssenzaConfig } from "@/lib/dipendenti/tipi-assenza-model";
import type {
  DipendenteTimesheetEmployeeRow,
  DipendenteTimesheetEntryRow,
  TimesheetMonthTotals,
} from "@/lib/dipendenti/types";
import { entriesForEmployee } from "@/lib/dipendenti/pdf/dipendenti-pdf-context";

export type DipendentiComplessivoRiepilogo = {
  dipendentiCount: number;
  attiviInAddetti: number;
  storici: number;
  globalTotals: TimesheetMonthTotals;
};

export type DipendenteSummaryRow = {
  id: string;
  displayName: string;
  registry: string;
  totals: TimesheetMonthTotals;
};

export function computeComplessivoRiepilogo(
  employees: readonly DipendenteTimesheetEmployeeRow[],
  entries: readonly DipendenteTimesheetEntryRow[],
): DipendentiComplessivoRiepilogo {
  const attiviInAddetti = employees.filter((e) => e.in_settings).length;
  return {
    dipendentiCount: employees.length,
    attiviInAddetti,
    storici: employees.length - attiviInAddetti,
    globalTotals: computeMonthTotals(entries),
  };
}

export function computeEmployeeSummaryRows(
  employees: readonly DipendenteTimesheetEmployeeRow[],
  entries: readonly DipendenteTimesheetEntryRow[],
  displayNameFor: (emp: DipendenteTimesheetEmployeeRow) => string,
  registryFor: (emp: DipendenteTimesheetEmployeeRow) => string,
): DipendenteSummaryRow[] {
  return employees.map((emp) => ({
    id: emp.id,
    displayName: displayNameFor(emp),
    registry: registryFor(emp),
    totals: computeMonthTotals(entriesForEmployee(emp.id, entries)),
  }));
}

export function buildAbsenceLegendLine(tipiAssenza: readonly TipoAssenzaConfig[]): string {
  const sigle = [...tipiAssenza]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((t) => `${t.abbrev}=${t.label}`)
    .join(" · ");
  const notation = "8h ordinarie · 8+2 ord+straord · 8h+F ord+assenza";
  return sigle ? `${notation} · ${sigle}` : notation;
}

export { computeDipendenteSchedaStats };
