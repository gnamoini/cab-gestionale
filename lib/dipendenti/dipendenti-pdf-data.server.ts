import "server-only";

import {
  DIPENDENTI_TIMESHEET_EMPLOYEES_COLUMNS,
  DIPENDENTI_TIMESHEET_ENTRIES_COLUMNS,
} from "@/lib/db/table-select-columns";
import { buildDipendentiPdfContext, type DipendentiPdfContext } from "@/lib/dipendenti/pdf/dipendenti-pdf-context";
import { selectTimesheetEmployeesForPdfExport } from "@/lib/dipendenti/dipendenti-employee-display";
import { monthDateRange } from "@/lib/dipendenti/timesheet-month";
import type { TimesheetMonthKey } from "@/lib/dipendenti/types";
import { resolveCabAppSettingsResolvedServer } from "@/lib/app-settings/resolve-settings-for-server";
import { verifyServerSectionRead } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { DipendenteTimesheetEmployeeRow, DipendenteTimesheetEntryRow } from "@/src/types/supabase-tables";

export async function fetchDipendentiPdfContextServer(
  monthKey: TimesheetMonthKey,
): Promise<ServiceResult<DipendentiPdfContext>> {
  const allowed = await verifyServerSectionRead("dipendenti");
  if (!allowed) return err("Permesso richiesto.");
  const { from, to } = monthDateRange(monthKey);
  const sb = await createSupabaseServerUserClient();
  const [empRes, entRes, settings] = await Promise.all([
    sb.from("dipendenti_timesheet_employees").select(DIPENDENTI_TIMESHEET_EMPLOYEES_COLUMNS).order("display_name"),
    sb
      .from("dipendenti_timesheet_entries")
      .select(DIPENDENTI_TIMESHEET_ENTRIES_COLUMNS)
      .gte("work_date", from)
      .lte("work_date", to),
    resolveCabAppSettingsResolvedServer(),
  ]);
  if (empRes.error) return err(empRes.error.message);
  if (entRes.error) return err(entRes.error.message);
  const allEmployees = (empRes.data ?? []) as DipendenteTimesheetEmployeeRow[];
  const entries = (entRes.data ?? []) as DipendenteTimesheetEntryRow[];
  const addettiRecords = settings.lavorazioni.addettiRecords;
  const currentAddettiIds = new Set(addettiRecords.map((a) => a.id));
  const employees = selectTimesheetEmployeesForPdfExport(allEmployees, entries, currentAddettiIds);
  return success(
    buildDipendentiPdfContext({
      monthKey,
      employees,
      entries,
      tipiAssenza: settings.dipendenti.tipiAssenza,
      addettiRecords,
    }),
  );
}
