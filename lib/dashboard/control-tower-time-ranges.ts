import {
  compareRangeFor,
  endOfLocalDay,
  resolvePresetRange,
  startOfLocalDay,
  startOfLocalWeekMonday,
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

/** Settimana operativa corrente: lunedì 00:00 → oggi 23:59. */
export function getControlTowerCurrentWeekRange(date = new Date()): DateRange {
  const start = startOfLocalWeekMonday(date);
  const end = endOfLocalDay(date);
  return { start, end };
}

/** Stessa finestra sulla settimana precedente (shift -7 giorni su start e end). */
export function getControlTowerPreviousWeekSameWindowRange(date = new Date()): DateRange {
  const cur = getControlTowerCurrentWeekRange(date);
  return {
    start: startOfLocalDay(addLocalDays(cur.start, -7)),
    end: endOfLocalDay(addLocalDays(cur.end, -7)),
  };
}

/** Mese corrente: 1° del mese 00:00 → oggi 23:59. */
export function getControlTowerCurrentMonthRange(date = new Date()): DateRange {
  const start = startOfLocalDay(new Date(date.getFullYear(), date.getMonth(), 1));
  const end = endOfLocalDay(date);
  return { start, end };
}

/** Stessa finestra nel mese precedente (stesso numero di giorni dal 1°). */
export function getControlTowerPreviousMonthSameWindowRange(date = new Date()): DateRange {
  const dayOffset = Math.max(0, date.getDate() - 1);
  const prevMonthStart = startOfLocalDay(new Date(date.getFullYear(), date.getMonth() - 1, 1));
  return {
    start: prevMonthStart,
    end: endOfLocalDay(addLocalDays(prevMonthStart, dayOffset)),
  };
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

/** Finestra dati da precaricare per brief (giorno/settimana/mese + confronti). */
export function getControlTowerBriefDataFetchRange(date = new Date()): DateRange {
  const curMonth = getControlTowerCurrentMonthRange(date);
  const prevMonth = getControlTowerPreviousMonthSameWindowRange(date);
  const prevWeek = getControlTowerPreviousWeekSameWindowRange(date);
  const start = prevMonth.start.getTime() < prevWeek.start.getTime() ? prevMonth.start : prevWeek.start;
  return { start, end: curMonth.end };
}

export const CONTROL_TOWER_TIME = {
  getCurrentDay: getControlTowerCurrentDayRange,
  getCurrentWeek: getControlTowerCurrentWeekRange,
  getPreviousWeekSameWindow: getControlTowerPreviousWeekSameWindowRange,
  getCurrentMonth: getControlTowerCurrentMonthRange,
  getPreviousMonthSameWindow: getControlTowerPreviousMonthSameWindowRange,
  getLast30Days: getControlTowerLast30DaysRange,
  getPrevious30Days: getControlTowerPrevious30DaysRange,
  getHealthScoreDataFetch: getControlTowerHealthScoreDataFetchRange,
  getBriefDataFetch: getControlTowerBriefDataFetchRange,
} as const;
