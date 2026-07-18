"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { LoadingSpinner } from "@/components/design-system/loading";
import { CalendarMonthYearPicker } from "@/components/gestionale/global-input/calendar-month-year-picker";
import {
  CalendarNavChevronLeft,
  CalendarNavChevronRight,
  CalendarTodayIcon,
} from "@/components/gestionale/global-input/calendar-nav-icons";
import {
  WEEKDAYS_IT,
  addMonths,
  buildMonthGrid,
  toYmd,
} from "@/components/gestionale/global-input/calendar-utils";
import {
  dsFocus,
  dsPageToolbarBtn,
  dsPageToolbarIconBtn,
  dsTypoCaption,
} from "@/lib/ui/design-system";
import {
  globalInputCalendarDayBtn,
  globalInputCalendarDaySelected,
  globalInputCalendarDayToday,
  globalInputCalendarGridShell,
} from "@/lib/ui/global-input";

const promemoriaDayBtnClass = `${globalInputCalendarDayBtn} relative touch-manipulation motion-reduce:transition-none`;


export function DashboardPromemoriaCalendar({
  selectedYmd,
  onSelectYmd,
  countsByDate,
  viewMonthKey,
  onViewMonthKeyChange,
  isMonthLoading = false,
  isCurrentMonthView = true,
  isOnTodayView = true,
  onGoToday,
  readOnly = false,
  onCreatePromemoria,
}: {
  selectedYmd: string;
  onSelectYmd: (ymd: string) => void;
  countsByDate: Record<string, number>;
  viewMonthKey: string;
  onViewMonthKeyChange: (year: number, month1: number) => void;
  isMonthLoading?: boolean;
  isCurrentMonthView?: boolean;
  isOnTodayView?: boolean;
  onGoToday?: () => void;
  readOnly?: boolean;
  onCreatePromemoria?: () => void;
}) {
  const { year, month } = useMemo(() => {
    const [y, m] = viewMonthKey.split("-");
    return { year: Number(y), month: Number(m) };
  }, [viewMonthKey]);

  const [mounted, setMounted] = useState(false);
  const [todayYmd, setTodayYmd] = useState("");
  const [navDir, setNavDir] = useState<-1 | 0 | 1>(0);
  const prevMonthKeyRef = useRef(viewMonthKey);

  useEffect(() => {
    setMounted(true);
    setTodayYmd(toYmd(new Date()));
  }, []);

  useEffect(() => {
    if (prevMonthKeyRef.current === viewMonthKey) return;
    prevMonthKeyRef.current = viewMonthKey;
    if (navDir === 0) return;
    const timer = window.setTimeout(() => setNavDir(0), 240);
    return () => window.clearTimeout(timer);
  }, [viewMonthKey, navDir]);

  const cells = useMemo(() => buildMonthGrid(year, month - 1), [year, month]);

  function shiftViewMonth(delta: -1 | 1) {
    setNavDir(delta);
    const n = addMonths(year, month - 1, delta);
    onViewMonthKeyChange(n.year, n.month + 1);
  }

  function jumpToMonth(targetYear: number, month1: number) {
    setNavDir(0);
    onViewMonthKeyChange(targetYear, month1);
  }

  function handleDayActivate(ymd: string, inMonth: boolean) {
    if (!inMonth || readOnly || !onCreatePromemoria) return;
    onSelectYmd(ymd);
    onCreatePromemoria();
  }

  function handleDayClick(ymd: string, inMonth: boolean) {
    if (!inMonth) return;
    if (selectedYmd === ymd && !readOnly && onCreatePromemoria) {
      onCreatePromemoria();
      return;
    }
    onSelectYmd(ymd);
  }

  const gridSlideStyle: CSSProperties | undefined =
    navDir !== 0 ? { ["--promemoria-cal-slide" as string]: navDir > 0 ? "10px" : "-10px" } : undefined;

  return (
    <div className="min-w-0" aria-label="Calendario promemoria">
      <div className="mb-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-nowrap sm:items-center sm:gap-2">
        <div className="flex min-w-0 w-full items-center gap-1 sm:flex-1 sm:gap-2">
          <button
            type="button"
            className={`${dsPageToolbarIconBtn} ${dsFocus} shrink-0`}
            aria-label="Mese precedente"
            onClick={() => shiftViewMonth(-1)}
          >
            <CalendarNavChevronLeft />
          </button>
          <div
            className={`flex min-w-0 flex-1 items-center justify-center ${isMonthLoading ? "opacity-60" : "opacity-100"}`}
          >
            <CalendarMonthYearPicker
              viewYear={year}
              viewMonth={month - 1}
              variant="grid"
              disabled={isMonthLoading}
              onApply={(y, m) => jumpToMonth(y, m + 1)}
            />
            {isMonthLoading ? (
              <LoadingSpinner
                size="sm"
                label="Caricamento mese"
                className="ms-1 shrink-0 text-[color:var(--cab-text-muted)]"
              />
            ) : null}
          </div>
          <button
            type="button"
            className={`${dsPageToolbarIconBtn} ${dsFocus} shrink-0`}
            aria-label="Mese successivo"
            onClick={() => shiftViewMonth(1)}
          >
            <CalendarNavChevronRight />
          </button>
        </div>
        {onGoToday ? (
          <button
            type="button"
            aria-pressed={!isCurrentMonthView}
            aria-label={
              isOnTodayView
                ? "Oggi già selezionato"
                : isCurrentMonthView
                  ? "Vai al giorno di oggi"
                  : "Torna al mese corrente"
            }
            disabled={isOnTodayView}
            className={`${dsPageToolbarBtn} ${dsFocus} w-full min-h-[2.5rem] shrink-0 touch-manipulation sm:w-auto sm:min-h-0 ${isOnTodayView ? "cursor-default opacity-70" : ""}`}
            onClick={onGoToday}
          >
            <CalendarTodayIcon />
            <span>Oggi</span>
          </button>
        ) : null}
      </div>

      <div
        className={globalInputCalendarGridShell}
        key={viewMonthKey}
        aria-busy={isMonthLoading || undefined}
      >
        <div
          className={`px-2 pt-2 transition-opacity duration-200 motion-reduce:transition-none ${isMonthLoading ? "opacity-55" : "opacity-100"}`}
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
          <div
            className={`grid grid-cols-7 justify-items-center gap-0.5 pb-2 ${navDir !== 0 ? "promemoria-calendar-grid-enter" : ""}`}
            style={gridSlideStyle}
          >
            {cells.map((cell) => {
              const selected = selectedYmd === cell.ymd;
              const isToday = mounted && todayYmd === cell.ymd;
              const count = countsByDate[cell.ymd] ?? 0;
              const hasCount = count > 0 && cell.inMonth;
              const label =
                count > 0
                  ? `${cell.date.toLocaleDateString("it-IT")}, ${count} promemoria${selected && !readOnly ? ". Clicca di nuovo per aggiungerne uno" : ""}`
                  : `${cell.date.toLocaleDateString("it-IT")}${selected && !readOnly ? ". Clicca di nuovo per nuovo promemoria" : ""}`;
              return (
                <button
                  key={cell.ymd}
                  type="button"
                  disabled={!cell.inMonth}
                  className={[
                    promemoriaDayBtnClass,
                    selected ? globalInputCalendarDaySelected : "",
                    isToday && !selected ? globalInputCalendarDayToday : "",
                    !cell.inMonth ? "opacity-25" : "",
                    dsFocus,
                  ].join(" ")}
                  aria-label={label}
                  aria-pressed={selected}
                  onClick={() => handleDayClick(cell.ymd, cell.inMonth)}
                  onDoubleClick={() => handleDayActivate(cell.ymd, cell.inMonth)}
                >
                  {cell.date.getDate()}
                  {hasCount ? (
                    <span className={[
        "pointer-events-none absolute bottom-0.5 left-1/2 h-1.5 min-w-1.5 -translate-x-1/2 rounded-full px-0.5",
        selected ? "bg-white/95" : "bg-[color:var(--cab-text-muted)]",
        count > 1 ? "min-w-[0.375rem]" : "",
    ].join(" ")} aria-hidden/>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
