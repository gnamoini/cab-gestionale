import { isCellEmpty } from "@/lib/dipendenti/timesheet-totals";
import type {
  DipendenteTimesheetEmployeeRow,
  TimesheetCellValue,
  TimesheetEntryUpsert,
} from "@/lib/dipendenti/types";

export const TIMESHEET_DEFAULT_DAY_HOURS = 8;

export function buildEmptyDay8hUpsert(
  dipendenteId: string,
  workDate: string,
): TimesheetEntryUpsert {
  return {
    dipendenteId,
    workDate,
    oreOrdinarie: TIMESHEET_DEFAULT_DAY_HOURS,
    oreStraordinarie: 0,
    oreAssenza: 0,
    tipoAssenzaId: null,
    tipoAssenzaLabel: null,
    motivoCustom: null,
    note: null,
  };
}

export function buildEmptyDay8hUpserts(
  employees: readonly DipendenteTimesheetEmployeeRow[],
  workDate: string,
  getCellValue: (dipendenteId: string, workDate: string) => TimesheetCellValue,
): TimesheetEntryUpsert[] {
  const out: TimesheetEntryUpsert[] = [];
  for (const employee of employees) {
    if (!isCellEmpty(getCellValue(employee.id, workDate))) continue;
    out.push(buildEmptyDay8hUpsert(employee.id, workDate));
  }
  return out;
}

export function countEmptyDay8hUpserts(
  employees: readonly DipendenteTimesheetEmployeeRow[],
  workDate: string,
  getCellValue: (dipendenteId: string, workDate: string) => TimesheetCellValue,
): number {
  return buildEmptyDay8hUpserts(employees, workDate, getCellValue).length;
}
