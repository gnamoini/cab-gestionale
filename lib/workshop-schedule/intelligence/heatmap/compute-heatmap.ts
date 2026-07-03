import { DEFAULT_DAY_BOUNDS, type DayBounds } from "@/lib/workshop-schedule/day-capacity";
import { sessionDurationMinutes, ymdFromIso } from "@/lib/workshop-schedule/datetime";
import type { WorkshopScheduleSession } from "@/lib/workshop-schedule/types";
import type { HeatmapCell } from "@/lib/workshop-schedule/intelligence/heatmap/types";

type SessionSlice = Pick<WorkshopScheduleSession, "startAt" | "endAt" | "eventType" | "planningStatus">;

function minutesInHourSlot(isoStart: string, isoEnd: string, hourSlot: number, dayYmd: string): number {
  const startMs = Date.parse(isoStart);
  const endMs = Date.parse(isoEnd);
  const slotStart = Date.parse(`${dayYmd}T${String(hourSlot).padStart(2, "0")}:00:00`);
  const slotEnd = slotStart + 60 * 60_000;
  const overlapStart = Math.max(startMs, slotStart);
  const overlapEnd = Math.min(endMs, slotEnd);
  return overlapEnd > overlapStart ? Math.round((overlapEnd - overlapStart) / 60_000) : 0;
}

export function heatmapMemoKey(dates: readonly string[], bounds: DayBounds = DEFAULT_DAY_BOUNDS): string {
  return `${[...dates].sort().join(",")}|${bounds.startHour}-${bounds.endHour}`;
}

export function computeHeatmapCells(
  sessions: readonly SessionSlice[],
  dates: readonly string[],
  bounds: DayBounds = DEFAULT_DAY_BOUNDS,
): HeatmapCell[] {
  const cells: HeatmapCell[] = [];
  const slotCapacity = 60;

  for (const date of dates) {
    for (let hourSlot = bounds.startHour; hourSlot < bounds.endHour; hourSlot++) {
      let loadMinutes = 0;
      let blockedMinutes = 0;

      for (const s of sessions) {
        if (s.planningStatus === "cancelled") continue;
        if (ymdFromIso(s.startAt) !== date && ymdFromIso(s.endAt) !== date) continue;
        const mins = minutesInHourSlot(s.startAt, s.endAt, hourSlot, date);
        if (mins <= 0) continue;
        if (s.eventType === "blocco_agenda") blockedMinutes += mins;
        else loadMinutes += mins;
      }

      const availableMinutes = Math.max(0, slotCapacity - blockedMinutes);
      const saturation =
        availableMinutes > 0 ? Math.round((loadMinutes / availableMinutes) * 100) : loadMinutes > 0 ? 100 : 0;

      cells.push({
        date,
        hourSlot,
        saturation: Math.min(100, saturation),
        loadMinutes,
        availableMinutes,
      });
    }
  }

  return cells;
}

export function heatmapCellsForDate(cells: readonly HeatmapCell[], date: string): HeatmapCell[] {
  return cells.filter((c) => c.date === date);
}

/** ponytail: naive O(n) scan per date — upgrade path: index by date in Map */
export function aggregateSessionMinutesForDay(
  sessions: readonly SessionSlice[],
  dayYmd: string,
): { planned: number; blocked: number } {
  let planned = 0;
  let blocked = 0;
  for (const s of sessions) {
    if (s.planningStatus === "cancelled") continue;
    if (ymdFromIso(s.startAt) !== dayYmd && ymdFromIso(s.endAt) !== dayYmd) continue;
    const mins = sessionDurationMinutes(s.startAt, s.endAt);
    if (s.eventType === "blocco_agenda") blocked += mins;
    else planned += mins;
  }
  return { planned, blocked };
}
