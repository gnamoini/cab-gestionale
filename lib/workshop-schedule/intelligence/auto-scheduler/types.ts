import type { WorkshopPlanningStatus, WorkshopScheduleEventType } from "@/lib/workshop-schedule/types";

export type AutoSchedulePlan = {
  work_order_id: string;
  suggestedSessions: {
    start_at: string;
    end_at: string;
    slot_score: number;
    confidence: number;
  }[];
};

export type AutoScheduleInput = {
  workOrderId: string;
  estimatedDurationMinutes: number;
  priority?: "alta" | "media" | "bassa" | null;
  promisedDateYmd?: string | null;
  searchDaysYmd: readonly string[];
  existingSessions: readonly {
    startAt: string;
    endAt: string;
    eventType: WorkshopScheduleEventType;
    planningStatus: WorkshopPlanningStatus;
    workOrderId: string | null;
  }[];
  dayCapacityByYmd: ReadonlyMap<string, import("@/lib/workshop-schedule/day-capacity").DayCapacitySnapshot>;
  bounds?: { startHour: number; endHour: number };
  maxSessionMinutes?: number;
};
