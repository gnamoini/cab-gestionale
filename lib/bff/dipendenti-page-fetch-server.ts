import "server-only";

import { cache } from "react";
import {
  fetchDipendentiEmployeesServer,
  fetchDipendentiEntriesForRangeServer,
  fetchDipendentiMonthKeysServer,
} from "@/lib/dipendenti/dipendenti-timesheet-fetch-server";
import { monthDateRange, monthKeyFromDate } from "@/lib/dipendenti/timesheet-month";
import type { DipendenteTimesheetEmployeeRow, DipendenteTimesheetEntryRow, TimesheetMonthKey } from "@/lib/dipendenti/types";
import type { ServiceResult } from "@/src/services/service-result";

export type DipendentiPageDTO = {
  monthKey: TimesheetMonthKey;
  from: string;
  to: string;
  employees: DipendenteTimesheetEmployeeRow[];
  entries: DipendenteTimesheetEntryRow[];
  monthKeys: TimesheetMonthKey[];
};

function unwrap<T>(result: ServiceResult<T>, fallback: T): T {
  return result.success ? (result.data ?? fallback) : fallback;
}

/** BFF pagina Dipendenti — registro + presenze mese corrente (request-scoped cache). */
export const fetchDipendentiPageDTOServer = cache(async (): Promise<DipendentiPageDTO> => {
  const monthKey = monthKeyFromDate(new Date());
  const { from, to } = monthDateRange(monthKey);
  const [employeesRes, entriesRes, monthKeysRes] = await Promise.all([
    fetchDipendentiEmployeesServer(),
    fetchDipendentiEntriesForRangeServer(from, to),
    fetchDipendentiMonthKeysServer(),
  ]);
  return {
    monthKey,
    from,
    to,
    employees: unwrap(employeesRes, []),
    entries: unwrap(entriesRes, []),
    monthKeys: unwrap(monthKeysRes, []),
  };
});
