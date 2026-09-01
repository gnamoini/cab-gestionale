import {
  compareRangeFor,
  endOfLocalDay,
  resolvePresetRange,
  startOfLocalDay,
  startOfLocalWeekMonday,
  ymdFromDate,
  type DateRange,
} from "@/lib/report/date-ranges";

function addLocalDays(d: Date, days: number): Date {
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate() + days,
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
    d.getMilliseconds(),
  );
}

/** Giornata operativa corrente: oggi 00:00 → oggi 23:59. */
export function getControlTowerCurrentDayRange(date = new Date()): DateRange {
  return {
    start: startOfLocalDay(date),
    end: endOfLocalDay(date),
  };
}

/** Giornata operativa precedente: ieri 00:00 → ieri 23:59. */
export function getControlTowerPreviousDayRange(date = new Date()): DateRange {
  const day = addLocalDays(date, -1);
  return {
    start: startOfLocalDay(day),
    end: endOfLocalDay(day),
  };
}

/** Settimana operativa chiusa immediatamente precedente (lun–dom). */
export function getControlTowerPreviousWeekRange(date = new Date()): DateRange {
  return resolvePresetRange(date, "last_week");
}

/** Mese di calendario chiuso immediatamente precedente (1°–ultimo giorno). */
export function getControlTowerPreviousMonthRange(date = new Date()): DateRange {
  return resolvePresetRange(date, "last_month");
}

/** Settimana chiusa immediatamente prima di `weekRange`. */
export function getControlTowerWeekBeforeRange(weekRange: DateRange): DateRange {
  const weekStart = startOfLocalWeekMonday(weekRange.start);
  const prevWeekStart = addLocalDays(weekStart, -7);
  return {
    start: startOfLocalDay(prevWeekStart),
    end: endOfLocalDay(addLocalDays(prevWeekStart, 6)),
  };
}

/** Mese chiuso immediatamente prima di `monthRange`. */
export function getControlTowerMonthBeforeRange(monthRange: DateRange): DateRange {
  const anchorMonth = monthRange.start.getMonth();
  const anchorYear = monthRange.start.getFullYear();
  return {
    start: startOfLocalDay(new Date(anchorYear, anchorMonth - 1, 1)),
    end: endOfLocalDay(new Date(anchorYear, anchorMonth, 0)),
  };
}

/** Finestra brief del periodo precedente (giorno/settimana/mese chiusi). */
export function getControlTowerBriefPreviousRange(
  mode: "day" | "week" | "month",
  date = new Date(),
): DateRange {
  switch (mode) {
    case "day":
      return getControlTowerPreviousDayRange(date);
    case "week":
      return getControlTowerPreviousWeekRange(date);
    case "month":
      return getControlTowerPreviousMonthRange(date);
  }
}

/** Confronto quando si visualizza già il periodo precedente (periodo chiuso ancora più indietro). */
export function getControlTowerBriefPreviousCompareRange(
  mode: "week" | "month",
  date = new Date(),
): DateRange {
  const previous = getControlTowerBriefPreviousRange(mode, date);
  return mode === "week"
    ? getControlTowerWeekBeforeRange(previous)
    : getControlTowerMonthBeforeRange(previous);
}

/** Settimana operativa corrente: lunedì 00:00 → oggi 23:59. */
export function getControlTowerCurrentWeekRange(date = new Date()): DateRange {
  const start = startOfLocalWeekMonday(date);
  const end = endOfLocalDay(date);
  return { start, end };
}

/** Mese corrente: 1° del mese 00:00 → oggi 23:59. */
export function getControlTowerCurrentMonthRange(date = new Date()): DateRange {
  const start = startOfLocalDay(new Date(date.getFullYear(), date.getMonth(), 1));
  const end = endOfLocalDay(date);
  return { start, end };
}

/** Ultimi 30 giorni inclusivi (stesso preset report `last_30_days`). */
export function getControlTowerLast30DaysRange(date = new Date()): DateRange {
  return resolvePresetRange(date, "last_30_days");
}

/** 30 giorni immediatamente precedenti la finestra corrente. */
export function getControlTowerPrevious30DaysRange(date = new Date()): DateRange {
  const cur = getControlTowerLast30DaysRange(date);
  const prev = compareRangeFor(cur, "prev_period");
  if (!prev) {
    throw new Error("getControlTowerPrevious30DaysRange: prev_period unavailable");
  }
  return prev;
}

/** Fetch dati per health score: finestra corrente + periodo precedente (≈60 giorni). */
export function getControlTowerHealthScoreDataFetchRange(date = new Date()): DateRange {
  const cur = getControlTowerLast30DaysRange(date);
  const prev = getControlTowerPrevious30DaysRange(date);
  return { start: prev.start, end: cur.end };
}

export type ControlTowerWeeklyAnchor = {
  anchor: Date;
  weekStart: Date;
  weekEnd: Date;
  weekLabel: string;
};

/** Fine settimana locale (domenica 23:59) della settimana che contiene `date`. */
export function getControlTowerWeekEndAnchor(date: Date): Date {
  const weekStart = startOfLocalWeekMonday(date);
  return endOfLocalDay(addLocalDays(weekStart, 6));
}

/** Ultimi `weeks` anchor settimanali (fine settimana), dal più vecchio al più recente. */
export function getControlTowerWeeklyHealthScoreAnchors(
  date = new Date(),
  weeks = 26,
): ControlTowerWeeklyAnchor[] {
  const safeWeeks = Math.max(1, Math.min(weeks, 52));
  const currentWeekEnd = getControlTowerWeekEndAnchor(date);
  const todayEnd = endOfLocalDay(date);
  const points: ControlTowerWeeklyAnchor[] = [];

  for (let i = safeWeeks - 1; i >= 0; i -= 1) {
    const weekEnd = endOfLocalDay(addLocalDays(currentWeekEnd, -7 * i));
    const scoreAnchor = weekEnd.getTime() > todayEnd.getTime() ? todayEnd : weekEnd;
    const weekStart = startOfLocalWeekMonday(weekEnd);
    points.push({
      anchor: scoreAnchor,
      weekStart,
      weekEnd,
      weekLabel: ymdFromDate(weekStart),
    });
  }

  return points;
}

/** Fetch dati per storico health score: buffer 30gg prima del primo anchor settimanale. */
export function getControlTowerHealthScoreHistoryFetchRange(
  date = new Date(),
  weeks = 26,
): DateRange {
  const anchors = getControlTowerWeeklyHealthScoreAnchors(date, weeks);
  const oldest = anchors[0]?.anchor ?? date;
  const oldestPrev = getControlTowerPrevious30DaysRange(oldest);
  const newestEnd = anchors[anchors.length - 1]?.weekEnd ?? date;
  return { start: oldestPrev.start, end: newestEnd };
}

/** Finestra dati da precaricare per brief (periodi chiusi + confronti a cascata). */
export function getControlTowerBriefDataFetchRange(date = new Date()): DateRange {
  const curMonth = getControlTowerCurrentMonthRange(date);
  const prevMonth = getControlTowerPreviousMonthRange(date);
  const prevWeek = getControlTowerPreviousWeekRange(date);
  const prevMonthCompare = getControlTowerMonthBeforeRange(prevMonth);
  const prevWeekCompare = getControlTowerWeekBeforeRange(prevWeek);
  const candidates = [prevMonth.start, prevWeek.start, prevMonthCompare.start, prevWeekCompare.start];
  const start = candidates.reduce((earliest, candidate) =>
    candidate.getTime() < earliest.getTime() ? candidate : earliest,
  );
  return { start, end: curMonth.end };
}

export const CONTROL_TOWER_TIME = {
  getCurrentDay: getControlTowerCurrentDayRange,
  getPreviousDay: getControlTowerPreviousDayRange,
  getCurrentWeek: getControlTowerCurrentWeekRange,
  getPreviousWeek: getControlTowerPreviousWeekRange,
  getCurrentMonth: getControlTowerCurrentMonthRange,
  getPreviousMonth: getControlTowerPreviousMonthRange,
  getWeekBefore: getControlTowerWeekBeforeRange,
  getMonthBefore: getControlTowerMonthBeforeRange,
  getBriefPreviousRange: getControlTowerBriefPreviousRange,
  getBriefPreviousCompareRange: getControlTowerBriefPreviousCompareRange,
  getLast30Days: getControlTowerLast30DaysRange,
  getPrevious30Days: getControlTowerPrevious30DaysRange,
  getHealthScoreDataFetch: getControlTowerHealthScoreDataFetchRange,
  getBriefDataFetch: getControlTowerBriefDataFetchRange,
} as const;
