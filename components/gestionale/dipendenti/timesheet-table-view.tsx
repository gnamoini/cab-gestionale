"use client";

import { useMemo } from "react";
import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import {
  canShiftWeekAnchorInMonth,
  filterMonthDaysByWeek,
  shiftWeekAnchor,
  weekRangeFromAnchor,
  type TimesheetDayInfo,
} from "@/lib/dipendenti/timesheet-month";
import type { TipoAssenzaConfig } from "@/lib/dipendenti/tipi-assenza-model";
import type {
  DipendenteTimesheetEmployeeRow,
  TimesheetCellValue,
  TimesheetMonthKey,
} from "@/lib/dipendenti/types";
import { DipendentiTimesheetGrid } from "@/components/gestionale/dipendenti/dipendenti-timesheet-grid";
import {
  CalendarNavChevronLeft,
  CalendarNavChevronRight,
} from "@/components/gestionale/global-input/calendar-nav-icons";
import { weekRangeLabel } from "@/lib/report/calendar-report-service";
import { dsPageToolbarIconBtn } from "@/lib/ui/design-system";
import type { ListSurface } from "@/lib/ui/resolve-list-surface";

function TimesheetWeekNav({
  monthKey,
  weekAnchor,
  onWeekAnchor,
}: {
  monthKey: TimesheetMonthKey;
  weekAnchor: string;
  onWeekAnchor: (ymd: string) => void;
}) {
  const { from, to } = weekRangeFromAnchor(weekAnchor);
  const label = weekRangeLabel(from, to);
  const canPrev = canShiftWeekAnchorInMonth(monthKey, weekAnchor, -1);
  const canNext = canShiftWeekAnchorInMonth(monthKey, weekAnchor, 1);

  return (
    <div
      className="flex min-w-0 items-center justify-center gap-1"
      role="group"
      aria-label="Navigazione settimana"
    >
      <button
        type="button"
        className={dsPageToolbarIconBtn}
        aria-label="Settimana precedente"
        disabled={!canPrev}
        onClick={() => canPrev && onWeekAnchor(shiftWeekAnchor(weekAnchor, -1))}
      >
        <CalendarNavChevronLeft />
      </button>
      <span className="min-w-0 flex-1 truncate px-1 text-center text-sm font-medium tabular-nums text-[color:var(--cab-text)]">
        {label}
      </span>
      <button
        type="button"
        className={dsPageToolbarIconBtn}
        aria-label="Settimana successiva"
        disabled={!canNext}
        onClick={() => canNext && onWeekAnchor(shiftWeekAnchor(weekAnchor, 1))}
      >
        <CalendarNavChevronRight />
      </button>
    </div>
  );
}

export function TimesheetTableView({
  listSurface,
  monthKey,
  periodDays,
  weekAnchor,
  onWeekAnchor,
  employees,
  filterEmployeeId,
  getCellValue,
  onCellClick,
  onEmployeeClick,
  tipiAssenza,
  addettiRecords = [],
  readOnly,
  accentDateYmd = null,
  accentFadingOut = false,
}: {
  listSurface: ListSurface;
  monthKey: TimesheetMonthKey;
  periodDays: readonly TimesheetDayInfo[];
  weekAnchor: string;
  onWeekAnchor: (ymd: string) => void;
  employees: readonly DipendenteTimesheetEmployeeRow[];
  filterEmployeeId: string;
  getCellValue: (dipendenteId: string, workDate: string) => TimesheetCellValue;
  onCellClick: (dipendenteId: string, workDate: string) => void;
  onEmployeeClick: (employee: DipendenteTimesheetEmployeeRow) => void;
  tipiAssenza: readonly TipoAssenzaConfig[];
  addettiRecords?: readonly AddettoRecord[];
  readOnly?: boolean;
  accentDateYmd?: string | null;
  accentFadingOut?: boolean;
}) {
  const isMobile = listSurface !== "table";

  const displayDays = useMemo(() => {
    if (!isMobile) return periodDays;
    return filterMonthDaysByWeek(periodDays, weekAnchor);
  }, [isMobile, periodDays, weekAnchor]);

  return (
    <div className="flex-safe-col min-w-0 max-w-full gap-3">
      {isMobile ? (
        <TimesheetWeekNav monthKey={monthKey} weekAnchor={weekAnchor} onWeekAnchor={onWeekAnchor} />
      ) : null}
      <DipendentiTimesheetGrid
        monthKey={monthKey}
        days={displayDays}
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
    </div>
  );
}
