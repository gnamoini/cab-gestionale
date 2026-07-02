import {
  endOfLocalDay,
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

export const CONTROL_TOWER_TIME = {
  getCurrentWeek: getControlTowerCurrentWeekRange,
  getPreviousWeekSameWindow: getControlTowerPreviousWeekSameWindowRange,
} as const;
