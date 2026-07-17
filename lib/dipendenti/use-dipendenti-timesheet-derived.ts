"use client";

import { useCallback, useMemo } from "react";
import {
  employeeIdsWithEntriesInPeriod,
  selectTimesheetEmployeesForDisplay,
  sortTimesheetEmployeesForDisplay,
} from "@/lib/dipendenti/dipendenti-employee-display";
import { entryToCellValue } from "@/lib/dipendenti/timesheet-totals";
import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
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
  realAddettiRecords: readonly AddettoRecord[],
  addettiReady: boolean,
  currentAddettiIds: ReadonlySet<string>,
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
    () => sortTimesheetEmployeesForDisplay(employees, realAddettiRecords),
    [employees, realAddettiRecords],
  );

  const displayEmployees = useMemo(
    () =>
      addettiReady
        ? selectTimesheetEmployeesForDisplay(
            sortedEmployees,
            employeeIdsWithEntriesInPeriodSet,
            currentAddettiIds,
          )
        : [],
    [addettiReady, sortedEmployees, employeeIdsWithEntriesInPeriodSet, currentAddettiIds],
  );

  return {
    entriesByKey,
    getCellValue,
    sortedEmployees,
    displayEmployees,
    employeeIdsWithEntriesInPeriod: employeeIdsWithEntriesInPeriodSet,
  };
}
