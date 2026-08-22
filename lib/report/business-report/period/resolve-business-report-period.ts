import {
  endOfLocalDay,
  startOfLocalDay,
  startOfLocalWeekMonday,
  ymdFromDate,
  type DateRange,
} from "@/lib/report/date-ranges";
import type {
  ReportCompareMode,
  ReportPeriodPreset,
  ReportRequestedPeriod,
} from "@/lib/report/contracts/metadata-envelope";
import type { BusinessReportType } from "@/lib/report/business-report/types";

function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

function closedWeekRange(anchor: Date): DateRange {
  const thisWeekStart = startOfLocalWeekMonday(anchor);
  const prevWeekStart = addDays(thisWeekStart, -7);
  const prevWeekEnd = endOfLocalDay(addDays(thisWeekStart, -1));
  return { start: startOfLocalDay(prevWeekStart), end: prevWeekEnd };
}

function closedMonthRange(anchor: Date): DateRange {
  const firstThisMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const prevMonthStart = new Date(firstThisMonth.getFullYear(), firstThisMonth.getMonth() - 1, 1);
  const prevMonthEnd = endOfLocalDay(new Date(firstThisMonth.getFullYear(), firstThisMonth.getMonth(), 0));
  return { start: startOfLocalDay(prevMonthStart), end: prevMonthEnd };
}

/** Accepts BI Center presets (date-ranges) and contract presets (metadata-envelope). */
export function resolveBusinessReportType(preset: string): BusinessReportType {
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

export function resolveClosedPeriodRange(reportType: BusinessReportType, now = new Date()): DateRange {
  if (reportType === "weekly") return closedWeekRange(now);
  if (reportType === "monthly") return closedMonthRange(now);
  throw new Error("custom report type requires explicit range");
}

export function buildBusinessReportRequestedPeriod(
  reportType: BusinessReportType,
  range: DateRange,
  compareMode: ReportCompareMode = "prev_period",
): ReportRequestedPeriod {
  const preset: ReportPeriodPreset =
    reportType === "monthly" ? "mese_scorso" : "custom";

  return {
    preset,
    compareMode,
    start: ymdFromDate(range.start),
    end: ymdFromDate(range.end),
  };
}
