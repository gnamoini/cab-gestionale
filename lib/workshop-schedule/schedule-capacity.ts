import type { WorkshopScheduleSession } from "@/lib/workshop-schedule/types";
import { ymdFromIso } from "@/lib/workshop-schedule/datetime";
import { computeDayCapacity, type DayBounds, type DayCapacitySnapshot } from "@/lib/workshop-schedule/day-capacity";

export type ComputeScheduleCapacityInput = {
  sessions: readonly Pick<WorkshopScheduleSession, "startAt" | "endAt" | "eventType" | "planningStatus">[];
  dayYmd: string;
  bounds?: DayBounds;
};

/** SSOT capacità giornaliera da sessioni già caricate (stesso dataset della timeline filtrata). */
export function computeScheduleCapacity(input: ComputeScheduleCapacityInput): DayCapacitySnapshot {
  const daySessions = input.sessions.filter(
    (s) => ymdFromIso(s.startAt) === input.dayYmd || ymdFromIso(s.endAt) === input.dayYmd,
  );
  return computeDayCapacity(input.dayYmd, daySessions, input.bounds);
}
