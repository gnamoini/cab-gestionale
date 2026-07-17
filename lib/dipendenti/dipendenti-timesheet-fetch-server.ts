import "server-only";

import {
  DIPENDENTI_TIMESHEET_EMPLOYEES_COLUMNS,
  DIPENDENTI_TIMESHEET_ENTRIES_COLUMNS,
} from "@/lib/db/table-select-columns";
import type { TimesheetMonthKey } from "@/lib/dipendenti/types";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { DipendenteTimesheetEmployeeRow, DipendenteTimesheetEntryRow } from "@/src/types/supabase-tables";

async function assertDipendentiRead(): Promise<boolean> {
  return verifyServerPageRead("dipendenti");
}

export async function fetchDipendentiEmployeesServer(): Promise<
  ServiceResult<DipendenteTimesheetEmployeeRow[]>
> {
  const allowed = await assertDipendentiRead();
  if (!allowed) return err("Permesso richiesto.");
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb
    .from("dipendenti_timesheet_employees")
    .select(DIPENDENTI_TIMESHEET_EMPLOYEES_COLUMNS)
    .order("display_name");
  if (error) return err(error.message);
  return success((data ?? []) as DipendenteTimesheetEmployeeRow[]);
}

export async function fetchDipendentiEntriesForRangeServer(
  from: string,
  to: string,
): Promise<ServiceResult<DipendenteTimesheetEntryRow[]>> {
  const allowed = await assertDipendentiRead();
  if (!allowed) return err("Permesso richiesto.");
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb
    .from("dipendenti_timesheet_entries")
    .select(DIPENDENTI_TIMESHEET_ENTRIES_COLUMNS)
    .gte("work_date", from)
    .lte("work_date", to);
  if (error) return err(error.message);
  return success((data ?? []) as DipendenteTimesheetEntryRow[]);
}

export async function fetchDipendentiMonthKeysServer(): Promise<ServiceResult<TimesheetMonthKey[]>> {
  const allowed = await assertDipendentiRead();
  if (!allowed) return err("Permesso richiesto.");
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb.rpc("list_timesheet_month_keys");
  if (error) return err(error.message);
  const rows = (data ?? []) as { month_key?: string }[];
  const keys = rows
    .map((row) => row.month_key)
    .filter((k): k is string => typeof k === "string" && /^\d{4}-\d{2}$/.test(k));
  return success(keys as TimesheetMonthKey[]);
}
