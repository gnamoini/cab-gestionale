import type { TipoAssenzaConfig } from "@/lib/dipendenti/tipi-assenza-model";
import type {
  DipendenteTimesheetEmployeeRow,
  DipendenteTimesheetEntryRow,
  TimesheetMonthKey,
} from "@/lib/dipendenti/types";

/** Input normalizzato per export PDF — stessi dati della pagina Dipendenti. */
export type DipendentiPdfContext = {
  monthKey: TimesheetMonthKey;
  employees: readonly DipendenteTimesheetEmployeeRow[];
  entries: readonly DipendenteTimesheetEntryRow[];
  tipiAssenza: readonly TipoAssenzaConfig[];
};

export function buildDipendentiPdfContext(input: {
  monthKey: TimesheetMonthKey;
  employees: readonly DipendenteTimesheetEmployeeRow[];
  entries: readonly DipendenteTimesheetEntryRow[];
  tipiAssenza: readonly TipoAssenzaConfig[];
}): DipendentiPdfContext {
  return {
    monthKey: input.monthKey,
    employees: [...input.employees],
    entries: [...input.entries],
    tipiAssenza: [...input.tipiAssenza],
  };
}

export function entriesForEmployee(
  dipendenteId: string,
  entries: readonly DipendenteTimesheetEntryRow[],
): DipendenteTimesheetEntryRow[] {
  return entries.filter((e) => e.dipendente_id === dipendenteId);
}

export function employeeDisplayName(
  employee: DipendenteTimesheetEmployeeRow,
  entries: readonly DipendenteTimesheetEntryRow[],
): string {
  const snap = entries.find((e) => e.dipendente_id === employee.id)?.employee_display_name_snapshot;
  return snap?.trim() || employee.display_name;
}

export function registryLabel(inSettings: boolean): string {
  return inSettings ? "Attivo in addetti" : "Storico — non in addetti";
}
