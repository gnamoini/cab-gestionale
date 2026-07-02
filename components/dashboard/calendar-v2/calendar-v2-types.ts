export type CalendarViewMode = "month" | "week";

export type CalendarSelection =
  | { mode: "day"; ymd: string }
  | { mode: "week"; weekStartYmd: string; weekEndYmd: string };

export function isWeekSelection(
  selection: CalendarSelection,
): selection is { mode: "week"; weekStartYmd: string; weekEndYmd: string } {
  return selection.mode === "week";
}

export function isDaySelection(selection: CalendarSelection): selection is { mode: "day"; ymd: string } {
  return selection.mode === "day";
}
