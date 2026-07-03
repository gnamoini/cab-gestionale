import type { DayCapacitySnapshot } from "@/lib/workshop-schedule/day-capacity";
import type { WorkshopScheduleSession } from "@/lib/workshop-schedule/types";

export type SuggestedSlot = {
  startAt: string;
  endAt: string;
  slotScore: number;
  reasons: string[];
};

export type ScheduleSuggestionInput = {
  durationMinutes: number;
  dayYmd: string;
  priority?: "alta" | "media" | "bassa" | null;
  promisedDateYmd?: string | null;
  existingSessions: readonly Pick<WorkshopScheduleSession, "startAt" | "endAt" | "eventType" | "planningStatus" | "workOrderId">[];
  dayCapacity: DayCapacitySnapshot;
  bounds?: { startHour: number; endHour: number };
};

export type ScheduleSuggestionEngine = {
  suggest(input: ScheduleSuggestionInput): SuggestedSlot[];
};
