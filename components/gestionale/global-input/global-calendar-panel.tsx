"use client";

import { useEffect, useMemo, useState } from "react";
import {
  WEEKDAYS_IT,
  addMonths,
  buildMonthGrid,
  toYmd,
  ymdToLocalDate,
} from "@/components/gestionale/global-input/calendar-utils";
import { CalendarMonthYearPicker } from "@/components/gestionale/global-input/calendar-month-year-picker";
import {
  CalendarNavChevronLeft,
  CalendarNavChevronRight,
} from "@/components/gestionale/global-input/calendar-nav-icons";
import {
  globalInputCalendarDayBtn,
  globalInputCalendarDaySelected,
  globalInputCalendarDayToday,
  globalInputCalendarNavBtn,
  globalInputCalendarPanel,
} from "@/lib/ui/global-input";

export function GlobalCalendarPanel({
  selectedYmd,
  viewYear,
  viewMonth,
  onViewChange,
  onSelectYmd,
  panelClassName = globalInputCalendarPanel,
}: {
  selectedYmd: string;
  viewYear: number;
  viewMonth: number;
  onViewChange: (year: number, month: number) => void;
  onSelectYmd: (ymd: string) => void;
  panelClassName?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [todayYmd, setTodayYmd] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state in effect lifecycle
    setMounted(true);
    setTodayYmd(toYmd(new Date()));
  }, []);

  const cells = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  return (
    <div
      className={panelClassName}
      role="dialog"
      aria-label="Calendario"
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          className={globalInputCalendarNavBtn}
          aria-label="Mese precedente"
          onClick={() => {
            const n = addMonths(viewYear, viewMonth, -1);
            onViewChange(n.year, n.month);
          }}
        >
          <CalendarNavChevronLeft />
        </button>
        <CalendarMonthYearPicker
          viewYear={viewYear}
          viewMonth={viewMonth}
          variant="popup"
          onApply={onViewChange}
        />
        <button
          type="button"
          className={globalInputCalendarNavBtn}
          aria-label="Mese successivo"
          onClick={() => {
            const n = addMonths(viewYear, viewMonth, 1);
            onViewChange(n.year, n.month);
          }}
        >
          <CalendarNavChevronRight />
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7 gap-0.5">
        {WEEKDAYS_IT.map((wd) => (
          <span
            key={wd}
            className="py-1 text-center text-[10px] font-bold uppercase text-[color:var(--cab-text-muted)]"
          >
            {wd}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((cell) => {
          const selected = selectedYmd === cell.ymd;
          const isToday = mounted && todayYmd === cell.ymd;
          return (
            <button
              key={cell.ymd}
              type="button"
              disabled={!cell.inMonth}
              className={`${globalInputCalendarDayBtn} ${
                !cell.inMonth ? "pointer-events-none opacity-25" : ""
              } ${selected ? globalInputCalendarDaySelected : ""} ${isToday && !selected ? globalInputCalendarDayToday : ""}`}
              aria-label={cell.date.toLocaleDateString("it-IT")}
              aria-pressed={selected}
              onClick={() => onSelectYmd(cell.ymd)}
            >
              {cell.date.getDate()}
            </button>
          );
        })}
      </div>
      {selectedYmd ? (
        <button
          type="button"
          className="mt-2 w-full rounded-md py-1.5 text-[11px] font-semibold text-[color:var(--cab-text-muted)] transition hover:bg-[var(--cab-hover)] hover:text-[color:var(--cab-text)]"
          onClick={() => onSelectYmd("")}
        >
          Cancella data
        </button>
      ) : null}
    </div>
  );
}

export function parseDisplayToYmd(display: string): string {
  const s = display.trim();
  if (!s) return "";
  const isoSlash = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s);
  if (isoSlash) {
    const day = parseInt(isoSlash[1], 10);
    const mo = parseInt(isoSlash[2], 10);
    const y = parseInt(isoSlash[3], 10);
    const d = new Date(y, mo - 1, day, 12, 0, 0, 0);
    if (d.getFullYear() === y && d.getMonth() === mo - 1 && d.getDate() === day) return toYmd(d);
  }
  const isoYmd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (isoYmd) return s;
  return "";
}

export function initialViewFromYmd(ymd: string): { year: number; month: number } {
  const d = ymdToLocalDate(ymd) ?? new Date();
  return { year: d.getFullYear(), month: d.getMonth() };
}
