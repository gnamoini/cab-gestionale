"use client";

import { useCallback, useMemo } from "react";
import {
  employeeIdsWithEntriesInPeriod,
  selectTimesheetEmployeesForDisplay,
  sortTimesheetEmployeesForDisplay,
} from "@/lib/dipendenti/dipendenti-employee-display";
import { entryToCellValue } from "@/lib/dipendenti/timesheet-totals";
import type { DipendenteRecord } from "@/lib/dipendenti/dipendente-record";
import type {
  DipendenteTimesheetEmployeeRow,
  DipendenteTimesheetEntryRow,
  TimesheetCellValue,
} from "@/lib/dipendenti/types";

export type DipendentiTimesheetDerived = {
  entriesByKey: Map<string, DipendenteTimesheetEntryRow>;
  getCellValue: (dipendenteId: string, workDate: string) => TimesheetCellValue;
  sortedEmployees: DipendenteTimesheetEmployeeRow[];
  displayEmployees: DipendenteTimesheetEmployeeRow[];
  employeeIdsWithEntriesInPeriod: Set<string>;
};

/** Index entries + display list per griglia presenze. */
export function useDipendentiTimesheetDerived(
  employees: readonly DipendenteTimesheetEmployeeRow[],
  entries: readonly DipendenteTimesheetEntryRow[],
  realDipendentiRecords: readonly DipendenteRecord[],
  dipendentiReady: boolean,
  currentDipendentiIds: ReadonlySet<string>,
): DipendentiTimesheetDerived {
  const entriesByKey = useMemo(() => {
    const map = new Map<string, DipendenteTimesheetEntryRow>();
    for (const e of entries) {
      map.set(`${e.dipendente_id}|${e.work_date}`, e);
    }
    return map;
  }, [entries]);

  const getCellValue = useCallback(
    (dipendenteId: string, workDate: string): TimesheetCellValue => {
      return entryToCellValue(entriesByKey.get(`${dipendenteId}|${workDate}`));
    },
    [entriesByKey],
  );

  const employeeIdsWithEntriesInPeriodSet = useMemo(
    () => employeeIdsWithEntriesInPeriod(entries),
    [entries],
  );

  const sortedEmployees = useMemo(
    () => sortTimesheetEmployeesForDisplay(employees, realDipendentiRecords),
    [employees, realDipendentiRecords],
  );

  const displayEmployees = useMemo(
    () =>
      dipendentiReady
        ? selectTimesheetEmployeesForDisplay(
            sortedEmployees,
            employeeIdsWithEntriesInPeriodSet,
            currentDipendentiIds,
          )
        : [],
    [dipendentiReady, sortedEmployees, employeeIdsWithEntriesInPeriodSet, currentDipendentiIds],
  );

  return {
    entriesByKey,
    getCellValue,
    sortedEmployees,
    displayEmployees,
    employeeIdsWithEntriesInPeriod: employeeIdsWithEntriesInPeriodSet,
  };
}
