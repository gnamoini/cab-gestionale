import type { WorkshopScheduleSession } from "@/lib/workshop-schedule/types";
import { sessionDurationMinutes, ymdFromIso } from "@/lib/workshop-schedule/datetime";

export type DayCapacitySnapshot = {
  dayYmd: string;
  dayBoundsMinutes: number;
  plannedMinutes: number;
  blockedMinutes: number;
  availableMinutes: number;
  saturationPct: number;
};

export type DayBounds = { startHour: number; endHour: number };

export const DEFAULT_DAY_BOUNDS: DayBounds = { startHour: 7, endHour: 19 };

export function computeDayCapacity(
  dayYmd: string,
  sessions: readonly Pick<WorkshopScheduleSession, "startAt" | "endAt" | "eventType" | "planningStatus">[],
  bounds: DayBounds = DEFAULT_DAY_BOUNDS,
): DayCapacitySnapshot {
  const dayBoundsMinutes = Math.max(0, (bounds.endHour - bounds.startHour) * 60);
  let plannedMinutes = 0;
  let blockedMinutes = 0;

  for (const s of sessions) {
    if (s.planningStatus === "cancelled") continue;
    if (ymdFromIso(s.startAt) !== dayYmd && ymdFromIso(s.endAt) !== dayYmd) continue;
    const mins = sessionDurationMinutes(s.startAt, s.endAt);
    if (s.eventType === "blocco_agenda") blockedMinutes += mins;
    else plannedMinutes += mins;
  }

  const workable = Math.max(0, dayBoundsMinutes - blockedMinutes);
  const availableMinutes = Math.max(0, workable - plannedMinutes);
  const saturationPct = workable > 0 ? Math.round((plannedMinutes / workable) * 100) : 0;

  return {
    dayYmd,
    dayBoundsMinutes,
    plannedMinutes,
    blockedMinutes,
    availableMinutes,
    saturationPct,
  };
}
