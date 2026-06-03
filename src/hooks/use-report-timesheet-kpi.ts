"use client";

import { useMemo } from "react";
import type { DateRange } from "@/lib/report/date-ranges";
import { dateYmdFromDate, formatMonthLabel, monthKeyFromDate, shiftMonthKey } from "@/lib/dipendenti/timesheet-month";
import type { DipendenteTimesheetEmployeeRow, DipendenteTimesheetEntryRow } from "@/lib/dipendenti/types";
import { useServiceQuery } from "@/src/hooks/use-service-query";
import { QK } from "@/src/lib/react-query/query-keys";
import { dipendentiTimesheetService } from "@/src/services/dipendenti-timesheet.service";

function entriesQueryKey(from: string, to: string) {
  return [...QK.dipendentiTimesheetEntries, from, to] as const;
}

function reportTimesheetPeriodLabel(range: DateRange): string {
  const startKey = monthKeyFromDate(range.start);
  const endKey = monthKeyFromDate(range.end);
  if (startKey === endKey) return formatMonthLabel(endKey);
  return `${dateYmdFromDate(range.start)} – ${dateYmdFromDate(range.end)}`;
}

export function useReportTimesheetKpi(filterRange: DateRange) {
  const from = dateYmdFromDate(filterRange.start);
  const to = dateYmdFromDate(filterRange.end);
  const monthKeyEnd = monthKeyFromDate(filterRange.end);
  const monthKeyStart = monthKeyFromDate(filterRange.start);
  const singleMonth = monthKeyStart === monthKeyEnd;
  const previousMonthKey = shiftMonthKey(monthKeyEnd, -1);

  const employeesQuery = useServiceQuery(QK.dipendentiTimesheetEmployees, () =>
    dipendentiTimesheetService.listEmployees(),
  );

  const entriesQuery = useServiceQuery(entriesQueryKey(from, to), () =>
    dipendentiTimesheetService.listEntriesForRange(from, to),
  );

  const previousMonthQuery = useServiceQuery(
    [...QK.dipendentiTimesheetEntries, "prev", previousMonthKey] as const,
    () => dipendentiTimesheetService.listEntriesForMonth(previousMonthKey),
    { enabled: singleMonth },
  );

  const periodLabel = useMemo(() => reportTimesheetPeriodLabel(filterRange), [filterRange]);

  const isLoading =
    employeesQuery.isPending || entriesQuery.isPending || (singleMonth && previousMonthQuery.isPending);
  const isError = employeesQuery.isError || entriesQuery.isError;

  return {
    periodLabel,
    singleMonth,
    isLoading,
    isError,
    employees: (employeesQuery.data ?? []) as DipendenteTimesheetEmployeeRow[],
    entries: (entriesQuery.data ?? []) as DipendenteTimesheetEntryRow[],
    previousMonthEntries: singleMonth
      ? ((previousMonthQuery.data ?? []) as DipendenteTimesheetEntryRow[])
      : [],
    refetch: () => {
      void employeesQuery.refetch();
      void entriesQuery.refetch();
      if (singleMonth) void previousMonthQuery.refetch();
    },
  };
}
