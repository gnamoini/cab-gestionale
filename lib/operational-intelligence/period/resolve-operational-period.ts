import {
  monthKeyFromYmd,
  startOfLocalWeekMonday,
  ymdFromDate,
  type DateRange,
} from "@/lib/report/date-ranges";
import type { OperationalPeriod, OperationalPeriodType } from "@/lib/operational-intelligence/period/types";

function periodId(type: OperationalPeriodType, startDate: string): string {
  return `${type}:${startDate}`;
}

function weekLabel(start: Date): string {
  const oneJan = new Date(start.getFullYear(), 0, 1);
  const week = Math.ceil(((start.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7);
  return `Settimana ${week}`;
}

function monthLabel(start: Date): string {
  return start.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

function resolvePeriodType(preset: string): OperationalPeriodType {
  if (preset === "current_week" || preset === "last_week") return "weekly";
  if (
    preset === "current_month" ||
    preset === "last_month" ||
    preset === "questo_mese" ||
    preset === "mese_scorso"
  ) {
    return "monthly";
  }
  return "custom";
}

function previousRange(type: OperationalPeriodType, range: DateRange): DateRange | null {
  if (type === "weekly") {
    const prevStart = addDays(range.start, -7);
    const prevEnd = addDays(range.end, -7);
    return { start: prevStart, end: prevEnd };
  }
  if (type === "monthly") {
    const prevStart = new Date(range.start.getFullYear(), range.start.getMonth() - 1, 1);
    const prevEnd = new Date(range.start.getFullYear(), range.start.getMonth(), 0, 23, 59, 59, 999);
    return { start: prevStart, end: prevEnd };
  }
  return null;
}

export type ResolveOperationalPeriodInput = {
  preset: string;
  range: DateRange;
};

/** Risolve periodo operativo da preset report esistente. */
export function resolveOperationalPeriod(input: ResolveOperationalPeriodInput): OperationalPeriod {
  const type = resolvePeriodType(input.preset);
  const startDate = ymdFromDate(input.range.start);
  const endDate = ymdFromDate(input.range.end);
  const prev = previousRange(type, input.range);

  let label: string;
  if (type === "weekly") {
    label = weekLabel(startOfLocalWeekMonday(input.range.start));
  } else if (type === "monthly") {
    const mk = monthKeyFromYmd(startDate);
    label = mk ? monthLabel(input.range.start) : `Mese ${startDate}`;
  } else {
    label = `${startDate} — ${endDate}`;
  }

  return {
    id: periodId(type, startDate),
    type,
    startDate,
    endDate,
    previousPeriodId: prev ? periodId(type, ymdFromDate(prev.start)) : null,
    label,
    status: "open",
    generatedAt: null,
  };
}
