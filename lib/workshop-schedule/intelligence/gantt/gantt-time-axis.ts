import { buildDayBoundsIso, ymdFromIso } from "@/lib/workshop-schedule/datetime";
import type { DayBounds } from "@/lib/workshop-schedule/day-capacity";
import { DEFAULT_DAY_BOUNDS } from "@/lib/workshop-schedule/day-capacity";

export type GanttTimeAxis = {
  rangeStartMs: number;
  rangeEndMs: number;
  totalMs: number;
  dayTicks: { ymd: string; offsetPct: number; label: string }[];
};

export function buildGanttTimeAxis(
  rangeStartYmd: string,
  rangeEndYmd: string,
  bounds: DayBounds = DEFAULT_DAY_BOUNDS,
): GanttTimeAxis {
  const { start } = buildDayBoundsIso(rangeStartYmd, bounds.startHour, bounds.endHour);
  const { end } = buildDayBoundsIso(rangeEndYmd, bounds.startHour, bounds.endHour);
  const rangeStartMs = Date.parse(start);
  const rangeEndMs = Date.parse(end);
  const totalMs = Math.max(1, rangeEndMs - rangeStartMs);

  const dayTicks: GanttTimeAxis["dayTicks"] = [];
  let cursor = rangeStartYmd;
  while (cursor <= rangeEndYmd) {
    const { start: dayStart } = buildDayBoundsIso(cursor, bounds.startHour, bounds.endHour);
    const ms = Date.parse(dayStart);
    const offsetPct = ((ms - rangeStartMs) / totalMs) * 100;
    const label = new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "2-digit", month: "short" }).format(
      new Date(`${cursor}T12:00:00`),
    );
    dayTicks.push({ ymd: cursor, offsetPct: Math.max(0, Math.min(100, offsetPct)), label });
    const next = new Date(`${cursor}T12:00:00`);
    next.setDate(next.getDate() + 1);
    cursor = ymdFromIso(next.toISOString());
  }

  return { rangeStartMs, rangeEndMs, totalMs, dayTicks };
}

export function msToOffsetPct(ms: number, axis: GanttTimeAxis): number {
  return Math.max(0, Math.min(100, ((ms - axis.rangeStartMs) / axis.totalMs) * 100));
}

export function sessionToBarOffsets(
  startAt: string,
  endAt: string,
  axis: GanttTimeAxis,
): { leftPct: number; widthPct: number } {
  const startMs = Math.max(axis.rangeStartMs, Date.parse(startAt));
  const endMs = Math.min(axis.rangeEndMs, Date.parse(endAt));
  const leftPct = msToOffsetPct(startMs, axis);
  const rightPct = msToOffsetPct(endMs, axis);
  return { leftPct, widthPct: Math.max(0.5, rightPct - leftPct) };
}
