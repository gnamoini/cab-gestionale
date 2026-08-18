import { cellValueToUpsert } from "@/lib/dipendenti/timesheet-entry-map";
import type { TipoAssenzaConfig } from "@/lib/dipendenti/tipi-assenza-model";
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
  return buildEmptyDayAbsenceUpserts(
    employees,
    workDate,
    getCellValue,
    (dipendenteId) => buildEmptyDay8hUpsert(dipendenteId, workDate),
  );
}

export function resolveFerieTipoAssenza(
  tipi: readonly TipoAssenzaConfig[],
): TipoAssenzaConfig | undefined {
  return tipi.find((tipo) => tipo.label.trim().toLowerCase() === "ferie");
}

export function buildEmptyDayFerieUpsert(
  dipendenteId: string,
  workDate: string,
  ferieTipo: Pick<TipoAssenzaConfig, "id" | "label">,
): TimesheetEntryUpsert {
  return {
    dipendenteId,
    workDate,
    oreOrdinarie: 0,
    oreStraordinarie: 0,
    oreAssenza: TIMESHEET_DEFAULT_DAY_HOURS,
    tipoAssenzaId: ferieTipo.id,
    tipoAssenzaLabel: ferieTipo.label,
    motivoCustom: null,
    note: null,
  };
}

export function buildEmptyDayFerieUpserts(
  employees: readonly DipendenteTimesheetEmployeeRow[],
  workDate: string,
  getCellValue: (dipendenteId: string, workDate: string) => TimesheetCellValue,
  ferieTipo: Pick<TipoAssenzaConfig, "id" | "label">,
): TimesheetEntryUpsert[] {
  return buildEmptyDayAbsenceUpserts(employees, workDate, getCellValue, (dipendenteId) =>
    buildEmptyDayFerieUpsert(dipendenteId, workDate, ferieTipo),
  );
}

function buildEmptyDayAbsenceUpserts(
  employees: readonly DipendenteTimesheetEmployeeRow[],
  workDate: string,
  getCellValue: (dipendenteId: string, workDate: string) => TimesheetCellValue,
  buildUpsert: (dipendenteId: string) => TimesheetEntryUpsert,
): TimesheetEntryUpsert[] {
  const out: TimesheetEntryUpsert[] = [];
  for (const employee of employees) {
    if (!isCellEmpty(getCellValue(employee.id, workDate))) continue;
    out.push(buildUpsert(employee.id));
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

/** Copia lo stesso valore cella a tutti gli addetti per un singolo giorno (sovrascrive). */
export function buildCopyDayToAllUpserts(
  employees: readonly DipendenteTimesheetEmployeeRow[],
  workDate: string,
  sourceValue: TimesheetCellValue,
  tipiAssenza: readonly TipoAssenzaConfig[],
): TimesheetEntryUpsert[] {
  return employees.map((employee) =>
    cellValueToUpsert(employee.id, workDate, sourceValue, tipiAssenza),
  );
}
