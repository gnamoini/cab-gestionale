"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  WEEKDAYS_IT,
  buildMonthGrid,
  toYmd,
} from "@/components/gestionale/global-input/calendar-utils";
import { CalendarMonthYearPicker } from "@/components/gestionale/global-input/calendar-month-year-picker";
import {
  CalendarNavChevronLeft,
  CalendarNavChevronRight,
  CalendarTodayIcon,
} from "@/components/gestionale/global-input/calendar-nav-icons";
import type { CalendarSelection, CalendarViewMode } from "@/components/dashboard/calendar-v2/calendar-v2-types";
import { groupCellsByWeek, weekStartYmdFromYmd } from "@/lib/report/calendar-report-service";
import { weekRangeFromYmd, ymdFromDate } from "@/lib/report/date-ranges";
import {
  dsPageToolbarIconBtn,
  dsTypoCaption,
} from "@/lib/ui/design-system";
import {
  globalInputCalendarDayBtn,
  globalInputCalendarDaySelected,
  globalInputCalendarDayToday,
  globalInputCalendarGridShell,
} from "@/lib/ui/global-input";

const dayBtnClass = `${globalInputCalendarDayBtn} relative touch-manipulation`;

export function CalendarV2Grid({
  monthKey,
  onMonthKeyChange,
  selection,
  onSelectDay,
  onSelectWeek,
  viewMode,
  onViewModeChange,
  hasDataByDate,
  isLoading = false,
  onGoToday,
}: {
  monthKey: string;
  onMonthKeyChange: (monthKey: string) => void;
  selection: CalendarSelection;
  onSelectDay: (ymd: string) => void;
  onSelectWeek: (weekStartYmd: string, weekEndYmd: string) => void;
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
  hasDataByDate: Record<string, boolean>;
  isLoading?: boolean;
  onGoToday?: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [yearStr, monthStr] = monthKey.split("-");
  const viewYear = Number(yearStr);
  const viewMonth = Number(monthStr) - 1;

  const cells = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const weeks = useMemo(() => groupCellsByWeek(cells), [cells]);
  const todayYmd = mounted ? toYmd(new Date()) : "";

  const selectedDayYmd = selection.mode === "day" ? selection.ymd : null;
  const selectedWeekStart = selection.mode === "week" ? selection.weekStartYmd : null;

  const shiftMonth = useCallback(
    (delta: number) => {
      const d = new Date(viewYear, viewMonth + delta, 1, 12, 0, 0, 0);
      onMonthKeyChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    },
    [viewYear, viewMonth, onMonthKeyChange],
  );

  const applyMonthYear = useCallback(
    (year: number, month: number) => {
      onMonthKeyChange(`${year}-${String(month + 1).padStart(2, "0")}`);
    },
    [onMonthKeyChange],
  );

  return (
    <div className={`${globalInputCalendarGridShell} min-w-0`}>
      <div className="mb-2 flex min-w-0 flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex min-w-0 items-center gap-1">
          <button
            type="button"
            className={dsPageToolbarIconBtn}
            aria-label="Mese precedente"
            onClick={() => shiftMonth(-1)}
          >
            <CalendarNavChevronLeft />
          </button>
          <CalendarMonthYearPicker
            viewYear={viewYear}
            viewMonth={viewMonth}
            variant="grid"
            onApply={applyMonthYear}
          />
          <button
            type="button"
            className={dsPageToolbarIconBtn}
            aria-label="Mese successivo"
            onClick={() => shiftMonth(1)}
          >
            <CalendarNavChevronRight />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <div className="inline-flex rounded-lg border border-[color:var(--cab-border)] p-0.5">
            {(["month", "week"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                  viewMode === mode
                    ? "bg-[color:color-mix(in_srgb,var(--cab-primary)_14%,var(--cab-surface))] text-[color:var(--cab-text)]"
                    : "text-[color:var(--cab-text-muted)] hover:bg-[var(--cab-hover)]"
                }`}
                onClick={() => onViewModeChange(mode)}
              >
                {mode === "month" ? "Mese" : "Settimana"}
              </button>
            ))}
          </div>
          {onGoToday ? (
            <button type="button" className={dsPageToolbarIconBtn} aria-label="Oggi" onClick={onGoToday}>
              <CalendarTodayIcon />
            </button>
          ) : null}
        </div>
      </div>

      <div
        className={`px-2 pt-1 transition-opacity duration-200 ${isLoading ? "opacity-55" : "opacity-100"}`}
      >
        <div className="mb-1 grid grid-cols-7 gap-0.5">
          {WEEKDAYS_IT.map((wd) => (
            <span
              key={wd}
              className={`${dsTypoCaption} flex items-center justify-center py-1 text-center text-[10px] font-bold uppercase text-[color:var(--cab-text-muted)]`}
            >
              {wd}
            </span>
          ))}
        </div>

        {weeks.map((weekCells, wi) => {
          const weekStart = weekStartYmdFromYmd(weekCells[0]?.ymd ?? "") ?? "";
          const weekEnd = weekRangeFromYmd(weekStart)?.end;
          const weekEndYmd = weekEnd ? ymdFromDate(weekEnd) : weekStart;
          const weekSelected = selectedWeekStart === weekStart && selection.mode === "week";

          return (
            <div key={wi} className="min-w-0">
              {viewMode === "week" ? (
                <button
                  type="button"
                  className={`mb-0.5 w-full rounded-md py-0.5 text-left text-[10px] font-semibold uppercase tracking-wide ${
                    weekSelected
                      ? "bg-[color:color-mix(in_srgb,var(--cab-primary)_12%,var(--cab-surface))] text-[color:var(--cab-primary)]"
                      : "text-[color:var(--cab-text-muted)] hover:bg-[var(--cab-hover)]"
                  }`}
                  onClick={() => onSelectWeek(weekStart, weekEndYmd)}
                >
                  Sett. {weekStart.slice(5).replace("-", "/")}
                </button>
              ) : null}
              <div className="grid grid-cols-7 justify-items-center gap-0.5 pb-0.5">
                {weekCells.map((cell) => {
                  const selected = selectedDayYmd === cell.ymd;
                  const inSelectedWeek =
                    selection.mode === "week" &&
                    weekStart &&
                    cell.ymd >= weekStart &&
                    cell.ymd <= weekEndYmd;
                  const isToday = mounted && todayYmd === cell.ymd;
                  const hasData = hasDataByDate[cell.ymd] === true && cell.inMonth;
                  return (
                    <button
                      key={cell.ymd}
                      type="button"
                      disabled={!cell.inMonth}
                      className={`${dayBtnClass} ${
                        !cell.inMonth ? "pointer-events-none opacity-25" : ""
                      } ${selected || inSelectedWeek ? globalInputCalendarDaySelected : ""} ${
                        isToday && !selected ? globalInputCalendarDayToday : ""
                      }`}
                      aria-label={cell.date.toLocaleDateString("it-IT")}
                      aria-pressed={Boolean(selected || inSelectedWeek)}
                      onClick={() => {
                        if (viewMode === "week") {
                          onSelectWeek(weekStart, weekEndYmd);
                        } else {
                          onSelectDay(cell.ymd);
                        }
                      }}
                    >
                      {cell.date.getDate()}
                      {hasData ? (
                        <span
                          className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[color:var(--cab-primary)]"
                          aria-hidden
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
