import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import { employeeDisplayNameForPdf } from "@/lib/dipendenti/dipendenti-employee-display";
import type { TipoAssenzaConfig } from "@/lib/dipendenti/tipi-assenza-model";
import type {
  DipendenteTimesheetEmployeeRow,
  DipendenteTimesheetEntryRow,
  TimesheetMonthKey,
} from "@/lib/dipendenti/types";

/** Input normalizzato per export PDF — dipendenti filtrati lato server. */
export type DipendentiPdfContext = {
  monthKey: TimesheetMonthKey;
  employees: readonly DipendenteTimesheetEmployeeRow[];
  entries: readonly DipendenteTimesheetEntryRow[];
  tipiAssenza: readonly TipoAssenzaConfig[];
  addettiRecords: readonly AddettoRecord[];
};

export function buildDipendentiPdfContext(input: {
  monthKey: TimesheetMonthKey;
  employees: readonly DipendenteTimesheetEmployeeRow[];
  entries: readonly DipendenteTimesheetEntryRow[];
  tipiAssenza: readonly TipoAssenzaConfig[];
  addettiRecords: readonly AddettoRecord[];
}): DipendentiPdfContext {
  return {
    monthKey: input.monthKey,
    employees: [...input.employees],
    entries: [...input.entries],
    tipiAssenza: [...input.tipiAssenza],
    addettiRecords: [...input.addettiRecords],
  };
}

export function entriesForEmployee(
  dipendenteId: string,
  entries: readonly DipendenteTimesheetEntryRow[],
): DipendenteTimesheetEntryRow[] {
  return entries.filter((e) => e.dipendente_id === dipendenteId);
}

/** @deprecated Preferire employeeDisplayNameForPdf — evita snapshot storici. */
export function employeeDisplayName(
  employee: DipendenteTimesheetEmployeeRow,
  entries: readonly DipendenteTimesheetEntryRow[],
): string {
  const snap = entries.find((e) => e.dipendente_id === employee.id)?.employee_display_name_snapshot;
  return snap?.trim() || employee.display_name;
}

export function pdfEmployeeDisplayName(ctx: DipendentiPdfContext, employee: DipendenteTimesheetEmployeeRow): string {
  return employeeDisplayNameForPdf(employee, ctx.addettiRecords, ctx.entries);
}

export function registryLabel(inSettings: boolean): string {
  return inSettings ? "Attivo in addetti" : "Storico — non in addetti";
}
