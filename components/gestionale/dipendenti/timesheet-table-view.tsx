"use client";

import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import type { TimesheetDayInfo } from "@/lib/dipendenti/timesheet-month";
import type { TipoAssenzaConfig } from "@/lib/dipendenti/tipi-assenza-model";
import type {
  DipendenteTimesheetEmployeeRow,
  DipendenteTimesheetEntryRow,
  TimesheetCellValue,
  TimesheetMonthKey,
} from "@/lib/dipendenti/types";
import { DipendentiMobileDayList } from "@/components/gestionale/dipendenti/dipendenti-mobile-day-list";
import { DipendentiTimesheetGrid } from "@/components/gestionale/dipendenti/dipendenti-timesheet-grid";
import type { GestionaleListLayout } from "@/lib/ui/use-gestionale-list-layout";

export function TimesheetTableView({
  listLayout,
  monthKey,
  periodDays,
  employees,
  filterEmployeeId,
  getCellValue,
  onCellClick,
  onEmployeeClick,
  entries,
  tipiAssenza,
  addettiRecords = [],
  readOnly,
  accentDateYmd = null,
  accentFadingOut = false,
}: {
  listLayout: GestionaleListLayout;
  monthKey: TimesheetMonthKey;
  periodDays: readonly TimesheetDayInfo[];
  employees: readonly DipendenteTimesheetEmployeeRow[];
  filterEmployeeId: string;
  getCellValue: (dipendenteId: string, workDate: string) => TimesheetCellValue;
  onCellClick: (dipendenteId: string, workDate: string) => void;
  onEmployeeClick: (employee: DipendenteTimesheetEmployeeRow) => void;
  entries: readonly DipendenteTimesheetEntryRow[];
  tipiAssenza: readonly TipoAssenzaConfig[];
  addettiRecords?: readonly AddettoRecord[];
  readOnly?: boolean;
  accentDateYmd?: string | null;
  accentFadingOut?: boolean;
}) {
  return (
    <div className="flex-safe-col min-w-0 max-w-full gap-3">
      {listLayout === "desktop" ? (
      <DipendentiTimesheetGrid
        monthKey={monthKey}
        days={periodDays}
        employees={employees}
        filterEmployeeId={filterEmployeeId}
        getCellValue={getCellValue}
        onCellClick={onCellClick}
        onEmployeeClick={onEmployeeClick}
        tipiAssenza={tipiAssenza}
        addettiRecords={addettiRecords}
        readOnly={readOnly}
        accentDateYmd={accentDateYmd}
        accentFadingOut={accentFadingOut}
      />
      ) : null}
      {listLayout === "mobile" ? (
      <DipendentiMobileDayList
        periodDays={periodDays}
        employees={employees}
        filterEmployeeId={filterEmployeeId}
        getCellValue={getCellValue}
        onDayClick={onCellClick}
        onEmployeeClick={onEmployeeClick}
        entries={entries}
        tipiAssenza={tipiAssenza}
        readOnly={readOnly}
      />
      ) : null}
    </div>
  );
}
