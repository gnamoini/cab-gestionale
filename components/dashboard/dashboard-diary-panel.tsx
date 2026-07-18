"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { initialViewFromYmd } from "@/components/gestionale/global-input/global-calendar-panel";
import { CalendarMonthYearPicker } from "@/components/gestionale/global-input/calendar-month-year-picker";
import {
  addMonths,
  buildMonthGrid,
  toYmd,
  WEEKDAYS_IT,
} from "@/components/gestionale/global-input/calendar-utils";
import {
  CalendarNavChevronLeft,
  CalendarNavChevronRight,
} from "@/components/gestionale/global-input/calendar-nav-icons";
import { GestionaleTextarea } from "@/components/gestionale/gestionale-textarea";
import {
  OPERATIONAL_DIARY_BODY_MAX,
  OPERATIONAL_DIARY_PLACEHOLDER,
  operationalDiaryWeekDays,
  operationalDiaryWeekOffsetForYmd,
  parseYmdLocal,
  ymdFromLocalDate,
} from "@/lib/operational-diary/operational-diary-week";
import { groupCellsByWeek } from "@/lib/report/calendar-report-service";
import {
  useOperationalDiaryQuery,
  useOperationalDiaryUpsertMutation,
} from "@/src/hooks/view/use-operational-diary";
import { useRbac } from "@/src/hooks/use-rbac";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { isPermissionDeniedError } from "@/src/utils/supabaseErrorHandler";
import {
  dsFocus,
  dsTypoTableHeader,
} from "@/lib/ui/design-system";
import {
  globalInputCalendarDaySelected,
  globalInputCalendarDayToday,
  globalInputCalendarGridShell,
  globalInputCalendarNavBtn,
} from "@/lib/ui/global-input";

const SAVE_DEBOUNCE_MS = 700;
const DIARY_LIST_SHELL = "flex h-full min-h-0 flex-col gap-1 pb-px";
const DIARY_TEXTAREA_CLASS =
  "min-h-0 min-w-0 max-h-full w-full flex-1 self-center !rounded-none !border-0 !bg-transparent !px-0 !py-0 !text-sm !leading-5 !shadow-none !outline-none !ring-0 !active:scale-100 hover:!border-transparent focus:!border-transparent focus:!ring-0 focus-visible:!ring-0 focus-visible:!ring-offset-0 placeholder:text-[color:var(--cab-text-muted)] touch-manipulation resize-none overflow-y-auto";
const DIARY_TEXTAREA_MIN_H = "1.25rem";
/** Stessa larghezza colonna di `DashboardRecentActivityWidget` (`gap-3`, 2 col md / 4 col xl). */
const DIARY_LAYOUT_GRID =
  "grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[calc((100%-0.75rem)/2)_minmax(0,1fr)] xl:grid-cols-[calc((100%-2.25rem)/4)_minmax(0,1fr)] lg:items-start";
const DIARY_LIST_ROW =
  "relative flex min-h-[3rem] min-w-0 flex-1 items-center gap-2.5 rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-border-strong)_85%,var(--cab-border))] bg-[var(--cab-card)] px-2.5 py-2 motion-safe:shadow-[var(--cab-shadow-sm)] transition-[border-color,box-shadow,transform] duration-200 focus-within:border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))] focus-within:ring-2 focus-within:ring-[color:color-mix(in_srgb,var(--cab-primary)_26%,transparent)] [-webkit-tap-highlight-color:transparent] lg:min-h-0";
const DIARY_LIST_ROW_INTERACTIVE =
  "cursor-text touch-pan-y active:scale-[0.995] active:shadow-none active:duration-100 motion-reduce:active:scale-100";
const DIARY_DAY_SQUARE =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-semibold tabular-nums transition-colors";
const DIARY_DAY_NAME =
  "w-[4.75rem] shrink-0 text-sm font-medium capitalize leading-none text-[color:var(--cab-text)]";
const DIARY_CALENDAR_DAY_BTN =
  "relative flex aspect-square h-auto w-full max-h-11 max-w-11 cursor-pointer items-center justify-center rounded-lg text-sm font-semibold tabular-nums transition-colors text-[color:var(--cab-text)] hover:bg-[var(--cab-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--cab-primary)_28%,transparent)] disabled:pointer-events-none disabled:cursor-default disabled:opacity-25";
const DIARY_CALENDAR_WEEK_ROW =
  "grid grid-cols-7 content-center justify-items-center gap-1 rounded-lg px-0.5 py-0.5";
const DIARY_CALENDAR_WEEK_ROW_ACTIVE =
  "bg-[color:color-mix(in_srgb,var(--cab-primary)_9%,var(--cab-card))] ring-1 ring-[color:color-mix(in_srgb,var(--cab-primary)_18%,var(--cab-border))]";

function diaryDaySquareClass(isToday: boolean, hasValue: boolean): string {
  if (isToday) {
    return `${DIARY_DAY_SQUARE} ${globalInputCalendarDaySelected}`;
  }
  if (hasValue) {
    return `${DIARY_DAY_SQUARE} text-[color:var(--cab-text)] ${globalInputCalendarDayToday}`;
  }
  return `${DIARY_DAY_SQUARE} bg-[color:var(--cab-surface-2)] text-[color:var(--cab-text-muted)]`;
}

function DiaryInlineWeekCalendar({
  weekFromYmd,
  weekToYmd,
  filledYmds,
  onSelectDay,
}: {
  weekFromYmd: string;
  weekToYmd: string;
  filledYmds: ReadonlySet<string>;
  onSelectDay: (ymd: string) => void;
}) {
  const initial = initialViewFromYmd(weekFromYmd);
  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.month);
  const [mounted, setMounted] = useState(false);
  const [todayYmd, setTodayYmd] = useState("");

  useEffect(() => {
    setMounted(true);
    setTodayYmd(toYmd(new Date()));
  }, []);

  useEffect(() => {
    const v = initialViewFromYmd(weekFromYmd);
    setViewYear(v.year);
    setViewMonth(v.month);
  }, [weekFromYmd]);

  const cells = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const weeks = useMemo(() => groupCellsByWeek(cells), [cells]);

  return (
    <div
      className={`${globalInputCalendarGridShell} min-w-0 w-full p-4 sm:p-5`}
      aria-label="Calendario settimana diario"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          className={`${globalInputCalendarNavBtn} !h-9 !w-9 ${dsFocus}`}
          aria-label="Mese precedente"
          onClick={() => {
            const next = addMonths(viewYear, viewMonth, -1);
            setViewYear(next.year);
            setViewMonth(next.month);
          }}
        >
          <CalendarNavChevronLeft />
        </button>
        <CalendarMonthYearPicker
          viewYear={viewYear}
          viewMonth={viewMonth}
          variant="embedded"
          onApply={(year, month) => {
            setViewYear(year);
            setViewMonth(month);
          }}
        />
        <button
          type="button"
          className={`${globalInputCalendarNavBtn} !h-9 !w-9 ${dsFocus}`}
          aria-label="Mese successivo"
          onClick={() => {
            const next = addMonths(viewYear, viewMonth, 1);
            setViewYear(next.year);
            setViewMonth(next.month);
          }}
        >
          <CalendarNavChevronRight />
        </button>
      </div>
      <div className="mb-2 grid grid-cols-7 gap-1">
        {WEEKDAYS_IT.map((wd) => (
          <span
            key={wd}
            className={`${dsTypoTableHeader} flex items-center justify-center py-1.5 text-center text-[11px]`}
          >
            {wd}
          </span>
        ))}
      </div>
      <div className="space-y-1">
        {weeks.map((weekCells, weekIndex) => {
          const weekActive = weekCells.some(
            (cell) => cell.ymd >= weekFromYmd && cell.ymd <= weekToYmd,
          );
          return (
            <div
              key={weekIndex}
              className={`${DIARY_CALENDAR_WEEK_ROW} ${weekActive ? DIARY_CALENDAR_WEEK_ROW_ACTIVE : ""}`}
            >
              {weekCells.map((cell) => {
                const inWeek = cell.ymd >= weekFromYmd && cell.ymd <= weekToYmd;
                const isToday = mounted && todayYmd === cell.ymd;
                const hasNote = filledYmds.has(cell.ymd);
                return (
                  <button
                    key={cell.ymd}
                    type="button"
                    disabled={!cell.inMonth}
                    className={`relative ${DIARY_CALENDAR_DAY_BTN} ${
                      !cell.inMonth ? "pointer-events-none opacity-25" : ""
                    } ${isToday ? globalInputCalendarDaySelected : inWeek ? "font-semibold text-[color:var(--cab-text)]" : ""}`}
                    aria-label={cell.date.toLocaleDateString("it-IT")}
                    aria-current={isToday ? "date" : undefined}
                    aria-pressed={inWeek}
                    onClick={() => onSelectDay(cell.ymd)}
                  >
                    {cell.date.getDate()}
                    {hasNote ? (
                      <span
                        className={`absolute bottom-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${
                          isToday ? "bg-white" : "bg-[color:var(--cab-primary)]"
                        }`}
                        aria-hidden
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function diaryWeekdayName(ymd: string, fallback: string): string {
  const date = parseYmdLocal(ymd);
  if (!date) return fallback;
  return new Intl.DateTimeFormat("it-IT", { weekday: "long" }).format(date);
}

function DiaryDayField({
  ymd,
  label,
  dayNumber,
  value,
  readOnly,
  saving,
  isToday,
  isWeekend,
  onChange,
  onBlur,
}: {
  ymd: string;
  label: string;
  dayNumber: number;
  value: string;
  readOnly?: boolean;
  saving?: boolean;
  isToday?: boolean;
  isWeekend?: boolean;
  onChange: (ymd: string, next: string) => void;
  onBlur: (ymd: string) => void;
}) {
  const id = `diary-${ymd}`;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasValue = value.trim().length > 0;
  const weekdayName = diaryWeekdayName(ymd, label);

  const focusField = useCallback(() => {
    if (readOnly) return;
    textareaRef.current?.focus();
  }, [readOnly]);

  return (
    <div
      className={`${DIARY_LIST_ROW} ${readOnly ? "" : DIARY_LIST_ROW_INTERACTIVE}`}
      onClick={(e) => {
        if (readOnly) return;
        if ((e.target as HTMLElement).closest("textarea")) return;
        focusField();
      }}
    >
      <label
        htmlFor={id}
        className={`flex shrink-0 cursor-[inherit] items-center gap-2 ${isWeekend ? "opacity-85" : ""}`}
      >
        <span className={diaryDaySquareClass(Boolean(isToday), hasValue)} aria-hidden>
          {dayNumber}
        </span>
        <span
          className={`${DIARY_DAY_NAME} ${isToday ? "text-[color:var(--cab-primary)]" : ""}`}
        >
          {weekdayName}
        </span>
      </label>
      <div className="flex min-w-0 flex-1 items-center self-stretch">
        <GestionaleTextarea
          ref={textareaRef}
          id={id}
          value={value}
          readOnly={readOnly}
          maxLength={OPERATIONAL_DIARY_BODY_MAX}
          rows={1}
          size="sm"
          autoGrow
          maxHeight="100%"
          placeholder={readOnly ? "—" : OPERATIONAL_DIARY_PLACEHOLDER}
          className={DIARY_TEXTAREA_CLASS}
          style={{ minHeight: DIARY_TEXTAREA_MIN_H, height: DIARY_TEXTAREA_MIN_H }}
          onChange={(next) => onChange(ymd, next)}
          onBlur={() => onBlur(ymd)}
        />
      </div>
      {saving ? (
        <span
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-[color:var(--cab-primary)]"
          aria-hidden
        >
          …
        </span>
      ) : null}
    </div>
  );
}

export function DashboardDiaryPanel() {
  const rbac = useRbac();
  const canReadDiary = rbac.canReadPage("dashboard");
  const readOnly = !rbac.canWritePage("dashboard");
  const toast = useGestionaleToast();
  const [weekOffset, setWeekOffset] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingYmd, setSavingYmd] = useState<string | null>(null);
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const lastSavedRef = useRef<Record<string, string>>({});
  const persistQueueRef = useRef<Record<string, Promise<void>>>({});
  const savingYmdRef = useRef<string | null>(null);

  const weekDays = useMemo(() => operationalDiaryWeekDays(new Date(), weekOffset), [weekOffset]);
  const fromYmd = weekDays[0]?.ymd;
  const toYmd = weekDays[6]?.ymd;

  const { data: weekEntries = [], isLoading } = useOperationalDiaryQuery(
    { fromYmd, toYmd },
    { enabled: !rbac.isLoading && canReadDiary && Boolean(fromYmd && toYmd) },
  );
  const upsert = useOperationalDiaryUpsertMutation(fromYmd, toYmd);

  const byDate = useMemo(() => new Map(weekEntries.map((e) => [e.work_date, e.body])), [weekEntries]);
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;

  const entriesFingerprint = useMemo(
    () => weekEntries.map((e) => `${e.work_date}\0${e.body}`).join("\n"),
    [weekEntries],
  );

  useEffect(() => {
    setDrafts({});
    lastSavedRef.current = {};
    for (const t of Object.values(debounceRef.current)) clearTimeout(t);
    debounceRef.current = {};
  }, [fromYmd, toYmd]);

  useEffect(() => {
    for (const day of weekDays) {
      const ymd = day.ymd;
      if (ymd in draftsRef.current) continue;
      if (savingYmdRef.current === ymd) continue;
      const server = weekEntries.find((e) => e.work_date === ymd)?.body ?? "";
      lastSavedRef.current[ymd] = server.trim();
    }
  }, [entriesFingerprint, weekDays, weekEntries]);

  const fieldValue = useCallback(
    (ymd: string) => (ymd in drafts ? drafts[ymd]! : (byDate.get(ymd) ?? "")),
    [drafts, byDate],
  );

  const filledYmds = useMemo(
    () => new Set(weekDays.filter((day) => fieldValue(day.ymd).trim().length > 0).map((day) => day.ymd)),
    [weekDays, fieldValue],
  );

  const runPersist = useCallback(
    async (ymd: string, body: string) => {
      if (rbac.isLoading || readOnly) return;
      const trimmed = body.trim();
      if (trimmed === (lastSavedRef.current[ymd] ?? "").trim()) return;
      savingYmdRef.current = ymd;
      setSavingYmd(ymd);
      try {
        await upsert.mutateAsync({ workDate: ymd, body: trimmed });
        lastSavedRef.current[ymd] = trimmed;
        if (!trimmed) {
          setDrafts((prev) => {
            if (!(ymd in prev)) return prev;
            const next = { ...prev };
            delete next[ymd];
            return next;
          });
        }
      } catch (e) {
        if (!isPermissionDeniedError(e)) {
          toast.error(e, { action: "update" });
        }
      } finally {
        if (savingYmdRef.current === ymd) savingYmdRef.current = null;
        setSavingYmd((current) => (current === ymd ? null : current));
      }
    },
    [readOnly, rbac.isLoading, upsert, toast],
  );

  const persist = useCallback(
    (ymd: string, body: string) => {
      const prev = persistQueueRef.current[ymd] ?? Promise.resolve();
      const next = prev.catch(() => undefined).then(() => runPersist(ymd, body));
      persistQueueRef.current[ymd] = next;
      void next;
    },
    [runPersist],
  );

  const scheduleSave = useCallback(
    (ymd: string, body: string) => {
      const prev = debounceRef.current[ymd];
      if (prev) clearTimeout(prev);
      debounceRef.current[ymd] = setTimeout(() => {
        void persist(ymd, body);
      }, SAVE_DEBOUNCE_MS);
    },
    [persist],
  );

  const handleChange = useCallback(
    (ymd: string, next: string) => {
      setDrafts((prev) => ({ ...prev, [ymd]: next }));
      if (!readOnly) scheduleSave(ymd, next);
    },
    [readOnly, scheduleSave],
  );

  const handleBlur = useCallback(
    (ymd: string) => {
      const prev = debounceRef.current[ymd];
      if (prev) {
        clearTimeout(prev);
        delete debounceRef.current[ymd];
      }
      const body = draftsRef.current[ymd] ?? byDate.get(ymd) ?? "";
      void persist(ymd, body);
    },
    [persist, byDate],
  );

  const handleJumpToWeek = useCallback((ymd: string) => {
    const offset = operationalDiaryWeekOffsetForYmd(new Date(), ymd);
    if (offset == null) return;
    setWeekOffset(offset);
  }, []);

  const layoutGridRef = useRef<HTMLDivElement>(null);
  const calendarColRef = useRef<HTMLDivElement>(null);

  // ponytail: ResizeObserver — altezza note = calendario; upgrade: CSS anchor positioning quando stabile
  useLayoutEffect(() => {
    const cal = calendarColRef.current;
    const grid = layoutGridRef.current;
    if (!cal || !grid) return;

    const sync = () => {
      const desktop = window.matchMedia("(min-width: 1024px)").matches;
      if (!desktop) {
        grid.style.removeProperty("--diary-cal-h");
        return;
      }
      grid.style.setProperty("--diary-cal-h", `${cal.offsetHeight}px`);
    };

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(cal);
    window.addEventListener("resize", sync);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, [fromYmd, toYmd, isLoading]);

  useEffect(() => {
    const timers = debounceRef.current;
    return () => {
      for (const t of Object.values(timers)) clearTimeout(t);
    };
  }, []);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div ref={layoutGridRef} className={DIARY_LAYOUT_GRID}>
        {fromYmd && toYmd ? (
          <div ref={calendarColRef} className="min-w-0 self-start">
            <DiaryInlineWeekCalendar
              weekFromYmd={fromYmd}
              weekToYmd={toYmd}
              filledYmds={filledYmds}
              onSelectDay={handleJumpToWeek}
            />
          </div>
        ) : null}

        <div className="min-w-0 lg:h-[var(--diary-cal-h,auto)] lg:min-h-0 lg:overflow-x-hidden lg:overflow-y-auto">
          {isLoading ? (
            <div className={DIARY_LIST_SHELL} aria-hidden>
              {Array.from({ length: 7 }, (_, index) => (
                <div key={index} className={DIARY_LIST_ROW}>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="h-8 w-8 animate-pulse rounded-md bg-[color:color-mix(in_srgb,var(--cab-surface-2)_70%,transparent)]" />
                    <div className="h-3.5 w-16 animate-pulse rounded bg-[color:color-mix(in_srgb,var(--cab-surface-2)_55%,transparent)]" />
                  </div>
                  <div className="h-full min-w-0 flex-1 animate-pulse rounded bg-[color:color-mix(in_srgb,var(--cab-surface-2)_55%,transparent)]" />
                </div>
              ))}
            </div>
          ) : (
            <div className={`min-w-0 ${DIARY_LIST_SHELL}`}>
              {weekDays.map((day, index) => (
                <DiaryDayField
                  key={day.ymd}
                  ymd={day.ymd}
                  label={day.weekdayLabel}
                  dayNumber={day.date.getDate()}
                  value={fieldValue(day.ymd)}
                  readOnly={readOnly}
                  saving={savingYmd === day.ymd}
                  isToday={day.ymd === ymdFromLocalDate(new Date())}
                  isWeekend={index >= 5}
                  onChange={handleChange}
                  onBlur={handleBlur}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
