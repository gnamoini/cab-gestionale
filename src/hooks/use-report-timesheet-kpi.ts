"use client";

import { useMemo } from "react";
import type { DateRange } from "@/lib/report/date-ranges";
import { filterEntriesForReportTimesheetKpi } from "@/lib/dipendenti/timesheet-report-kpi-filter";
import { resolveReportTimesheetRange } from "@/lib/dipendenti/timesheet-report-range";
import { shiftMonthKey } from "@/lib/dipendenti/timesheet-month";
import type { DipendenteTimesheetEmployeeRow, DipendenteTimesheetEntryRow } from "@/lib/dipendenti/types";
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import { useServiceQuery } from "@/src/hooks/use-service-query";
import { QK } from "@/src/lib/react-query/query-keys";
import { dipendentiTimesheetEntry } from "@/lib/domain/dipendenti-timesheet-entry";

function entriesQueryKey(from: string, to: string) {
  return [...QK.dipendentiTimesheetEntries, from, to] as const;
}

export function useReportTimesheetKpi(filterRange: DateRange) {
  const { dipendenti: dipendentiOpts } = useGlobalOptions({ debugTag: "useReportTimesheetKpi" });
  const tipiAssenza = dipendentiOpts.tipiAssenza;

  const timesheetRange = useMemo(() => resolveReportTimesheetRange(filterRange), [filterRange]);
  const { from, to, periodLabel, showMonthDelta, monthKey } = timesheetRange;
  const previousMonthKey = monthKey ? shiftMonthKey(monthKey, -1) : null;

  const employeesQuery = useServiceQuery(QK.dipendentiTimesheetEmployees, () =>
    dipendentiTimesheetEntry.listEmployees(),
  );

  const entriesQuery = useServiceQuery(entriesQueryKey(from, to), () =>
    dipendentiTimesheetEntry.listEntriesForRange(from, to),
  );

  const previousMonthQuery = useServiceQuery(
    [...QK.dipendentiTimesheetEntries, "prev", previousMonthKey ?? ""] as const,
    () => dipendentiTimesheetEntry.listEntriesForMonth(previousMonthKey!),
    { enabled: showMonthDelta && previousMonthKey != null },
  );

  const isLoading =
    employeesQuery.isPending ||
    entriesQuery.isPending ||
    (showMonthDelta && previousMonthQuery.isPending);
  const isError = employeesQuery.isError || entriesQuery.isError;

  const rawEntries = (entriesQuery.data ?? []) as DipendenteTimesheetEntryRow[];
  const rawPreviousEntries = showMonthDelta
    ? ((previousMonthQuery.data ?? []) as DipendenteTimesheetEntryRow[])
    : [];

  const entries = useMemo(
    () => filterEntriesForReportTimesheetKpi(rawEntries, tipiAssenza),
    [rawEntries, tipiAssenza],
  );
  const previousMonthEntries = useMemo(
    () => filterEntriesForReportTimesheetKpi(rawPreviousEntries, tipiAssenza),
    [rawPreviousEntries, tipiAssenza],
  );

  return {
    periodLabel,
    singleMonth: showMonthDelta,
    isLoading,
    isError,
    employees: (employeesQuery.data ?? []) as DipendenteTimesheetEmployeeRow[],
    entries,
    previousMonthEntries,
    refetch: () => {
      void employeesQuery.refetch();
      void entriesQuery.refetch();
      if (showMonthDelta) void previousMonthQuery.refetch();
    },
  };
}
